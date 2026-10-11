import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { OG_IMAGE } from '../../src/lib/seo';
import { SITE, distHas, parsePage, readDist } from './support';

const meta = (
	page: ReturnType<typeof parsePage>,
	key: string,
): string | undefined =>
	page
		.querySelector(`meta[name="${key}"], meta[property="${key}"]`)
		?.getAttribute('content');

describe('SEO de la página principal', () => {
	const page = parsePage('index.html');

	/** Un nodo del grafo JSON-LD de la página. */
	const jsonLdNode = (type: string) => {
		const blocks = page.querySelectorAll(
			'script[type="application/ld+json"]',
		);
		expect(blocks).toHaveLength(1);

		const data = JSON.parse(blocks[0]?.rawText ?? '');
		expect(data['@context']).toBe('https://schema.org');

		const node = data['@graph'].find(
			(item: { '@type': string }) => item['@type'] === type,
		);
		expect(node, `nodo ${type} en el JSON-LD`).toBeDefined();

		return node;
	};

	it('declara el idioma, un título y una descripción de longitud razonable', () => {
		expect(page.querySelector('html')?.getAttribute('lang')).toBe('es');
		expect(page.querySelector('title')?.text).toMatch(/\S/);
		expect(meta(page, 'description')?.length).toBeGreaterThan(50);
		expect(meta(page, 'description')?.length).toBeLessThanOrEqual(160);
	});

	it('tiene una única URL canónica, absoluta y del propio sitio', () => {
		const canonicals = page.querySelectorAll('link[rel="canonical"]');

		expect(canonicals).toHaveLength(1);
		expect(canonicals[0]?.getAttribute('href')).toBe(`${SITE}/`);
		expect(meta(page, 'og:url')).toBe(`${SITE}/`);
	});

	it('completa Open Graph y Twitter con una imagen absoluta que existe', () => {
		const image = `${SITE}${OG_IMAGE.path}`;

		expect(meta(page, 'og:type')).toBe('website');
		expect(meta(page, 'og:locale')).toBe('es_ES');
		expect(meta(page, 'og:image')).toBe(image);
		expect(meta(page, 'og:image:width')).toBe(String(OG_IMAGE.width));
		expect(meta(page, 'og:image:height')).toBe(String(OG_IMAGE.height));
		expect(meta(page, 'og:image:alt')).toMatch(/\S/);
		expect(meta(page, 'twitter:card')).toBe('summary_large_image');
		expect(meta(page, 'twitter:image')).toBe(image);
		expect(meta(page, 'og:title')).toBe(page.querySelector('title')?.text);
		expect(distHas(OG_IMAGE.path)).toBe(true);
	});

	it('tiene un color de tema para el modo claro y otro para el oscuro', () => {
		const colors = page.querySelectorAll('meta[name="theme-color"]');

		expect(
			colors.map((color) => color.getAttribute('media')).sort(),
		).toEqual([
			'(prefers-color-scheme: dark)',
			'(prefers-color-scheme: light)',
		]);
		for (const color of colors) {
			expect(color.getAttribute('content')).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('nombra el sitio con el de la persona, para que no salga el dominio', () => {
		const site = jsonLdNode('WebSite');
		const person = jsonLdNode('Person');

		expect(meta(page, 'og:site_name')).toBe(person.name);
		expect(site.name).toBe(person.name);
		expect(site.url).toBe(`${SITE}/`);
	});

	it('lleva datos estructurados válidos, con una imagen de la persona que existe y sin correo ni fecha de nacimiento', () => {
		const person = jsonLdNode('Person');

		expect(person['@id']).toBe(`${SITE}/#person`);
		expect(jsonLdNode('WebSite').publisher).toEqual({
			'@id': person['@id'],
		});
		expect(person.url).toBe(`${SITE}/`);
		expect(person.sameAs).toEqual(
			expect.arrayContaining([expect.stringMatching(/^https:\/\//)]),
		);
		expect(person.image).toMatch(new RegExp(`^${SITE}/_astro/`));
		expect(distHas(new URL(person.image).pathname)).toBe(true);
		expect(Object.keys(person)).not.toContain('birthDate');
		expect(Object.keys(person)).not.toContain('email');
	});

	it('no publica la fecha de nacimiento exacta en ningún punto del HTML', () => {
		const [profile] = parse(
			readFileSync(
				new URL('../../src/data/profile.yaml', import.meta.url),
				'utf8',
			),
		);
		const birthDate = String(profile.birthDate);

		expect(birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(readDist('index.html')).not.toContain(birthDate);
	});
});

describe('SEO de la página 404', () => {
	const page = parsePage('404.html');

	it('pide que no se indexe y no declara canónica', () => {
		expect(meta(page, 'robots')).toBe('noindex');
		expect(page.querySelector('link[rel="canonical"]')).toBeNull();
	});

	it('no tiene etiquetas para compartir: no es una página que se comparta', () => {
		expect(
			page.querySelectorAll(
				'meta[property^="og:"], meta[name^="twitter:"]',
			),
		).toHaveLength(0);
	});
});

describe('rastreo', () => {
	it('robots.txt permite el sitio y apunta al sitemap', () => {
		const robots = readDist('robots.txt');

		expect(robots).toContain('User-agent: *');
		expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
		expect(distHas('sitemap-index.xml')).toBe(true);
	});

	it('el sitemap lista la página principal y no la 404', () => {
		const index = readDist('sitemap-index.xml');
		const sitemap = readDist('sitemap-0.xml');

		expect(index).toContain(`${SITE}/sitemap-0.xml`);
		expect(sitemap).toContain(`<loc>${SITE}/</loc>`);
		expect(sitemap).not.toContain('404');
	});
});

describe('tema', () => {
	it('theme.css lleva la paleta de día y la de noche', () => {
		const css = readDist('theme.css');

		expect(css).toContain("[data-theme='day']");
		expect(css).toContain("[data-theme='night']");
	});
});
