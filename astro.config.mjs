// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// The theme script is inline (as a deferred module there would be a flash) and its hash goes into the CSP, computed
// from the same file that `Base.astro` inlines. Line breaks are normalized to LF because the browser does the
// same before hashing: with CRLF the hash would differ.
const themeInit = readFileSync(
	new URL('./src/scripts/theme-init.js', import.meta.url),
	'utf8',
).replace(/\r\n?/g, '\n');
const themeInitHash = `sha256-${createHash('sha256').update(themeInit).digest('base64')}`;

export default defineConfig({
	site: 'https://ioxee.github.io',
	output: 'static',
	i18n: {
		defaultLocale: 'es',
		locales: ['es', 'ca', 'en'],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	// No markdown. Shiki, the default highlighter, paints with inline styles that the CSP rejects.
	markdown: { syntaxHighlight: false },
	integrations: [
		sitemap({
			filter: (page) => !page.endsWith('/404/'),
			i18n: {
				defaultLocale: 'es',
				// The same codes as the `hreflang` values in the `<head>`: language without country.
				locales: { es: 'es', en: 'en', ca: 'ca' },
			},
		}),
	],
	security: {
		// GitHub Pages does not let you set headers, so the CSP goes in a <meta> tag. Astro
		// adds `script-src` and `style-src` with the hashes of what it generates; this is everything else.
		csp: {
			algorithm: 'SHA-256',
			directives: [
				"default-src 'none'",
				// `data:` is the paper grain of the desk, an SVG embedded in the CSS.
				"img-src 'self' data:",
				"font-src 'self'",
				// The document viewer shows a PDF from the site itself inside the page (an <iframe>).
				"frame-src 'self'",
				"object-src 'none'",
				"base-uri 'none'",
				"form-action 'none'",
			],
			scriptDirective: { hashes: [themeInitHash] },
			styleDirective: {
				// Each sheet is tilted with `style="--tilt: …"`: inline attributes, and only attributes.
				resources: [
					{ resource: "'self'", kind: 'element' },
					{ resource: "'unsafe-inline'", kind: 'attribute' },
				],
			},
		},
	},
});
