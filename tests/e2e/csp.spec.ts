import { expect, test } from '@playwright/test';
import { SCHEMES, settle, trackCspViolations } from './support';

test.describe('content security policy (CSP)', () => {
	for (const scheme of SCHEMES) {
		test(`the site itself does not break it, neither on load nor in use: ${scheme}`, async ({
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

	test('really does block an inline script and an image from another site', async ({
		page,
	}) => {
		await trackCspViolations(page);
		await page.goto('/');
		await settle(page);

		// An inline script runs when inserted, so if it were allowed it would already have run.
		const ran = await page.evaluate(() => {
			const script = document.createElement('script');
			script.textContent = 'window.__pwned = true';
			document.head.append(script);

			// The image is requested in the background: its violation arrives later.
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
