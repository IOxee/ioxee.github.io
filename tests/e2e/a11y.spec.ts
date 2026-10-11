import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { SCHEMES, VIEWPORT_HEIGHT, settle } from './support';

/** Las reglas WCAG que se exigen, hasta la 2.2 AA. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violationsOf(page: Page): Promise<string[]> {
	const { violations } = await new AxeBuilder({ page })
		.withTags(TAGS)
		.analyze();

	// Un resumen legible: qué regla y qué elementos, no el volcado completo de axe.
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
		// Cada sección con título lo anuncia: sin hojas «mudas» en el árbol de accesibilidad. Se
		// cuentan primero las secciones: si una pierde su `aria-labelledby` deja de ser una región y
		// el bucle de abajo no la vería.
		const sections = await page.locator('main section').count();
		expect(sections).toBeGreaterThan(0);

		const regions = await page.getByRole('region').all();
		expect(regions).toHaveLength(sections);
		for (const region of regions) {
			await expect(region).toHaveAccessibleName(/\S/);
		}
	});
});
