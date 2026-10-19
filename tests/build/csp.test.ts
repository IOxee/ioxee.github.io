import { readFileSync } from 'node:fs';
import { HTMLElement } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import {
	PAGES,
	cspHash,
	cspOf,
	isExecutableInlineScript,
	isExternal,
	parsePage,
} from './support';

describe.each(PAGES)('CSP of %s', (path) => {
	const page = parsePage(path);
	const csp = cspOf(page);

	it('denies everything except what is explicitly opened', () => {
		expect(csp.get('default-src')).toEqual(["'none'"]);
		expect(csp.get('object-src')).toEqual(["'none'"]);
		expect(csp.get('base-uri')).toEqual(["'none'"]);
		expect(csp.get('form-action')).toEqual(["'none'"]);
	});

	it('allows no inline scripts without a hash, and no eval', () => {
		const sources = csp.get('script-src') ?? [];

		expect(sources).toContain("'self'");
		expect(sources).not.toContain("'unsafe-inline'");
		expect(sources).not.toContain("'unsafe-eval'");
	});

	// Astro puts the meta at the end of the <head>, so today the theme script runs before the
	// policy exists: the hash does not apply yet. It is required anyway so that, if the meta ends up
	// going first, the script keeps working.
	it('has the hash of every inline script that runs, and its text in LF', () => {
		const scripts = page
			.querySelectorAll('script')
			.filter(isExecutableInlineScript);
		const allowed = csp.get('script-src') ?? [];

		expect(scripts.length).toBeGreaterThan(0);
		for (const script of scripts) {
			expect(script.rawText).not.toContain('\r');
			expect(allowed).toContain(cspHash(script.rawText));
		}
	});

	// A meta only governs what comes after it. What precedes it is not watched, so exactly what
	// it is gets pinned down, so that it does not grow without someone deciding it.
	it('the only things before the meta, which does not govern them, are known static content', () => {
		const themeInit = readFileSync(
			new URL('../../src/scripts/theme-init.js', import.meta.url),
			'utf8',
		).replace(/\r\n?/g, '\n');
		const head = page.querySelector('head');
		const children = (head?.childNodes ?? []).filter(
			(node): node is HTMLElement => node instanceof HTMLElement,
		);
		const cspIndex = children.findIndex(
			(element) =>
				element.getAttribute('http-equiv') ===
				'content-security-policy',
		);

		expect(cspIndex).toBeGreaterThan(0);
		for (const element of children.slice(0, cspIndex)) {
			const tag = element.tagName.toLowerCase();
			const rel = element.getAttribute('rel');
			const known =
				tag === 'meta' ||
				tag === 'title' ||
				(tag === 'link' &&
					([
						'icon',
						'apple-touch-icon',
						'canonical',
						// The pages of the other languages (hreflang): links, not resources that get loaded.
						'alternate',
						'preload',
					].includes(rel ?? '') ||
						(rel === 'stylesheet' &&
							element.getAttribute('href') === '/theme.css'))) ||
				(tag === 'script' &&
					(element.getAttribute('type') === 'application/ld+json' ||
						element.rawText === themeInit));

			expect(known, `${tag} before the CSP meta`).toBe(true);
		}
	});

	it('has the hash of every inline <style>', () => {
		const allowed = csp.get('style-src-elem') ?? csp.get('style-src') ?? [];

		for (const style of page.querySelectorAll('style')) {
			expect(allowed).toContain(cspHash(style.rawText));
		}
	});

	it('only leaves style attributes inline, and only to rotate each sheet with --tilt', () => {
		expect(csp.get('style-src-attr')).toEqual(["'unsafe-inline'"]);

		for (const element of page.querySelectorAll('[style]')) {
			expect(element.getAttribute('style')).toMatch(
				/^--tilt: -?\d+(?:\.\d+)?deg$/,
			);
		}
	});

	it('has no inline event handlers (onclick…)', () => {
		for (const element of page.querySelectorAll('*')) {
			const handlers = Object.keys(element.attributes).filter((name) =>
				name.toLowerCase().startsWith('on'),
			);

			expect(handlers).toEqual([]);
		}
	});

	it('loads scripts, styles, fonts and images only from the site itself', () => {
		const resources = page.querySelectorAll(
			'script[src], img[src], link[href]:not([rel="canonical"]):not([rel="alternate"])',
		);

		for (const resource of resources) {
			const url =
				resource.getAttribute('src') ?? resource.getAttribute('href');

			expect(isExternal(url ?? '')).toBe(false);
		}
	});
});
