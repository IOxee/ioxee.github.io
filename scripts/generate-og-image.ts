/**
 * Generates `public/og.jpg` by photographing the cover of the already built site, so the image always matches
 * the design. Usage: `npm run build && npm run assets:og`.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import sharp from 'sharp';

const PORT = 4399;
// Open Graph format. `src/lib/seo.test.ts` checks that `OG_IMAGE` matches the file.
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
		// The script injects a <style> to hide what does not appear in the image; the site's CSP would
		// block it.
		bypassCSP: true,
	});
	await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	// Only the closed cover on the desk: no navigation bar or footer. The folder scales to
	// the height that is left, so removing the bar repositions it on its own.
	// The scroll invitation goes too: in an image you cannot scroll down.
	await page.addStyleTag({
		content: '.bar, footer, .cover-scroll { display: none !important; }',
	});
	// Waits for it to reposition and for the stamp to finish dropping.
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
