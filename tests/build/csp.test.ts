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

describe.each(PAGES)('CSP de %s', (path) => {
	const page = parsePage(path);
	const csp = cspOf(page);

	it('lo deniega todo salvo lo que se abre expresamente', () => {
		expect(csp.get('default-src')).toEqual(["'none'"]);
		expect(csp.get('object-src')).toEqual(["'none'"]);
		expect(csp.get('base-uri')).toEqual(["'none'"]);
		expect(csp.get('form-action')).toEqual(["'none'"]);
	});

	it('no admite scripts en línea sin hash ni eval', () => {
		const sources = csp.get('script-src') ?? [];

		expect(sources).toContain("'self'");
		expect(sources).not.toContain("'unsafe-inline'");
		expect(sources).not.toContain("'unsafe-eval'");
	});

	// Astro pone la meta al final del <head>, así que hoy el script del tema corre antes de que la
	// política exista: el hash no se aplica todavía. Se exige igualmente para que, si la meta pasa a
	// ir primero, el script siga funcionando.
	it('lleva el hash de cada script en línea que se ejecuta, y su texto en LF', () => {
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

	// Una meta solo gobierna lo que viene después de ella. Lo que la precede no se vigila, así que
	// se fija exactamente qué es, para que no crezca sin que alguien lo decida.
	it('lo único que va antes de la meta, que no lo gobierna, es contenido estático conocido', () => {
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
						'preload',
					].includes(rel ?? '') ||
						(rel === 'stylesheet' &&
							element.getAttribute('href') === '/theme.css'))) ||
				(tag === 'script' &&
					(element.getAttribute('type') === 'application/ld+json' ||
						element.rawText === themeInit));

			expect(known, `${tag} antes de la meta de la CSP`).toBe(true);
		}
	});

	it('lleva el hash de cada <style> en línea', () => {
		const allowed = csp.get('style-src-elem') ?? csp.get('style-src') ?? [];

		for (const style of page.querySelectorAll('style')) {
			expect(allowed).toContain(cspHash(style.rawText));
		}
	});

	it('solo deja en línea los atributos style, y solo para girar cada hoja con --tilt', () => {
		expect(csp.get('style-src-attr')).toEqual(["'unsafe-inline'"]);

		for (const element of page.querySelectorAll('[style]')) {
			expect(element.getAttribute('style')).toMatch(
				/^--tilt: -?\d+(?:\.\d+)?deg$/,
			);
		}
	});

	it('no tiene manejadores de eventos en línea (onclick…)', () => {
		for (const element of page.querySelectorAll('*')) {
			const handlers = Object.keys(element.attributes).filter((name) =>
				name.toLowerCase().startsWith('on'),
			);

			expect(handlers).toEqual([]);
		}
	});

	it('carga scripts, estilos, fuentes e imágenes solo del propio sitio', () => {
		const resources = page.querySelectorAll(
			'script[src], img[src], link[href]:not([rel="canonical"])',
		);

		for (const resource of resources) {
			const url =
				resource.getAttribute('src') ?? resource.getAttribute('href');

			expect(isExternal(url ?? '')).toBe(false);
		}
	});
});
