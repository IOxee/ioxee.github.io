import { expect, test } from '@playwright/test';
import { SCHEMES, SECTION_LINKS, VIEWPORT_HEIGHT, settle } from './support';

/** Cuántos Tab como máximo antes de dar la vuelta: hay unos catorce elementos enfocables. */
const MAX_TABS = 40;

test.describe('teclado', () => {
	for (const scheme of SCHEMES) {
		test(`todo lo enfocable tiene un foco visible de dos tonos: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto('/');
			await settle(page);

			const missing: string[] = [];
			let count = 0;
			for (let i = 0; i < MAX_TABS; i += 1) {
				await page.keyboard.press('Tab');
				// El aro y el halo aparecen con una transición corta: se mide cuando ha terminado.
				await settle(page);

				const info = await page.evaluate(() => {
					const element = document.activeElement;
					if (!element || element === document.body) return null;

					const style = getComputedStyle(element);

					return {
						label: (
							element.getAttribute('aria-label') ??
							element.textContent ??
							element.tagName
						)
							.trim()
							.slice(0, 28),
						// Aro de tinta (se ve sobre el papel) y halo claro (se ve sobre la mesa).
						outline:
							style.outlineStyle !== 'none' &&
							parseFloat(style.outlineWidth) >= 2,
						halo: /\b7px\b/.test(style.boxShadow),
					};
				});
				if (!info) break;

				count += 1;
				if (!info.outline || !info.halo) {
					missing.push(
						`"${info.label}" aro=${info.outline} halo=${info.halo}`,
					);
				}
			}

			expect(count).toBeGreaterThanOrEqual(8);
			expect(missing).toEqual([]);
		});
	}

	test('el primer Tab lleva al enlace para saltar al contenido, que salta de verdad el menú', async ({
		page,
	}) => {
		await page.goto('/');
		await page.keyboard.press('Tab');

		const skip = page.getByRole('link', { name: 'Saltar al contenido' });
		await expect(skip).toBeFocused();
		await expect(skip).toBeInViewport();

		await page.keyboard.press('Enter');
		await page.keyboard.press('Tab');

		// Lo siguiente enfocable está dentro del contenido, no en el menú que se salta.
		const inMain = await page.evaluate(
			() => document.activeElement?.closest('#contenido') !== null,
		);
		expect(inMain).toBe(true);
	});

	test('el botón de tema se maneja con Enter y con Espacio', async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');

		const toggle = page.locator('[data-theme-toggle]');
		const theme = () =>
			page.evaluate(() => document.documentElement.dataset.theme);

		await toggle.focus();
		await page.keyboard.press('Enter');
		expect(await theme()).toBe('night');

		await page.keyboard.press('Space');
		expect(await theme()).toBe('day');
	});

	test('el menú marca la sección en la que se está al desplazarse', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const current = page.locator('[data-site-nav] a[aria-current]');
		await expect(current).toHaveCount(0);

		for (const href of SECTION_LINKS) {
			await page.evaluate((selector) => {
				document
					.querySelector(selector)
					?.scrollIntoView({ behavior: 'instant', block: 'start' });
			}, href);

			await expect(current).toHaveAttribute('href', href);
		}

		await page.evaluate(() =>
			window.scrollTo({ top: 0, behavior: 'instant' }),
		);
		await expect(current).toHaveCount(0);
	});

	test('al final de la página el menú marca el contacto aunque esa sección sea corta', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		await page.evaluate(() =>
			window.scrollTo({
				top: document.documentElement.scrollHeight,
				behavior: 'instant',
			}),
		);

		await expect(
			page.locator('[data-site-nav] a[aria-current]'),
		).toHaveAttribute('href', '#contact');
	});
});
