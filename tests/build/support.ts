import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { type HTMLElement, parse } from 'node-html-parser';

export const DIST = new URL('../../dist/', import.meta.url);
export const SITE = 'https://ioxee.github.io';
export const PAGES = [
	'index.html',
	'en/index.html',
	'ca/index.html',
	'404.html',
] as const;

if (!existsSync(new URL('index.html', DIST))) {
	throw new Error(
		'No hay dist/: ejecuta `npm run build` antes de `npm run test:dist`',
	);
}

// Las rutas del sitio empiezan por `/`, que en una URL relativa saldría de `dist/`.
const inDist = (path: string): URL => new URL(path.replace(/^\//, ''), DIST);

export const readDist = (path: string): string =>
	readFileSync(inDist(path), 'utf8');

export const distHas = (path: string): boolean => existsSync(inDist(path));

export const parsePage = (path: string): HTMLElement =>
	parse(readDist(path), { comment: false });

export type Csp = ReadonlyMap<string, readonly string[]>;

export function cspOf(page: HTMLElement): Csp {
	const meta = page.querySelector(
		'meta[http-equiv="content-security-policy"]',
	);
	if (!meta) throw new Error('La página no tiene la meta de la CSP');

	return new Map(
		(meta.getAttribute('content') ?? '')
			.split(';')
			.map((directive) => directive.trim())
			.filter(Boolean)
			.map((directive) => {
				const [name = '', ...sources] = directive.split(/\s+/);

				return [name, sources] as const;
			}),
	);
}

/**
 * La fuente CSP de un texto en línea: `'sha256-…'`. El navegador convierte CRLF en LF al analizar
 * el HTML antes de hashear, así que aquí se hace lo mismo.
 */
export const cspHash = (text: string): string =>
	`'sha256-${createHash('sha256')
		.update(text.replace(/\r\n?/g, '\n'), 'utf8')
		.digest('base64')}'`;

/**
 * Un `<script>` sin `src` que el navegador ejecuta. Los de datos, con un tipo que no es
 * JavaScript (como el JSON-LD), no cuentan.
 */
export const isExecutableInlineScript = (script: HTMLElement): boolean => {
	const type = script.getAttribute('type');

	return (
		!script.getAttribute('src') &&
		(!type || type === 'module' || /(?:java|ecma)script/i.test(type))
	);
};

export const isExternal = (url: string): boolean =>
	/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
