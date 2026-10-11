import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { PAGES, distHas, isExternal, parsePage, readDist } from './support';

/** Servicios del sitio v1 que no deben volver: mapa, fuentes de iconos, jQuery y analítica de terceros. */
const LEGACY = [
	'maps.googleapis',
	'kit.fontawesome',
	'fontawesome',
	'jquery',
	'googletagmanager',
	'google-analytics',
];

describe.each(PAGES)('contenido de %s', (path) => {
	const page = parsePage(path);

	it('no arrastra nada del sitio v1', () => {
		const html = readDist(path).toLowerCase();

		for (const marker of LEGACY) {
			expect(html).not.toContain(marker);
		}
	});

	it('tiene un único h1', () => {
		expect(page.querySelectorAll('h1')).toHaveLength(1);
	});

	it('da a cada imagen texto alternativo y tamaño, para no mover la página al cargar', () => {
		for (const image of page.querySelectorAll('img')) {
			expect(image.getAttribute('alt')).toMatch(/\S/);
			expect(image.getAttribute('width')).toMatch(/^\d+$/);
			expect(image.getAttribute('height')).toMatch(/^\d+$/);
		}
	});

	it('solo enlaza por https, mailto, ancla o ruta del propio sitio', () => {
		for (const link of page.querySelectorAll('a[href]')) {
			const href = link.getAttribute('href') ?? '';

			expect(href).toMatch(/^(?:https:\/\/|mailto:|#|\/(?!\/))/);
		}
	});

	it('abre los enlaces externos en pestaña nueva solo con noopener', () => {
		for (const link of page.querySelectorAll('a[target="_blank"]')) {
			expect(link.getAttribute('rel')).toContain('noopener');
		}
	});

	it('todos los enlaces internos llevan a algo que existe', () => {
		const ids = new Set(page.querySelectorAll('[id]').map((el) => el.id));

		for (const link of page.querySelectorAll('a[href]')) {
			const href = link.getAttribute('href') ?? '';
			if (isExternal(href)) continue;

			if (href.startsWith('#')) {
				expect(ids, `ancla ${href}`).toContain(href.slice(1));
			} else {
				const file = href.replace(/^\//, '');
				const exists =
					file === '' ||
					distHas(file) ||
					distHas(`${file}/index.html`);

				expect(exists, `enlace ${href}`).toBe(true);
			}
		}
	});
});

describe('página principal', () => {
	const page = parsePage('index.html');

	it('mantiene los anclajes de la v1 para que los enlaces antiguos sigan funcionando', () => {
		const ids = new Set(page.querySelectorAll('[id]').map((el) => el.id));

		for (const anchor of [
			'home',
			'about-me',
			'resume',
			'portfolio',
			'contact',
		]) {
			expect(ids).toContain(anchor);
		}
	});

	it('enseña «Descargar CV» solo si el perfil declara un CV, y entonces el archivo existe', () => {
		const [profile] = parse(
			readFileSync(
				new URL('../../src/data/profile.yaml', import.meta.url),
				'utf8',
			),
		);
		const links = page.querySelectorAll('a.cv');

		expect(links).toHaveLength(profile.cv ? 1 : 0);
		for (const link of links) {
			expect(distHas(link.getAttribute('href') ?? '')).toBe(true);
		}
	});

	it('tiene el enlace para saltar al contenido', () => {
		const skip = page.querySelector('a.skip-link');

		expect(skip?.getAttribute('href')).toBe('#contenido');
		expect(page.querySelector('#contenido')).not.toBeNull();
	});
});
