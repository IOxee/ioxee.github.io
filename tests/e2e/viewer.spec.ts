import { existsSync, readdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { VIEWPORT_HEIGHT, settle } from './support';

// The viewer only exists if some certification has a photo or a document: without attachments, these tests
// have nothing to test and are skipped (the rest of the suite keeps protecting everything else).
const FILES = new URL('../../src/assets/certifications/', import.meta.url);
const attached = existsSync(FILES)
	? readdirSync(FILES).filter((name) => !name.startsWith('.'))
	: [];
const hasImage = attached.some((name) => /\.(png|jpe?g|webp)$/.test(name));
const hasPdf = attached.some((name) => name.endsWith('.pdf'));

// A project can carry a document too (src/assets/projects/<id>.pdf); its tests are skipped without one.
const PROJECT_FILES = new URL('../../src/assets/projects/', import.meta.url);
const hasProjectPdf =
	existsSync(PROJECT_FILES) &&
	readdirSync(PROJECT_FILES).some((name) => name.endsWith('.pdf'));

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Tells the browser whether it has a PDF viewer: the headless Chromium of the tests does not. */
async function pdfViewer(page: Page, enabled: boolean): Promise<void> {
	await page.addInitScript((value) => {
		Object.defineProperty(navigator, 'pdfViewerEnabled', {
			get: () => value,
		});
	}, enabled);
}

async function openCertifications(page: Page): Promise<void> {
	await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
	await page.goto('/#certifications');
	await settle(page);
}

const dialog = (page: Page) => page.locator('[data-viewer-dialog]');

test.describe('el visor de la foto de una certificación', () => {
	test.skip(!hasImage, 'Ninguna certificación tiene foto');

	test('la amplía dentro de la propia web, sin abrir otra pestaña', async ({
		page,
	}) => {
		await openCertifications(page);
		const link = page.locator('a[data-viewer="image"]').first();
		const href = await link.getAttribute('href');
		await expect(link).toHaveAttribute('aria-haspopup', 'dialog');

		await link.click();

		await expect(dialog(page)).toBeVisible();
		await expect(dialog(page).locator('[data-viewer-title]')).toHaveText(
			/\S/,
		);
		// The script sets the absolute address (the link's `href` property).
		await expect(dialog(page).locator('img')).toHaveAttribute(
			'src',
			new URL(href ?? '', page.url()).href,
		);
		await expect(dialog(page).locator('img')).toHaveAttribute('alt', /\S/);
		await expect(page.locator('html')).toHaveAttribute(
			'data-viewer-open',
			'',
		);
		expect(page.context().pages()).toHaveLength(1);
	});

	test('deja la página de detrás quieta mientras está abierto: la carpeta se mueve con el scroll', async ({
		page,
	}) => {
		await openCertifications(page);
		await page.locator('a[data-viewer="image"]').first().click();
		await expect(dialog(page)).toBeVisible();

		const before = await page.evaluate(() => Math.round(scrollY));
		await page.mouse.move(60, 450);
		await page.mouse.wheel(0, 600);
		await page.keyboard.press('PageDown');
		await page.waitForTimeout(500);

		expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
	});

	test('se cierra con Esc, con el botón y pulsando fuera, y el foco vuelve al enlace', async ({
		page,
	}) => {
		await openCertifications(page);
		const link = page.locator('a[data-viewer="image"]').first();

		await link.click();
		await expect(dialog(page)).toBeVisible();
		await expect(page.locator('[data-viewer-close]')).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(dialog(page)).toBeHidden();
		await expect(link).toBeFocused();
		await expect(page.locator('html')).not.toHaveAttribute(
			'data-viewer-open',
			'',
		);
		await expect(page.locator('[data-viewer-body]')).toBeEmpty();

		await link.click();
		await page.locator('[data-viewer-close]').click();
		await expect(dialog(page)).toBeHidden();

		await link.click();
		await expect(dialog(page)).toBeVisible();
		await page.mouse.click(4, 450);
		await expect(dialog(page)).toBeHidden();
	});

	test('un clic con Ctrl o Cmd sigue siendo el de un enlace: lo deja al navegador', async ({
		page,
	}) => {
		await openCertifications(page);
		const prevented = await page
			.locator('a[data-viewer="image"]')
			.first()
			.evaluate((element) => {
				const click = new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
					ctrlKey: true,
				});
				element.dispatchEvent(click);

				return click.defaultPrevented;
			});

		expect(prevented).toBe(false);
		await expect(dialog(page)).toBeHidden();
	});

	test('la foto grande se puede recorrer con el teclado: su zona con scroll se enfoca y tiene nombre', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: 500 });
		await page.goto('/#certifications');
		await settle(page);
		await page.locator('a[data-viewer="image"]').first().click();
		await expect(dialog(page)).toBeVisible();

		const body = page.locator('[data-viewer-body]');
		await expect(body).toHaveAttribute('tabindex', '0');
		await expect(body).toHaveAttribute('role', 'region');
		await expect(body).toHaveAttribute('aria-label', /\S/);

		// With Tab, from "Cerrar" that area is reached in a few presses (the exact order varies by browser).
		await page.locator('[data-viewer-close]').focus();
		let reached = false;
		for (let press = 0; press < 4 && !reached; press += 1) {
			await page.keyboard.press('Tab');
			reached = await page.evaluate(
				() =>
					document.activeElement?.hasAttribute('data-viewer-body') ??
					false,
			);
		}
		expect(reached).toBe(true);

		const before = await body.evaluate((element) => element.scrollTop);
		await page.keyboard.press('ArrowDown');
		await expect
			.poll(() => body.evaluate((element) => element.scrollTop))
			.toBeGreaterThan(before);
	});

	test('abierto no tiene violaciones de accesibilidad', async ({ page }) => {
		await openCertifications(page);
		await page.locator('a[data-viewer="image"]').first().click();
		await expect(dialog(page)).toBeVisible();

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

	test('en un móvil cabe entero en la pantalla', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 700 });
		await page.goto('/#certifications');
		await settle(page);
		await page.locator('a[data-viewer="image"]').first().click();
		await expect(dialog(page)).toBeVisible();

		const box = await dialog(page).boundingBox();
		expect(box?.x).toBeGreaterThanOrEqual(0);
		expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
		expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(700);
	});
});

test.describe('el visor del documento de una certificación', () => {
	test.skip(!hasPdf, 'Ninguna certificación tiene documento');

	test('con visor de PDF en el navegador, lo enseña dentro de la web en un marco del propio sitio', async ({
		page,
	}) => {
		await pdfViewer(page, true);
		await openCertifications(page);
		const link = page.locator('a[data-viewer="pdf"]').first();
		const href = await link.getAttribute('href');
		await expect(link).toHaveAttribute('aria-haspopup', 'dialog');

		await link.click();

		await expect(dialog(page)).toBeVisible();
		const frame = dialog(page).locator('iframe');
		await expect(frame).toHaveAttribute(
			'src',
			`${new URL(href ?? '', page.url()).href}#navpanes=0&view=FitH`,
		);
		await expect(frame).toHaveAttribute('title', /\S/);
		await expect(page.locator('[data-viewer-external]')).toHaveAttribute(
			'href',
			new URL(href ?? '', page.url()).href,
		);

		await page.keyboard.press('Escape');
		await expect(dialog(page)).toBeHidden();
		await expect(page.locator('[data-viewer-body] iframe')).toHaveCount(0);
		await expect(page.locator('[data-viewer-external]')).toHaveCount(0);
	});

	test('sin visor de PDF en el navegador (un móvil), el enlace sigue su camino y no se abre un marco en blanco', async ({
		page,
	}) => {
		await pdfViewer(page, false);
		await openCertifications(page);
		const link = page.locator('a[data-viewer="pdf"]').first();
		await expect(link).not.toHaveAttribute('aria-haspopup', 'dialog');

		const prevented = await link.evaluate((element) => {
			const click = new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			});
			element.dispatchEvent(click);

			return click.defaultPrevented;
		});

		expect(prevented).toBe(false);
		await expect(dialog(page)).toBeHidden();
		await expect(link).toHaveAttribute('target', '_blank');
	});
});

test.describe("the viewer for a project's document", () => {
	test.skip(!hasProjectPdf, 'No project has a document');

	const projectLink = (page: Page) =>
		page
			.locator('section[data-kind="project"] a[data-viewer="pdf"]')
			.first();

	test('opens the PDF in the same viewer as the certifications, titled with the project name', async ({
		page,
	}) => {
		await pdfViewer(page, true);
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/#projects');
		await settle(page);
		const link = projectLink(page);
		const href = await link.getAttribute('href');
		const name = await link.getAttribute('data-viewer-title');
		expect(href).toMatch(/\.pdf$/);
		expect(name).toMatch(/\S/);

		// The project may sit on a page that is not being read, so the click is the one a screen reader sends.
		await link.evaluate((element) => (element as HTMLElement).click());

		await expect(dialog(page)).toBeVisible();
		await expect(dialog(page).locator('[data-viewer-title]')).toHaveText(
			name ?? '',
		);
		await expect(dialog(page).locator('iframe')).toHaveAttribute(
			'src',
			`${new URL(href ?? '', page.url()).href}#navpanes=0&view=FitH`,
		);
	});

	test('stays a real link that opens in a new tab, next to the repository link, when the browser has no PDF viewer', async ({
		page,
	}) => {
		await pdfViewer(page, false);
		await page.goto('/#projects');
		await settle(page);
		const link = projectLink(page);

		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', /noopener/);
		await expect(link).not.toHaveAttribute('aria-haspopup', 'dialog');
		await expect(link).toHaveAttribute('aria-label', /\S.*\S/);
		const siblings = link.locator('xpath=preceding-sibling::a');
		await expect(siblings).toHaveCount(1);
		await expect(siblings.first()).toHaveAttribute('href', /^https:\/\//);
	});
});
