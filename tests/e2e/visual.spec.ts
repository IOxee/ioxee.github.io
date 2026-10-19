import { type Page, expect, test } from '@playwright/test';
import { type Scheme, VIEWPORT_HEIGHT, WIDTHS, settle } from './support';

// Screenshots depend on the system (text smoothing): each platform has its own, and they are
// compared in Chromium only. They are run by hand with `npm run test:visual`, not in CI.
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Una referencia por plataforma basta con un solo navegador.',
);

test.use({ bypassCSP: true });

/**
 * The grain of the paper and of the desk is noise: a PNG cannot compress it and each reference would weigh several
 * megabytes. The texture is tested in the contrast; here layout, text and colors matter.
 */
const WITHOUT_GRAIN =
	'body::before, .page--sheet::after { display: none !important; }';

/**
 * The sheets that get photographed, with the anchor they are entered through: the closed cover, a spread with
 * text (experience) and a spread with screenshots (projects). Entering through the anchor places the
 * folder without animation, so the screenshot always comes out the same.
 */
const SHEETS = [
	{ name: 'portada', hash: '' },
	{ name: 'experiencia', hash: '#resume' },
	{ name: 'proyectos', hash: '#portfolio' },
] as const;

/**
 * What is not compared: the copyright year, which changes just with time, and the images, which
 * weigh a lot in a reference. Where they are and how big they are is still seen, which is
 * what can break the layout.
 */
const masked = (page: Page) => [page.locator('footer'), page.locator('img')];

async function capture(
	page: Page,
	scheme: Scheme,
	width: number,
	sheet: (typeof SHEETS)[number],
) {
	await page.emulateMedia({ colorScheme: scheme });
	await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
	await page.goto(`/${sheet.hash}`);
	await page.addStyleTag({ content: WITHOUT_GRAIN });
	await settle(page);
	// The script places the folder when measuring: wait for it to finish settling.
	await expect(page.locator('html')).toHaveAttribute('data-folder-ready', '');
	// Entering through an anchor does a smooth scroll: the capture is taken once the page has come to rest.
	await page.waitForFunction(
		() =>
			new Promise<boolean>((resolve) => {
				const before = window.scrollY;
				setTimeout(() => resolve(window.scrollY === before), 250);
			}),
	);

	await expect(page).toHaveScreenshot(
		`${sheet.name}-${scheme}-${width}.png`,
		{
			mask: masked(page),
		},
	);
}

test.describe('regresión visual', { tag: '@visual' }, () => {
	for (const sheet of SHEETS) {
		for (const width of WIDTHS) {
			test(`${sheet.name}, día a ${width}px`, async ({ page }) => {
				await capture(page, 'light', width, sheet);
			});
		}

		for (const width of [375, 1024, 1440]) {
			test(`${sheet.name}, noche a ${width}px`, async ({ page }) => {
				await capture(page, 'dark', width, sheet);
			});
		}
	}
});
