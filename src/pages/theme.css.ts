import type { APIRoute } from 'astro';
import { themeCss } from '../lib/theme';

/**
 * The palettes of the two themes as a separate stylesheet. Inline, its hash would have to be added to the
 * CSP every time a color changed; this way `style-src 'self'` is enough.
 */
export const GET: APIRoute = () =>
	new Response(themeCss(), {
		headers: { 'Content-Type': 'text/css; charset=utf-8' },
	});
