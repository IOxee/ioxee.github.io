import { type Page, expect, test } from '@playwright/test';
import { settle, trackThemeAtBody } from './support';

const STORAGE_KEY = 'ioxee:theme';

const themeOf = (page: Page) =>
	page.evaluate(() => document.documentElement.dataset.theme);

test.describe('day and night theme', () => {
	test('starts with the system theme, without flicker', async ({
		browser,
	}) => {
		for (const [scheme, expected] of [
			['light', 'day'],
			['dark', 'night'],
		] as const) {
			const context = await browser.newContext({ colorScheme: scheme });
			const page = await context.newPage();
			await trackThemeAtBody(page);
			await page.goto('/');

			// Already when the <body> is created, before painting: the theme script is the first to run.
			expect(await page.evaluate(() => window.__themeAtBody)).toBe(
				expected,
			);
			expect(await themeOf(page)).toBe(expected);
			await context.close();
		}
	});

	test('the button switches the theme and remembers the choice on reload', async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');

		await page.locator('[data-theme-toggle]').click();
		expect(await themeOf(page)).toBe('night');
		expect(
			await page.evaluate(
				(key) => localStorage.getItem(key),
				STORAGE_KEY,
			),
		).toBe('night');

		await page.reload();
		expect(await themeOf(page)).toBe('night');
	});

	test('the saved choice beats the system theme', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.addInitScript((key) => {
			localStorage.setItem(key, 'day');
		}, STORAGE_KEY);
		await page.goto('/');

		expect(await themeOf(page)).toBe('day');
	});

	test('ignores a saved value that is not a theme', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.addInitScript((key) => {
			localStorage.setItem(key, 'sepia');
		}, STORAGE_KEY);
		await page.goto('/');

		expect(await themeOf(page)).toBe('night');
	});

	test('switching theme really changes the colors', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');

		const desk = () =>
			page.evaluate(() =>
				getComputedStyle(document.documentElement)
					.getPropertyValue('--desk')
					.trim(),
			);
		const day = await desk();

		await page.locator('[data-theme-toggle]').click();

		expect(await desk()).not.toBe(day);
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the page reads in the day theme and has no button that would do nothing', async ({
		page,
	}) => {
		await page.goto('/');

		expect(await themeOf(page)).toBe('day');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('[data-theme-toggle]')).toBeHidden();
	});
});

test.describe('system accessibility preferences', () => {
	test('with reduced motion the stamp is already stamped and the scroll is not animated', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		const { animation, behavior } = await page.evaluate(() => ({
			animation: getComputedStyle(
				document.querySelector('.stamp') as Element,
			).animationName,
			behavior: getComputedStyle(document.documentElement).scrollBehavior,
		}));

		expect(animation).toBe('none');
		expect(behavior).toBe('auto');
	});

	test('with forced colors the grain and the relief that would muddy the text are removed', async ({
		page,
	}) => {
		await page.emulateMedia({ forcedColors: 'active' });
		await page.goto('/');
		await settle(page);

		const display = await page.evaluate(() => ({
			desk: getComputedStyle(document.body, '::before').display,
			paper: getComputedStyle(
				document.querySelector('.page--sheet') as Element,
				'::after',
			).display,
		}));

		expect(display).toEqual({ desk: 'none', paper: 'none' });
	});
});
