import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../astro.config.mjs';
import { DEFAULT_LOCALE, LOCALES } from '../../src/lib/i18n';

// The languages live in two places (the Astro config and `src/lib/i18n.ts`); this test keeps them in sync.
describe('astro.config.mjs i18n', () => {
	it('declares exactly the locales of src/lib/i18n.ts', () => {
		expect(config.i18n?.locales).toEqual([...LOCALES]);
	});

	it('uses the same default locale as src/lib/i18n.ts', () => {
		expect(config.i18n?.defaultLocale).toBe(DEFAULT_LOCALE);
	});
});

describe('astro.config.mjs site', () => {
	it('is the https origin of the GitHub Pages user site, which canonical and sitemap build on', () => {
		expect(config.site).toBe('https://ioxee.github.io');
	});

	it('registers the sitemap integration', () => {
		const names = (config.integrations ?? [])
			.flat()
			.map((item) => (item ? item.name : null));

		expect(names).toContain('@astrojs/sitemap');
	});
});

describe('astro.config.mjs security.csp', () => {
	const csp = config.security?.csp;
	const policy = typeof csp === 'object' ? csp : undefined;
	const directives = policy?.directives ?? [];

	it('is enabled with an explicit policy', () => {
		expect(policy).toBeDefined();
	});

	it('denies everything by default and only opens what the site uses', () => {
		expect(directives).toContain("default-src 'none'");
		expect(directives).toContain("img-src 'self' data:");
		expect(directives).toContain("font-src 'self'");
	});

	it('lets the page frame only its own documents, for the PDF viewer, and nobody else', () => {
		expect(directives).toContain("frame-src 'self'");
		for (const directive of directives) {
			if (directive.startsWith('frame-src')) {
				expect(directive).not.toMatch(/\*|https?:|data:|blob:/);
			}
		}
		expect(directives).toContain("object-src 'none'");
	});

	it('closes the injection routes that no page here needs', () => {
		expect(directives).toContain("object-src 'none'");
		expect(directives).toContain("base-uri 'none'");
		expect(directives).toContain("form-action 'none'");
	});

	it('does not use directives that a <meta> policy ignores', () => {
		const names = directives.map((directive) => directive.split(' ')[0]);

		expect(names).not.toContain('frame-ancestors');
		expect(names).not.toContain('report-uri');
		expect(names).not.toContain('sandbox');
	});

	it('allows the inline theme script by its hash, never with unsafe-inline or unsafe-eval', () => {
		// As the browser does before hashing: CRLF → LF.
		const source = readFileSync(
			new URL('../../src/scripts/theme-init.js', import.meta.url),
			'utf8',
		).replace(/\r\n?/g, '\n');
		const hash = `sha256-${createHash('sha256').update(source).digest('base64')}`;

		expect(policy?.scriptDirective?.hashes).toEqual([hash]);
		expect(JSON.stringify(policy?.scriptDirective)).not.toMatch(/unsafe-/);
		expect(directives.join(';')).not.toMatch(/unsafe-/);
	});

	it('only lets style attributes be inline (the --tilt of each sheet), not style elements', () => {
		const resources = policy?.styleDirective?.resources ?? [];
		const unsafe = resources.filter((entry) =>
			JSON.stringify(entry).includes('unsafe-'),
		);

		expect(unsafe).toEqual([
			{ resource: "'unsafe-inline'", kind: 'attribute' },
		]);
		// `'self'` goes in `element`: with `style-src-attr` present, `style-src` no longer governs anything.
		expect(resources).toContainEqual({
			resource: "'self'",
			kind: 'element',
		});
	});
});

describe('astro.config.mjs markdown', () => {
	it('turns Shiki off: the site has no markdown, and its inline styles would clash with the CSP', () => {
		expect(config.markdown?.syntaxHighlight).toBe(false);
	});
});
