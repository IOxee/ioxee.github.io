import type { APIRoute } from 'astro';
import { themeCss } from '../lib/theme';

/**
 * Las paletas de los dos temas como hoja de estilo aparte. En línea habría que añadir su hash a la
 * CSP cada vez que cambiase un color; así basta con `style-src 'self'`.
 */
export const GET: APIRoute = () =>
	new Response(themeCss(), {
		headers: { 'Content-Type': 'text/css; charset=utf-8' },
	});
