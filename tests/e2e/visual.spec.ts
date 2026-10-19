import { type Page, expect, test } from '@playwright/test';
import { type Scheme, VIEWPORT_HEIGHT, WIDTHS, settle } from './support';

// Las capturas dependen del sistema (suavizado del texto): cada plataforma tiene las suyas, y se
// comparan solo en Chromium. Se lanzan a mano con `npm run test:visual`, no en el CI.
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Una referencia por plataforma basta con un solo navegador.',
);

test.use({ bypassCSP: true });

/**
 * El grano de papel y de la mesa es ruido: un PNG no lo comprime y cada referencia pesaría varios
 * megas. La textura se prueba en el contraste; aquí importan la maquetación, el texto y los colores.
 */
const WITHOUT_GRAIN =
	'body::before, .page--sheet::after { display: none !important; }';

/**
 * Las hojas que se fotografían, con el ancla a la que se entra: la portada cerrada, un par con
 * texto (la experiencia) y un par con capturas (los proyectos). Entrar por el ancla coloca la
 * carpeta sin animación, así que la captura sale siempre igual.
 */
const SHEETS = [
	{ name: 'portada', hash: '' },
	{ name: 'experiencia', hash: '#resume' },
	{ name: 'proyectos', hash: '#portfolio' },
] as const;

/**
 * Lo que no se compara: el año del copyright, que cambia solo con el tiempo, y las imágenes, que
 * pesan mucho en una referencia. De ellas se sigue viendo dónde están y qué tamaño tienen, que es
 * lo que puede romper la maquetación.
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
	// El script coloca la carpeta al medir: se espera a que haya acabado de ponerse.
	await expect(page.locator('html')).toHaveAttribute('data-folder-ready', '');
	// Entrar por un ancla hace un scroll suave: se captura cuando la página ya se ha quedado quieta.
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
