import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/** Se sirve con `astro preview` (hay que compilar antes): la CSP solo existe en el build, no en `astro dev`. */
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
		// Las capturas varían por sistema (el nombre del archivo lleva la plataforma); un margen
		// pequeño absorbe el suavizado del texto sin dejar pasar un cambio de maquetación.
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
