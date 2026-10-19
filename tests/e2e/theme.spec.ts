import { type Page, expect, test } from '@playwright/test';
import { settle, trackThemeAtBody } from './support';

const STORAGE_KEY = 'ioxee:theme';

const themeOf = (page: Page) =>
	page.evaluate(() => document.documentElement.dataset.theme);

test.describe('tema día y noche', () => {
	test('arranca con el tema del sistema, sin parpadeo', async ({
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

			// Ya al crearse el <body>, antes de pintar: el script del tema es el primero que corre.
			expect(await page.evaluate(() => window.__themeAtBody)).toBe(
				expected,
			);
			expect(await themeOf(page)).toBe(expected);
			await context.close();
		}
	});

	test('el botón cambia el tema y se acuerda de la elección al recargar', async ({
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

	test('la elección guardada gana al tema del sistema', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.addInitScript((key) => {
			localStorage.setItem(key, 'day');
		}, STORAGE_KEY);
		await page.goto('/');

		expect(await themeOf(page)).toBe('day');
	});

	test('ignora un valor guardado que no es un tema', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.addInitScript((key) => {
			localStorage.setItem(key, 'sepia');
		}, STORAGE_KEY);
		await page.goto('/');

		expect(await themeOf(page)).toBe('night');
	});

	test('cambiar de tema cambia de verdad los colores', async ({ page }) => {
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

test.describe('sin JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('la página se lee en el tema de día y sin un botón que no haría nada', async ({
		page,
	}) => {
		await page.goto('/');

		expect(await themeOf(page)).toBe('day');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('[data-theme-toggle]')).toBeHidden();
	});
});

test.describe('preferencias de accesibilidad del sistema', () => {
	test('con movimiento reducido el sello ya está estampado y el scroll no es animado', async ({
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

	test('con colores forzados se quitan el grano y el relieve que ensuciarían el texto', async ({
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
