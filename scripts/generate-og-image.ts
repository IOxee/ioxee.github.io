/**
 * Genera `public/og.jpg` fotografiando la portada del sitio ya compilado, para que la imagen siempre coincida con
 * el diseño. Uso: `npm run build && npm run assets:og`.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import sharp from 'sharp';

const PORT = 4399;
// Formato de Open Graph. `src/lib/seo.test.ts` comprueba que `OG_IMAGE` coincide con el archivo.
const WIDTH = 1200;
const HEIGHT = 630;

const server = await preview({
	root: '.',
	server: { host: '127.0.0.1', port: PORT },
	logLevel: 'silent',
});
const browser = await chromium.launch();

try {
	const page = await browser.newPage({
		viewport: { width: WIDTH, height: HEIGHT },
		colorScheme: 'light',
		// El script inyecta un <style> para esconder lo que no sale en la imagen; la CSP del sitio lo
		// bloquearía.
		bypassCSP: true,
	});
	await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	// Solo la portada cerrada sobre la mesa: sin barra de navegación ni pie. La carpeta se escala a
	// la altura que queda, así que al quitar la barra se recoloca sola.
	// La invitación a hacer scroll tampoco: en una imagen no se puede bajar.
	await page.addStyleTag({
		content: '.bar, footer, .cover-scroll { display: none !important; }',
	});
	// Espera a que se recoloque y a que el sello termine de caer.
	await page.waitForTimeout(1800);

	const screenshot = await page.screenshot({
		clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
	});
	const jpeg = await sharp(screenshot)
		.jpeg({ quality: 84, mozjpeg: true })
		.toBuffer();

	writeFileSync('public/og.jpg', jpeg);
	console.log(
		`public/og.jpg: ${WIDTH}×${HEIGHT}, ${Math.round(jpeg.length / 1024)} KB`,
	);
} finally {
	await browser.close();
	await server.stop();
}
