import { type Page, expect, test } from '@playwright/test';
import sharp from 'sharp';
import { SCHEMES, folderGeometry, settle, showPosition } from './support';

// The measurement injects a stylesheet to hide the text, and the site's CSP would prevent it.
test.use({ bypassCSP: true, viewport: { width: 1440, height: 900 } });
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Mide lo que se pinta: un navegador basta.',
);

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

type Origin = 'page' | 'viewport';

/**
 * Every line of visible text, with the rectangle of the text and not that of its box (which has
 * borders). What is not visible does not count: hidden, `inert` (the folder pages that are not
 * being read) or the faces of sheets that are turned away.
 */
function collectTextLines(page: Page, origin: Origin): Promise<TextLine[]> {
	return page.evaluate((mode) => {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) throw new Error('Sin canvas 2D');

		// Chrome returns `oklch(...)` as is: it is converted to RGB by painting one pixel.
		const toRgb = (color: string): [number, number, number] => {
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;

			return [r, g, b];
		};
		const offsetX = mode === 'page' ? scrollX : 0;
		const offsetY = mode === 'page' ? scrollY : 0;

		const lines: TextLine[] = [];
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
		);
		while (walker.nextNode()) {
			const node = walker.currentNode;
			const parent = node.parentElement;
			if (!node.textContent?.trim() || !parent) continue;
			// The stamp and the skip link are decoration or only appear on focus; the rest is content.
			if (
				parent.closest(
					'svg, script, style, .visually-hidden, .stamp, .skip-link, [inert]',
				)
			) {
				continue;
			}
			if (!parent.checkVisibility({ visibilityProperty: true })) continue;

			const style = getComputedStyle(parent);
			const range = document.createRange();
			range.selectNodeContents(node);
			for (const rect of range.getClientRects()) {
				if (rect.width < 4 || rect.height < 4) continue;
				if (
					mode === 'viewport' &&
					(rect.bottom < 0 ||
						rect.top > innerHeight ||
						rect.right < 0 ||
						rect.left > innerWidth)
				) {
					continue;
				}

				lines.push({
					label: `${parent.tagName.toLowerCase()} «${node.textContent.trim().slice(0, 24)}»`,
					x: Math.round(rect.left + offsetX),
					y: Math.round(rect.top + offsetY),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					color: toRgb(style.color),
					size: parseFloat(style.fontSize),
					bold: Number.parseInt(style.fontWeight, 10) >= 700,
				});
			}
		}

		return lines;
	}, origin);
}

const channel = (value: number): number => {
	const unit = value / 255;

	return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number): number =>
	0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: number, b: number): number =>
	(Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const HIDE_TEXT = `
html[data-contrast-probe] *, html[data-contrast-probe] *::before, html[data-contrast-probe] *::after {
	color: transparent !important;
	-webkit-text-fill-color: transparent !important;
	text-decoration-color: transparent !important;
}
html[data-contrast-probe] .stamp { visibility: hidden !important; }`;

/**
 * The stylesheet is inserted with `evaluate` and not `addStyleTag`, which without JavaScript ends up
 * waiting for an event the page never receives.
 */
function injectStyle(page: Page, css: string): Promise<void> {
	return page.evaluate((content) => {
		const style = document.createElement('style');
		style.textContent = content;
		document.head.append(style);
	}, css);
}

async function lowContrast(
	page: Page,
	lines: readonly TextLine[],
	fullPage: boolean,
): Promise<string[]> {
	await page.evaluate(() =>
		document.documentElement.setAttribute('data-contrast-probe', ''),
	);
	const screenshot = await page.screenshot({ fullPage });
	await page.evaluate(() =>
		document.documentElement.removeAttribute('data-contrast-probe'),
	);

	const { data, info } = await sharp(screenshot)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const failures: string[] = [];
	for (const line of lines) {
		const lights: number[] = [];
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
		// A line without a single pixel to measure (outside the capture) cannot be taken as passing.
		if (lights.length === 0) {
			failures.push(`${line.label}: sin píxeles que medir`);
			continue;
		}

		lights.sort((a, b) => a - b);
		const text = luminance(...line.color);
		// The worst case is the background most similar to the text: dark text on the darkest part of the background.
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
		test(`todo el texto de la carpeta llega al contraste de WCAG AA, en cada hoja y también sobre el grano y el degradado: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto('/');
			await settle(page);
			await injectStyle(page, HIDE_TEXT);

			const { parallax, positions } = await folderGeometry(page);
			// Without this the unturned folder would be measured and no inner sheet would be seen.
			expect(parallax).toBe(true);
			expect(positions).toBeGreaterThanOrEqual(5);

			const failures: string[] = [];
			let measured = 0;
			for (let position = 0; position < positions; position += 1) {
				await showPosition(page, position);
				await settle(page);

				const lines = await collectTextLines(page, 'viewport');
				measured += lines.length;
				for (const failure of await lowContrast(page, lines, false)) {
					failures.push(`posición ${position}: ${failure}`);
				}
			}

			await page.evaluate(() =>
				window.scrollTo({
					top: document.documentElement.scrollHeight,
					behavior: 'instant',
				}),
			);
			await settle(page);
			const footer = await collectTextLines(page, 'viewport');
			measured += footer.length;
			for (const failure of await lowContrast(page, footer, false)) {
				failures.push(`pie: ${failure}`);
			}

			// That there is text to measure: without this, hiding everything would leave the test green.
			expect(measured).toBeGreaterThan(80);
			expect(failures).toEqual([]);
		});
	}
});

test.describe('contraste en la lista que sale sin JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	for (const scheme of SCHEMES) {
		test(`todas las páginas seguidas llegan al contraste de WCAG AA: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			await injectStyle(page, HIDE_TEXT);

			const lines = await collectTextLines(page, 'page');
			// It is measured against what is there, and it is checked that there is something and that the capture reaches the end of
			// the page: otherwise the texts further down would not be measured.
			expect(lines.length).toBeGreaterThan(80);
			const documentHeight = await page.evaluate(
				() => document.documentElement.scrollHeight,
			);
			const failures = await lowContrast(page, lines, true);
			const { height } = await sharp(
				await page.screenshot({ fullPage: true }),
			).metadata();

			expect(height).toBeGreaterThanOrEqual(documentHeight);
			expect(failures).toEqual([]);
		});
	}
});
