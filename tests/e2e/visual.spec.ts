import { type Page, expect, test } from '@playwright/test';
import { type Scheme, VIEWPORT_HEIGHT, WIDTHS, settle } from './support';

// Las capturas dependen del sistema (suavizado del texto): cada plataforma tiene las suyas, y se
// comparan solo en Chromium. Se lanzan a mano con `npm run test:visual`, no en el CI.
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Una referencia por plataforma basta con un solo navegador.',
);

// Se inyecta una hoja de estilo en cada captura, y la CSP del sitio lo impediría.
test.use({ bypassCSP: true });

/**
 * El grano de papel y de la mesa es ruido: un PNG no lo comprime y cada referencia pesaría varios
 * megas. La textura se prueba en el contraste; aquí importan la maquetación, el texto y los colores.
 */
const WITHOUT_GRAIN =
	'body::before, .paper::after { display: none !important; }';

/**
 * Lo que no se compara: lo que cambia solo con el tiempo (la edad, con cada cumpleaños, y el año
 * del copyright) y las imágenes, que pesan mucho en una referencia. De ellas se sigue viendo dónde
 * están y qué tamaño tienen, que es lo que puede romper la maquetación.
 */
const masked = (page: Page) => [
	page.locator('.leaders .row', { hasText: 'Edad' }),
	page.locator('footer'),
	page.locator('img'),
];

async function capture(page: Page, scheme: Scheme, width: number) {
	await page.emulateMedia({ colorScheme: scheme });
	await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
	await page.goto('/');
	await page.addStyleTag({ content: WITHOUT_GRAIN });
	await settle(page);

	// Si cambia el texto o la clase, la máscara no taparía nada y la captura fallaría el día del
	// cumpleaños: mejor que falle ahora y diga por qué.
	await expect(
		page.locator('.leaders .row', { hasText: 'Edad' }),
	).toHaveCount(1);

	await expect(page).toHaveScreenshot(`${scheme}-${width}.png`, {
		fullPage: true,
		mask: masked(page),
	});
}

test.describe('regresión visual', { tag: '@visual' }, () => {
	for (const width of WIDTHS) {
		test(`día a ${width}px`, async ({ page }) => {
			await capture(page, 'light', width);
		});
	}

	for (const width of [375, 1024, 1440]) {
		test(`noche a ${width}px`, async ({ page }) => {
			await capture(page, 'dark', width);
		});
	}
});
