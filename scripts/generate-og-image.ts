/**
 * Genera `public/og.jpg` (1200×630, la imagen que se ve al compartir el enlace) fotografiando la
 * cartilla del propio sitio ya compilado. Así la imagen siempre coincide con el diseño real.
 *
 * Uso: `npm run build && npm run assets:og` (Node 22.18 o superior).
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import sharp from 'sharp';
import { SECTION_IDS } from '../src/lib/sections.ts';

const PORT = 4399;
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
	});
	await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	// Solo la cartilla sobre la mesa: sin barra de navegación ni el resto de secciones.
	const otherSections = Object.values(SECTION_IDS)
		.filter((id) => id !== SECTION_IDS.home)
		.map((id) => `#${id}`)
		.join(', ');
	await page.addStyleTag({
		content: `.bar, footer, ${otherSections} { display: none !important; } .page { margin-top: 100px !important; }`,
	});
	// Espera a que el sello termine de caer.
	await page.waitForTimeout(1600);

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
