import { expect, test } from '@playwright/test';
import { VIEWPORT_HEIGHT, WIDTHS, settle, trackLayoutShift } from './support';

test.describe('layout', () => {
	for (const width of WIDTHS) {
		test(`does not overflow horizontally at ${width}px`, async ({
			page,
		}) => {
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
		test(`moves nothing on load at ${width}px (CLS)`, async ({
			page,
			browserName,
		}) => {
			// Without this it would pass in Firefox without measuring anything: there `PerformanceObserver` ignores
			// `layout-shift` and the counter would stay at 0.
			test.skip(
				browserName !== 'chromium',
				'Firefox does not implement layout-shift.',
			);

			await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
			await trackLayoutShift(page);
			await page.goto('/');
			await settle(page);

			// Minimum margin; today it comes out 0. The fonts are preloaded precisely so that it is that way.
			expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
		});
	}

	test('loads the design fonts and all the images', async ({ page }) => {
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

		// That there are images to check: without this, removing them all would leave the test green.
		expect(await page.locator('img').count()).toBeGreaterThan(0);

		// The project screenshots are lazy: they are not requested until they get close, so the page
		// is scrolled through before looking at whether they loaded.
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

	test('long text does not spill out of its sheet at 320px', async ({
		page,
	}) => {
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
