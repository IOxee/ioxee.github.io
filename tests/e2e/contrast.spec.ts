import { type Page, expect, test } from '@playwright/test';
import sharp from 'sharp';
import { SCHEMES, settle } from './support';

// La medida inyecta una hoja de estilo para esconder el texto, y la CSP del sitio lo impediría.
test.use({ bypassCSP: true, viewport: { width: 1440, height: 900 } });
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Mide lo que se pinta: un navegador basta.',
);

/** Un renglón de texto con su caja en la página y su color ya como RGB. */
interface TextLine {
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color: [number, number, number];
	size: number;
	bold: boolean;
}

/** Cada renglón de texto visible, con el rectángulo del texto y no el de su caja (que tiene bordes). */
function collectTextLines(page: Page): Promise<TextLine[]> {
	return page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) throw new Error('Sin canvas 2D');

		// Chrome devuelve `oklch(...)` tal cual: se pasa a RGB pintando un píxel.
		const toRgb = (color: string): [number, number, number] => {
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;

			return [r, g, b];
		};

		const lines: TextLine[] = [];
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
		);
		while (walker.nextNode()) {
			const node = walker.currentNode;
			const parent = node.parentElement;
			if (!node.textContent?.trim() || !parent) continue;
			// El sello y el enlace de salto son adorno o solo salen al enfocar; el resto es contenido.
			if (
				parent.closest(
					'svg, script, style, .visually-hidden, .stamp, .skip-link',
				)
			) {
				continue;
			}

			const style = getComputedStyle(parent);
			const range = document.createRange();
			range.selectNodeContents(node);
			for (const rect of range.getClientRects()) {
				if (rect.width < 4 || rect.height < 4) continue;

				lines.push({
					label: `${parent.tagName.toLowerCase()} «${node.textContent.trim().slice(0, 24)}»`,
					x: Math.round(rect.left + scrollX),
					y: Math.round(rect.top + scrollY),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					color: toRgb(style.color),
					size: parseFloat(style.fontSize),
					bold: Number.parseInt(style.fontWeight, 10) >= 700,
				});
			}
		}

		return lines;
	});
}

const channel = (value: number): number => {
	const unit = value / 255;

	return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number): number =>
	0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: number, b: number): number =>
	(Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Los renglones que no llegan al contraste que exige WCAG sobre el fondo ya pintado. */
async function lowContrast(page: Page): Promise<string[]> {
	const lines = await collectTextLines(page);

	// Sin texto, queda solo el fondo: papel, grano, degradados y sombras.
	await page.addStyleTag({
		content:
			'*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; } .stamp { visibility: hidden !important; }',
	});
	// Se mide contra lo que hay y se comprueba que hay algo y que la captura llega al final de la
	// página: si no, los textos de más abajo no se medirían.
	expect(lines.length).toBeGreaterThan(50);
	const documentHeight = await page.evaluate(
		() => document.documentElement.scrollHeight,
	);
	const screenshot = await page.screenshot({ fullPage: true });
	const { data, info } = await sharp(screenshot)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	expect(info.height).toBeGreaterThanOrEqual(documentHeight);

	const failures: string[] = [];
	for (const line of lines) {
		const lights: number[] = [];
		// Todo el renglón: el fondo cambia de un extremo a otro (degradado, sombras, grano).
		const right = Math.min(info.width, line.x + line.width);
		const bottom = Math.min(info.height, line.y + line.height);
		for (let y = Math.max(0, line.y); y < bottom; y += 2) {
			for (let x = Math.max(0, line.x); x < right; x += 2) {
				const offset = (y * info.width + x) * info.channels;
				lights.push(
					luminance(
						data[offset] ?? 0,
						data[offset + 1] ?? 0,
						data[offset + 2] ?? 0,
					),
				);
			}
		}
		// Un renglón sin un solo píxel que medir (fuera de la captura) no puede darse por bueno.
		if (lights.length === 0) {
			failures.push(`${line.label}: sin píxeles que medir`);
			continue;
		}

		lights.sort((a, b) => a - b);
		const text = luminance(...line.color);
		// El peor caso es el fondo más parecido al texto: texto oscuro sobre lo más oscuro del fondo.
		const worst =
			lights[Math.floor(lights.length * (text < 0.2 ? 0.05 : 0.95))] ?? 0;
		const large = line.size >= 24 || (line.size >= 18.66 && line.bold);
		const required = large ? 3 : 4.5;
		const actual = ratio(text, worst);

		if (actual < required) {
			failures.push(
				`${line.label}: ${actual.toFixed(2)}:1, pide ${required}:1`,
			);
		}
	}

	return failures;
}

test.describe('contraste del texto sobre el fondo renderizado', () => {
	for (const scheme of SCHEMES) {
		test(`todo el texto llega al contraste de WCAG AA, también sobre el grano y el degradado: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto('/');
			await settle(page);

			expect(await lowContrast(page)).toEqual([]);
		});
	}
});
