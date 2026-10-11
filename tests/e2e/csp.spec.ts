import { expect, test } from '@playwright/test';
import { SCHEMES, settle, trackCspViolations } from './support';

test.describe('política de contenido (CSP)', () => {
	for (const scheme of SCHEMES) {
		test(`el propio sitio no la incumple, ni al cargar ni al usarlo: ${scheme}`, async ({
			page,
		}) => {
			const problems: string[] = [];
			page.on('console', (message) => {
				if (message.type() === 'error') problems.push(message.text());
			});
			page.on('pageerror', (error) => problems.push(error.message));

			await page.emulateMedia({ colorScheme: scheme });
			await trackCspViolations(page);
			await page.goto('/');
			await settle(page);

			// Usarlo: cambiar de tema y recorrer la página, que es lo que ejecuta los scripts.
			await page.locator('[data-theme-toggle]').click();
			await page.evaluate(async () => {
				for (const fraction of [0.25, 0.5, 0.75, 1]) {
					window.scrollTo(0, document.body.scrollHeight * fraction);
					await new Promise((resolve) => setTimeout(resolve, 150));
				}
			});

			expect(await page.evaluate(() => window.__violations)).toEqual([]);
			expect(problems).toEqual([]);
		});
	}

	test('de verdad bloquea un script en línea y una imagen de otro sitio', async ({
		page,
	}) => {
		await trackCspViolations(page);
		await page.goto('/');
		await settle(page);

		// Un script en línea se ejecuta al insertarlo, así que si se permitiera ya habría corrido.
		const ran = await page.evaluate(() => {
			const script = document.createElement('script');
			script.textContent = 'window.__pwned = true';
			document.head.append(script);

			// La imagen se pide en segundo plano: su violación llega después.
			new Image().src = 'https://example.com/pixel.png';

			return (
				(window as unknown as { __pwned?: boolean }).__pwned === true
			);
		});
		expect(ran).toBe(false);

		await expect
			.poll(() =>
				page.evaluate(() =>
					window.__violations.map((violation) => violation.directive),
				),
			)
			.toEqual(
				expect.arrayContaining([
					expect.stringMatching(/^script-src/),
					expect.stringMatching(/^img-src/),
				]),
			);
	});
});
