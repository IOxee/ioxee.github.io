import { expect, test } from '@playwright/test';
import { VIEWPORT_HEIGHT, WIDTHS, settle, trackLayoutShift } from './support';

test.describe('maquetación', () => {
	for (const width of WIDTHS) {
		test(`no se desborda en horizontal a ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
			await page.goto('/');
			await settle(page);

			const { scroll, inner } = await page.evaluate(() => ({
				scroll: document.documentElement.scrollWidth,
				inner: window.innerWidth,
			}));

			expect(scroll).toBeLessThanOrEqual(inner);
		});
	}

	for (const width of [320, 375, 768, 1440]) {
		test(`no mueve nada al cargar a ${width}px (CLS)`, async ({
			page,
			browserName,
		}) => {
			// Sin esto pasaría en Firefox sin medir nada: ahí `PerformanceObserver` ignora
			// `layout-shift` y el contador se quedaría en 0.
			test.skip(
				browserName !== 'chromium',
				'Firefox no implementa layout-shift.',
			);

			await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
			await trackLayoutShift(page);
			await page.goto('/');
			await settle(page);

			// Margen mínimo; hoy sale 0. Las fuentes se precargan justo para que sea así.
			expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
		});
	}

	test('carga las fuentes del diseño y todas las imágenes', async ({
		page,
	}) => {
		await page.goto('/');
		await settle(page);

		const loaded = await page.evaluate(() =>
			[...document.fonts]
				.filter((font) => font.status === 'loaded')
				.map((font) => `${font.family} ${font.weight}`),
		);
		expect(loaded).toEqual(
			expect.arrayContaining([
				expect.stringContaining('Stardos Stencil'),
				expect.stringContaining('Courier Prime'),
			]),
		);

		// Que haya imágenes que comprobar: sin esto, quitarlas todas dejaría la prueba en verde.
		expect(await page.locator('img').count()).toBeGreaterThan(0);

		// Las capturas de los proyectos son perezosas: no se piden hasta que se acercan, así que se
		// recorre la página antes de mirar si cargaron.
		await page.evaluate(async () => {
			for (const image of document.images) {
				image.scrollIntoView({ behavior: 'instant', block: 'center' });
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		});
		await page.waitForFunction(() =>
			[...document.images].every((image) => image.complete),
		);

		const broken = await page.evaluate(() =>
			[...document.images]
				.filter((image) => image.naturalWidth === 0)
				.map((image) => image.currentSrc || image.alt),
		);
		expect(broken).toEqual([]);
	});

	test('el texto largo no se sale de su hoja a 320px', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const overflowing = await page.evaluate(() =>
			[...document.querySelectorAll('.page--sheet, .page--cover')]
				.filter((paper) => paper.scrollWidth > paper.clientWidth + 1)
				.map((paper) => paper.textContent?.trim().slice(0, 30)),
		);

		expect(overflowing).toEqual([]);
	});
});
