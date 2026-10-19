import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SECTION_IDS } from '../../src/lib/sections';
import { PAGES, distHas, isExternal, parsePage, readDist } from './support';

/** V1 site services that must not come back: map, icon fonts, jQuery and third-party analytics. */
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

	it('si hay enlaces al visor de documentos, la página trae el visor y los enlaces funcionan sin él', () => {
		const links = page.querySelectorAll('a[data-viewer]');
		if (links.length === 0) {
			expect(
				page.querySelectorAll('dialog[data-viewer-dialog]'),
			).toHaveLength(0);

			return;
		}

		expect(
			page.querySelectorAll('dialog[data-viewer-dialog]'),
		).toHaveLength(1);
		// Closed, the dialog contains no link: one without `href` would look like a broken link (Lighthouse and search engines).
		expect(
			page.querySelectorAll('dialog[data-viewer-dialog] a'),
		).toHaveLength(0);
		for (const link of links) {
			expect(link.getAttribute('href')).toMatch(
				/^\/_astro\/.+\.(webp|pdf)$/,
			);
			expect(link.getAttribute('target')).toBe('_blank');
			expect(link.getAttribute('data-viewer-title')).toMatch(/\S/);
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

describe('la carpeta de la página principal', () => {
	const page = parsePage('index.html');
	const folder = page.querySelector('[data-folder]');
	const pages = page.querySelectorAll('[data-page]');
	const leaves = page.querySelectorAll('[data-leaf]');
	const order = Object.values(SECTION_IDS) as string[];

	it('es una sola carpeta, sin botones a la vista ni texto de estado: se maneja con el scroll, el teclado y el menú', () => {
		expect(page.querySelectorAll('[data-folder]')).toHaveLength(1);
		const buttons = folder?.querySelectorAll('button') ?? [];
		expect(
			buttons.map((button) => button.getAttribute('data-turn')),
		).toEqual(['prev', 'next']);
		for (const button of buttons) {
			expect(button.classList.contains('visually-hidden')).toBe(true);
			expect(button.getAttribute('tabindex')).toBe('-1');
		}
		expect(page.querySelector('[data-status]')).toBeNull();
	});

	it('empieza por la portada, que es el inicio (#home) y se llama como el único h1', () => {
		const [cover] = pages;

		expect(cover?.getAttribute('data-kind')).toBe('cover');
		expect(cover?.id).toBe('home');
		// The h1 lives outside the sheets so the page has a title whichever sheet is in view.
		expect(
			page.getElementById(cover?.getAttribute('aria-labelledby') ?? '')
				?.tagName,
		).toBe('H1');
		expect(cover?.querySelectorAll('h1')).toHaveLength(0);
	});

	it('pone las páginas en el orden de las secciones, sin volver atrás', () => {
		const positions = pages.map((element) =>
			order.indexOf(element.getAttribute('data-section') ?? ''),
		);

		expect(positions.every((position) => position >= 0)).toBe(true);
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	it('reparte las páginas en hojas de doble cara: la portada sola y luego de dos en dos', () => {
		// The cover alone and, after it, one sheet for every two pages: no page is left out or repeated.
		expect(leaves).toHaveLength(1 + Math.ceil((pages.length - 1) / 2));
		expect(
			leaves.reduce(
				(sum, leaf) =>
					sum + leaf.querySelectorAll('[data-page]').length,
				0,
			),
		).toBe(pages.length);

		leaves.forEach((leaf, index) => {
			const faces = leaf.querySelectorAll('[data-page]');
			const blank = leaf.querySelectorAll('.page--blank');

			expect(faces.length + blank.length).toBe(2);
			expect(faces[0]?.classList.contains('page--front')).toBe(true);
			if (faces[1])
				expect(faces[1].classList.contains('page--back')).toBe(true);
			if (index === 0) expect(faces).toHaveLength(1);
		});
	});

	it('da nombre a cada página con un encabezado que existe y dice algo', () => {
		for (const element of pages) {
			const id = element.getAttribute('aria-labelledby') ?? '';
			const heading = page.getElementById(id);

			expect(
				heading,
				`página ${element.getAttribute('data-title')}`,
			).not.toBeNull();
			expect(heading?.textContent.trim()).not.toBe('');
		}
	});

	it('tiene una pestaña por sección con páginas, que lleva a la primera página de esa sección', () => {
		const tabs = page.querySelectorAll('[data-site-nav] a');
		const sections = new Set(
			pages
				.map((element) => element.getAttribute('data-section') ?? '')
				.filter((section) => section !== 'home'),
		);

		expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual(
			[...sections].map((section) => `#${section}`),
		);
		for (const section of sections) {
			const first = pages.find(
				(element) => element.getAttribute('data-section') === section,
			);

			expect(first?.id).toBe(section);
		}
	});
});
