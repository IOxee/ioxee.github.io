import { expect, test } from '@playwright/test';
import {
	SCHEMES,
	SECTION_LINKS,
	VIEWPORT_HEIGHT,
	folderGeometry,
	settle,
	showPosition,
} from './support';

/** At most how many Tabs before wrapping around: there are about ten focusable elements per screen. */
const MAX_TABS = 40;

/**
 * Where the keyboard traversal starts from: the cover (menu and folder), the projects (links to the
 * repositories, on the paper) and the contact (contact links). Each screen has different ones.
 * The sheets are reached through their tab, as someone using the keyboard would: focus stays on the sheet and
 * Tab continues from there.
 */
const STARTS = [null, '#portfolio', '#contact'] as const;

test.describe('keyboard', () => {
	for (const scheme of SCHEMES) {
		test(`everything focusable has a visible two-tone focus: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });

			const missing: string[] = [];
			const focused: string[] = [];
			for (const tab of STARTS) {
				const start = tab ?? 'the cover';
				await page.goto('/');
				await settle(page);
				if (tab) {
					await page
						.locator(`[data-site-nav] a[href="${tab}"]`)
						.click();
					await expect(
						page.locator(`[data-page]${tab}:not([inert])`),
					).toHaveCount(1);
					await settle(page);
				}

				for (let i = 0; i < MAX_TABS; i += 1) {
					await page.keyboard.press('Tab');
					// The ring and the halo appear with a short transition: it is measured once it has finished.
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
							outline:
								style.outlineStyle !== 'none' &&
								parseFloat(style.outlineWidth) >= 2,
							halo: /\b7px\b/.test(style.boxShadow),
						};
					});
					if (!info) break;

					focused.push(info.label);
					if (!info.outline || !info.halo) {
						missing.push(
							`${start}: "${info.label}" ring=${info.outline} halo=${info.halo}`,
						);
					}
				}
			}

			expect(focused.length).toBeGreaterThanOrEqual(10);
			expect(focused.some((label) => /repositorio/i.test(label))).toBe(
				true,
			);
			expect(focused.some((label) => /linkedin/i.test(label))).toBe(true);
			expect(missing).toEqual([]);
		});
	}

	test('the arrows, Home and End turn the sheets when the focus is on the folder', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const pageNow = () =>
			page.evaluate(() =>
				Number(
					document
						.querySelector<HTMLElement>(
							'[data-page][data-state="current"]',
						)
						?.style.getPropertyValue('--i'),
				),
			);
		await page.locator('[data-viewport]').focus();

		await page.keyboard.press('ArrowRight');
		await expect.poll(pageNow).toBe(1);
		await page.keyboard.press('ArrowRight');
		await expect.poll(pageNow).toBe(3);
		await page.keyboard.press('ArrowLeft');
		await expect.poll(pageNow).toBe(1);
		await page.keyboard.press('End');
		await expect.poll(pageNow).toBeGreaterThanOrEqual(9);
		await page.keyboard.press('Home');
		await expect.poll(pageNow).toBe(0);
	});

	test('the first Tab goes to the skip-to-content link, which really skips the menu', async ({
		page,
	}) => {
		await page.goto('/');
		await page.keyboard.press('Tab');

		const skip = page.getByRole('link', { name: 'Saltar al contenido' });
		await expect(skip).toBeFocused();
		await expect(skip).toBeInViewport();

		await page.keyboard.press('Enter');
		await page.keyboard.press('Tab');

		const inMain = await page.evaluate(
			() => document.activeElement?.closest('#contenido') !== null,
		);
		expect(inMain).toBe(true);
	});

	test('the theme button works with Enter and with Space', async ({
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

	test('the menu marks the section of the sheet being read as the folder turns', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const current = page.locator('[data-site-nav] a[aria-current]');
		const { positions } = await folderGeometry(page);
		expect(positions).toBeGreaterThanOrEqual(5);

		const seen = new Set<string>();
		for (let position = 0; position < positions; position += 1) {
			await showPosition(page, position);

			const section = await page.evaluate(
				() =>
					document.querySelector<HTMLElement>(
						'[data-page][data-state="current"]',
					)?.dataset.section,
			);
			if (section === 'home') {
				await expect(current).toHaveCount(0);
			} else {
				await expect(current).toHaveAttribute('href', `#${section}`);
				seen.add(`#${section}`);
			}
		}

		for (const href of SECTION_LINKS) expect(seen).toContain(href);
	});

	test('the menu tabs lead to the first sheet of their section and get marked', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		for (const href of SECTION_LINKS) {
			await page.locator(`[data-site-nav] a[href="${href}"]`).click();

			await expect(
				page.locator('[data-site-nav] a[aria-current]'),
			).toHaveAttribute('href', href);
			await expect(
				page.locator(`[data-page]${href}:not([inert])`),
			).toHaveCount(1);
			await expect(page).toHaveURL(new RegExp(`${href}$`));
		}
	});

	test('the menu does not move: it is always visible, also halfway through the folder', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		for (const position of [0, 3, 6]) {
			await showPosition(page, position);

			await expect(page.locator('[data-site-bar]')).toBeInViewport({
				ratio: 1,
			});
			const top = await page.evaluate(
				() =>
					document
						.querySelector('[data-site-bar]')
						?.getBoundingClientRect().top,
			);
			expect(top).toBe(0);
		}
	});
});
