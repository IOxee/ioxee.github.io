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
		'There is no dist/: run `npm run build` before `npm run test:dist`',
	);
}

// Site paths start with `/`, which in a relative URL would escape `dist/`.
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
	if (!meta) throw new Error('The page has no CSP meta');

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
 * The CSP source for an inline text: `'sha256-…'`. The browser turns CRLF into LF when parsing
 * the HTML before hashing, so the same is done here.
 */
export const cspHash = (text: string): string =>
	`'sha256-${createHash('sha256')
		.update(text.replace(/\r\n?/g, '\n'), 'utf8')
		.digest('base64')}'`;

/**
 * A `<script>` without `src` that the browser executes. Data ones, with a type that is not
 * JavaScript (such as JSON-LD), do not count.
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
