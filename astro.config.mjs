// @ts-check
import { defineConfig } from 'astro/config';

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
});
