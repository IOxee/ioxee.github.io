import { existsSync, readdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { VIEWPORT_HEIGHT, settle } from './support';

// El visor solo existe si alguna certificación tiene foto o documento: sin adjuntos, estas pruebas
// no tienen nada que probar y se saltan (el resto de la suite sigue protegiendo lo demás).
const FILES = new URL('../../src/assets/certifications/', import.meta.url);
const attached = existsSync(FILES)
	? readdirSync(FILES).filter((name) => !name.startsWith('.'))
	: [];
const hasImage = attached.some((name) => /\.(png|jpe?g|webp)$/.test(name));
const hasPdf = attached.some((name) => name.endsWith('.pdf'));

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Dice al navegador si trae visor de PDF: el Chromium sin ventana de las pruebas no lo trae. */
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
		// El script pone la dirección absoluta (la propiedad `href` del enlace).
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

		// Con Tab, desde «Cerrar» se llega a esa zona en pocas pulsaciones (el orden exacto varía por navegador).
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
