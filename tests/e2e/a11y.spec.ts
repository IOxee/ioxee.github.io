import AxeBuilder from '@axe-core/playwright';
import { pagesAtPosition, positionCount } from '../../src/lib/book';
import { type Page, expect, test } from '@playwright/test';
import {
	SCHEMES,
	VIEWPORT_HEIGHT,
	settle,
	showPosition,
	visiblePages,
} from './support';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violationsOf(page: Page): Promise<string[]> {
	const { violations } = await new AxeBuilder({ page })
		.withTags(TAGS)
		.analyze();

	return violations.map(
		(violation) =>
			`${violation.id}: ${violation.nodes
				.map((node) => node.target.join(' '))
				.join(' | ')}`,
	);
}

test.describe('accesibilidad (axe, WCAG 2.2 AA)', () => {
	for (const scheme of SCHEMES) {
		for (const width of [375, 1440]) {
			test(`la página principal no tiene violaciones: ${scheme}, ${width}px`, async ({
				page,
			}) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
				await page.goto('/');
				await settle(page);

				expect(await violationsOf(page)).toEqual([]);
			});
		}
	}

	for (const scheme of SCHEMES) {
		test(`la carpeta abierta, hoja por hoja, no tiene violaciones: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.setViewportSize({
				width: 1440,
				height: VIEWPORT_HEIGHT,
			});
			await page.goto('/');
			await settle(page);

			const found: string[] = [];
			for (const position of [1, 2, 3, 4, 5, 6]) {
				await showPosition(page, position);
				await settle(page);

				for (const violation of await violationsOf(page)) {
					found.push(`posición ${position}: ${violation}`);
				}
			}

			expect(found).toEqual([]);
		});
	}

	test('la página 404 no tiene violaciones y responde con 404', async ({
		page,
	}) => {
		const response = await page.goto('/esta-pagina-no-existe');
		await settle(page);

		expect(response?.status()).toBe(404);
		expect(await violationsOf(page)).toEqual([]);
	});

	test('tiene una estructura de encabezados y regiones que un lector de pantalla puede seguir', async ({
		page,
	}) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByRole('navigation')).toHaveCount(1);
		await expect(page.getByRole('contentinfo')).toHaveCount(1);
		// Cada página con título lo anuncia: sin hojas «mudas» en el árbol de accesibilidad. Se
		// comprueba en el HTML, donde se ven todas: si una pierde su `aria-labelledby` deja de ser una
		// región y el bucle de abajo no la vería.
		const pages = await page.locator('main [data-page]').count();
		expect(pages).toBeGreaterThan(5);
		const named = await page.evaluate(
			() =>
				[...document.querySelectorAll('main [data-page]')].filter(
					(element) => {
						const id = element.getAttribute('aria-labelledby');

						return (
							id !== null &&
							(
								document.getElementById(id)?.textContent ?? ''
							).trim() !== ''
						);
					},
				).length,
		);
		expect(named).toBe(pages);
	});

	test('el árbol de accesibilidad solo tiene las páginas que se leen: una al cerrar, dos con la carpeta abierta', async ({
		page,
		browserName,
	}) => {
		// Se lee el árbol que construye el navegador: los selectores de Playwright no tratan `inert`
		// como oculto, pero un lector de pantalla sí lo deja fuera.
		test.skip(browserName !== 'chromium', 'El árbol se pide por CDP.');

		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);
		const session = await page.context().newCDPSession(page);

		const regionNames = async (): Promise<string[]> => {
			const { nodes } = (await session.send(
				'Accessibility.getFullAXTree',
			)) as {
				nodes: {
					ignored?: boolean;
					role?: { value?: string };
					name?: { value?: string };
				}[];
			};

			return nodes
				.filter(
					(node) => !node.ignored && node.role?.value === 'region',
				)
				.map((node) => node.name?.value ?? '');
		};

		// Cerrada, solo la portada; abierta, el reverso de la hoja pasada y el anverso de la siguiente.
		// Qué páginas son lo dice el mismo cálculo que usa la carpeta, para no depender de los datos.
		const total = await page.locator('[data-page]').count();
		for (const position of [0, 2, positionCount(total, 'spread') - 2]) {
			const { left, right } = pagesAtPosition(position, total, 'spread');
			const expected = [left, right].filter((page) => page !== null);
			await showPosition(page, position);

			expect(await visiblePages(page)).toEqual(expected);
			const names = await regionNames();
			expect(names).toHaveLength(expected.length);
			for (const name of names) expect(name).toMatch(/\S/);
		}
	});
});
