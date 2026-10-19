import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LANGUAGES, localePath } from '../../src/lib/i18n';
import { t } from '../../src/lib/ui';
import { VIEWPORT_HEIGHT, settle } from './support';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const SECONDARY = LANGUAGES.filter(({ locale }) => locale !== 'es');

test.describe('the language switch', () => {
	test('is in the bar, to the left of the theme button, with the three languages and Spanish first', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const links = page.locator('[data-site-bar] [data-lang-switch] a');
		await expect(links).toHaveText(LANGUAGES.map(({ label }) => label));

		for (const [index, language] of LANGUAGES.entries()) {
			const link = links.nth(index);
			await expect(link).toHaveAttribute(
				'href',
				localePath(language.locale),
			);
			await expect(link).toHaveAttribute('hreflang', language.locale);
			await expect(link).toHaveAttribute('lang', language.locale);
			await expect(
				page.getByRole('link', { name: language.name, exact: true }),
			).toHaveCount(1);
		}

		const boxes = await page.evaluate(() => {
			const rect = (selector: string) => {
				const { left, right, top, bottom } = (
					document.querySelector(selector) as Element
				).getBoundingClientRect();

				return { left, right, top, bottom };
			};

			return {
				bar: rect('[data-site-bar]'),
				lang: rect('[data-lang-switch]'),
				theme: rect('[data-theme-toggle]'),
			};
		});
		expect(boxes.lang.right).toBeLessThanOrEqual(boxes.theme.left);
		expect(boxes.theme.left - boxes.lang.right).toBeLessThan(24);
		for (const box of [boxes.lang, boxes.theme]) {
			expect(box.top).toBeGreaterThanOrEqual(boxes.bar.top);
			expect(box.bottom).toBeLessThanOrEqual(boxes.bar.bottom);
		}
	});

	test('with the keyboard the language comes right before the theme', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		await page.locator('[data-lang-switch] a').last().focus();
		await page.keyboard.press('Tab');
		await expect(page.locator('[data-theme-toggle]')).toBeFocused();
	});

	test('also works without JavaScript: they are links', async ({
		browser,
	}) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/');

		await expect(page.locator('[data-lang-switch] a')).toHaveCount(3);
		await page.locator('[data-lang-switch] a[hreflang="ca"]').click();
		await expect(page).toHaveURL(/\/ca\/$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
		await context.close();
	});
});

for (const { locale } of LANGUAGES) {
	test.describe(`the ${locale} page`, () => {
		test('declares its language, marks its own in the switch and uses its texts', async ({
			page,
		}) => {
			await page.setViewportSize({
				width: 1440,
				height: VIEWPORT_HEIGHT,
			});
			await page.goto(localePath(locale));
			await settle(page);

			await expect(page.locator('html')).toHaveAttribute('lang', locale);
			await expect(
				page.locator('[data-lang-switch] [aria-current="page"]'),
			).toHaveAttribute('hreflang', locale);
			await expect(page.locator('[data-lang-switch]')).toHaveAttribute(
				'aria-label',
				t(locale, 'lang.label'),
			);
			await expect(page.locator('[data-site-nav] a').first()).toHaveText(
				t(locale, 'nav.about'),
			);
			await expect(page.locator('[data-site-nav]')).toContainText(
				t(locale, 'nav.projects'),
			);
			await expect(page.locator('body > footer')).toContainText(
				t(locale, 'footer.rights'),
			);
		});
	});
}

test.describe('switching language', () => {
	test('leads to the same page in the other language and keeps the sheet being read', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/#resume');
		await settle(page);
		await expect(
			page.locator('[data-site-nav] a[aria-current]'),
		).toHaveAttribute('href', '#resume');

		await page.locator('[data-lang-switch] a[hreflang="en"]').click();
		await expect(page).toHaveURL(/\/en\/#resume$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await settle(page);
		await expect(
			page.locator('[data-site-nav] a[aria-current]'),
		).toHaveAttribute('href', '#resume');

		await page.locator('[data-lang-switch] a[hreflang="ca"]').click();
		await expect(page).toHaveURL(/\/ca\/#resume$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'ca');

		await page.locator('[data-lang-switch] a[hreflang="es"]').click();
		// The root, without a prefix: the main language. The test server may be localhost or 127.0.0.1.
		await expect(page).toHaveURL(/^https?:\/\/[^/]+\/#resume$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	});

	test('from the cover it adds no anchor', async ({ page }) => {
		await page.goto('/');
		await settle(page);

		await page.locator('[data-lang-switch] a[hreflang="en"]').click();
		await expect(page).toHaveURL(/\/en\/$/);
	});
});

for (const { locale } of SECONDARY) {
	test.describe(`the ${locale} page, built with the same care`, () => {
		for (const width of [375, 1440]) {
			test(`has no accessibility violations at ${width}px`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
				await page.goto(localePath(locale));
				await settle(page);

				const { violations } = await new AxeBuilder({ page })
					.withTags(TAGS)
					.analyze();

				expect(
					violations.map(
						(violation) =>
							`${violation.id}: ${violation.nodes
								.map((node) => node.target.join(' '))
								.join(' | ')}`,
					),
				).toEqual([]);
			});
		}

		test('does not overflow horizontally at 320px: the texts of another language are longer', async ({
			page,
		}) => {
			await page.setViewportSize({ width: 320, height: VIEWPORT_HEIGHT });
			await page.goto(localePath(locale));
			await settle(page);

			const { scroll, inner } = await page.evaluate(() => ({
				scroll: document.documentElement.scrollWidth,
				inner: window.innerWidth,
			}));

			expect(scroll).toBeLessThanOrEqual(inner);
		});
	});
}
