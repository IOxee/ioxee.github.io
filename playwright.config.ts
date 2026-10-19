import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/** Served with `astro preview` (build first): the CSP only exists in the build, not in `astro dev`. */
export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI
		? [['github'], ['html', { open: 'never' }]]
		: [['list']],
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'retain-on-failure',
	},
	expect: {
		// Screenshots vary by system (the file name carries the platform); a small margin
		// absorbs text smoothing without letting a layout change through.
		toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
	},
	webServer: {
		command: `node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port ${PORT}`,
		url: `http://127.0.0.1:${PORT}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
	],
});
