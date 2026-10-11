// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// El único script ejecutable en línea fija el tema antes de pintar (evita el parpadeo), así que no
// puede ser un módulo diferido. Su hash se calcula del mismo archivo que incrusta `Base.astro`:
// si se edita el script, el hash cambia solo. Ojo: Astro pone la meta de la CSP al final del
// `<head>` y una meta solo gobierna lo que viene después, de modo que este script se ejecuta antes
// de que la política exista. El hash es la garantía de que seguirá funcionando si cambia el orden.
// Los saltos de línea se normalizan a LF porque el navegador hace lo mismo antes de hashear (un
// checkout con CRLF daría otro hash); `Base.astro` aplica el mismo reemplazo.
const themeInit = readFileSync(
	new URL('./src/scripts/theme-init.js', import.meta.url),
	'utf8',
).replace(/\r\n?/g, '\n');
const themeInitHash = `sha256-${createHash('sha256').update(themeInit).digest('base64')}`;

// https://astro.build/config
export default defineConfig({
	// Sitio de usuario (ioxee.github.io): sin `base`.
	site: 'https://ioxee.github.io',
	output: 'static',
	// El sitio se lanza solo en español. `ca` y `en` quedan configurados para
	// poder añadirlos creando contenido, sin tocar la plantilla.
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
		// La 404 no es una página que quiera ver un buscador.
		sitemap({ filter: (page) => !page.endsWith('/404/') }),
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
