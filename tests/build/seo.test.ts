import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { LANGUAGES, localePath } from '../../src/lib/i18n';
import { OG_IMAGE, OG_LOCALES } from '../../src/lib/seo';
import { SITE, distHas, parsePage, readDist } from './support';

const meta = (
	page: ReturnType<typeof parsePage>,
	key: string,
): string | undefined =>
	page
		.querySelector(`meta[name="${key}"], meta[property="${key}"]`)
		?.getAttribute('content');

const distFile = (locale: (typeof LANGUAGES)[number]['locale']): string =>
	`${localePath(locale).replace(/^\//, '')}index.html`;

describe.each(LANGUAGES)('SEO of the $name page', ({ locale }) => {
	const page = parsePage(distFile(locale));

	it('declares its language and its own title and description', () => {
		expect(page.querySelector('html')?.getAttribute('lang')).toBe(locale);
		expect(page.querySelector('title')?.text).toMatch(/\S/);
		expect(meta(page, 'description')?.length).toBeGreaterThan(50);
		expect(meta(page, 'description')?.length).toBeLessThanOrEqual(160);
	});

	it('has its own canonical URL and not that of another language', () => {
		const canonicals = page.querySelectorAll('link[rel="canonical"]');

		expect(canonicals).toHaveLength(1);
		expect(canonicals[0]?.getAttribute('href')).toBe(
			`${SITE}${localePath(locale)}`,
		);
		expect(meta(page, 'og:url')).toBe(`${SITE}${localePath(locale)}`);
	});

	it('links to the same page in every language, itself included, and to the main one as x-default', () => {
		const alternates = page
			.querySelectorAll('link[rel="alternate"][hreflang]')
			.map(
				(link) =>
					[
						link.getAttribute('hreflang'),
						link.getAttribute('href'),
					] as const,
			);

		expect(alternates).toEqual([
			...LANGUAGES.map(
				(language) =>
					[
						language.locale,
						`${SITE}${localePath(language.locale)}`,
					] as const,
			),
			['x-default', `${SITE}/`],
		]);
	});

	it('tells social networks its language and offers the others', () => {
		expect(meta(page, 'og:locale')).toBe(OG_LOCALES[locale]);

		const others = page
			.querySelectorAll('meta[property="og:locale:alternate"]')
			.map((tag) => tag.getAttribute('content'));

		expect(others.sort()).toEqual(
			LANGUAGES.filter((language) => language.locale !== locale)
				.map((language) => OG_LOCALES[language.locale])
				.sort(),
		);
	});

	it('ships the language switch with the three links and its own one marked', () => {
		const links = page.querySelectorAll('[data-lang-switch] a');

		expect(links.map((link) => link.getAttribute('hreflang'))).toEqual(
			LANGUAGES.map((language) => language.locale),
		);
		expect(
			links
				.filter((link) => link.getAttribute('aria-current') === 'page')
				.map((link) => link.getAttribute('hreflang')),
		).toEqual([locale]);
	});
});

describe('SEO of the main page', () => {
	const page = parsePage('index.html');

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
		expect(node, `${type} node in the JSON-LD`).toBeDefined();

		return node;
	};

	it('declares the language, a title and a description of reasonable length', () => {
		expect(page.querySelector('html')?.getAttribute('lang')).toBe('es');
		expect(page.querySelector('title')?.text).toMatch(/\S/);
		expect(meta(page, 'description')?.length).toBeGreaterThan(50);
		expect(meta(page, 'description')?.length).toBeLessThanOrEqual(160);
	});

	it('has a single canonical URL, absolute and on the site itself', () => {
		const canonicals = page.querySelectorAll('link[rel="canonical"]');

		expect(canonicals).toHaveLength(1);
		expect(canonicals[0]?.getAttribute('href')).toBe(`${SITE}/`);
		expect(meta(page, 'og:url')).toBe(`${SITE}/`);
	});

	it('fills in Open Graph and Twitter with an absolute image that exists', () => {
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

	it('has a theme color for light mode and another for dark mode', () => {
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

	it('names the site after the person, so that the domain does not show', () => {
		const site = jsonLdNode('WebSite');
		const person = jsonLdNode('Person');

		expect(meta(page, 'og:site_name')).toBe(person.name);
		expect(site.name).toBe(person.name);
		expect(site.url).toBe(`${SITE}/`);
	});

	it('has valid structured data, with an image of the person that exists and no email or birth date', () => {
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

	it('does not publish the exact birth date anywhere in the HTML', () => {
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

describe('SEO of the 404 page', () => {
	const page = parsePage('404.html');

	it('asks not to be indexed and declares no canonical', () => {
		expect(meta(page, 'robots')).toBe('noindex');
		expect(page.querySelector('link[rel="canonical"]')).toBeNull();
	});

	it('has no sharing tags: it is not a page meant to be shared', () => {
		expect(
			page.querySelectorAll(
				'meta[property^="og:"], meta[name^="twitter:"]',
			),
		).toHaveLength(0);
	});
});

describe('crawling', () => {
	it('robots.txt allows the site and points to the sitemap', () => {
		const robots = readDist('robots.txt');

		expect(robots).toContain('User-agent: *');
		expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
		expect(distHas('sitemap-index.xml')).toBe(true);
	});

	it('the sitemap lists the page of each language and not the 404', () => {
		const index = readDist('sitemap-index.xml');
		const sitemap = readDist('sitemap-0.xml');

		expect(index).toContain(`${SITE}/sitemap-0.xml`);
		for (const { locale } of LANGUAGES) {
			expect(sitemap).toContain(
				`<loc>${SITE}${localePath(locale)}</loc>`,
			);
		}
		expect(sitemap).not.toContain('404');
	});

	it('the sitemap links each page to those of the other languages, with the same hreflang as the <head>', () => {
		const sitemap = readDist('sitemap-0.xml');

		for (const { locale } of LANGUAGES) {
			expect(sitemap).toContain(
				`<xhtml:link rel="alternate" hreflang="${locale}" href="${SITE}${localePath(locale)}"/>`,
			);
		}
	});
});

describe('theme', () => {
	it('theme.css has the day palette and the night palette', () => {
		const css = readDist('theme.css');

		expect(css).toContain("[data-theme='day']");
		expect(css).toContain("[data-theme='night']");
	});
});
