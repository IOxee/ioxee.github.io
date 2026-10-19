// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// El script del tema va en línea (si fuera un módulo diferido habría parpadeo) y su hash entra en la CSP, calculado
// del mismo archivo que incrusta `Base.astro`. Los saltos de línea se normalizan a LF porque el navegador hace lo
// mismo antes de hashear: con CRLF saldría otro hash.
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
	// No hay markdown. Shiki, el resaltador por defecto, pinta con estilos en línea que la CSP rechaza.
	markdown: { syntaxHighlight: false },
	integrations: [
		sitemap({
			filter: (page) => !page.endsWith('/404/'),
			i18n: {
				defaultLocale: 'es',
				// Los mismos códigos que los `hreflang` del `<head>`: idioma sin país.
				locales: { es: 'es', en: 'en', ca: 'ca' },
			},
		}),
	],
	security: {
		// GitHub Pages no deja fijar cabeceras, así que la CSP va en una etiqueta <meta>. Astro
		// añade `script-src` y `style-src` con los hashes de lo que genera; esto es lo demás.
		csp: {
			algorithm: 'SHA-256',
			directives: [
				"default-src 'none'",
				// `data:` es el grano de papel de la mesa, un SVG incrustado en el CSS.
				"img-src 'self' data:",
				"font-src 'self'",
				// El visor de documentos enseña un PDF del propio sitio dentro de la página (un <iframe>).
				"frame-src 'self'",
				"object-src 'none'",
				"base-uri 'none'",
				"form-action 'none'",
			],
			scriptDirective: { hashes: [themeInitHash] },
			styleDirective: {
				// Cada hoja se inclina con `style="--tilt: …"`: atributos en línea, y solo atributos.
				resources: [
					{ resource: "'self'", kind: 'element' },
					{ resource: "'unsafe-inline'", kind: 'attribute' },
				],
			},
		},
	},
});
