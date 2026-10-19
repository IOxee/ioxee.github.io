import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { LOCALES } from './i18n';
import type { ExperienceEntry, Profile, Skill } from './schemas';
import {
	OG_IMAGE,
	OG_LOCALES,
	absoluteUrl,
	alternateOgLocales,
	languageAlternates,
	siteJsonLd,
	personSeoFrom,
	serializeJsonLd,
} from './seo';

const profile: Profile = {
	id: 'main',
	name: 'Nombre Apellido',
	headline: { es: 'Programador', en: 'Developer' },
	birthDate: '2000-01-31',
	nationality: { es: 'Española' },
	location: { es: 'Algún sitio' },
	occupation: { es: 'Cofundador' },
	about: { es: ['Texto.'] },
	links: {
		github: 'https://github.com/example',
		linkedin: 'https://linkedin.com/in/example/',
		email: 'correo@example.com',
		company: 'https://empresa.example/',
	},
	cv: '/cv.pdf',
};

const entry = (overrides: Partial<ExperienceEntry>): ExperienceEntry => ({
	id: 'entry',
	kind: 'work',
	organization: 'Empresa',
	role: { es: 'Rol' },
	summary: { es: 'Resumen' },
	start: '2020',
	end: null,
	...overrides,
});

const skill = (overrides: Partial<Skill>): Skill => ({
	id: 'skill',
	name: 'Habilidad',
	category: 'backend',
	since: 2020,
	state: 'daily',
	...overrides,
});

describe('personSeoFrom', () => {
	const seo = personSeoFrom({
		profile,
		experience: [
			entry({ id: 'a', organization: 'Empresa Actual' }),
			entry({ id: 'b', organization: 'Empresa Antigua', end: '2021' }),
			entry({ id: 'c', kind: 'education', organization: 'Instituto' }),
			entry({ id: 'd', organization: undefined }),
		],
		skills: [
			skill({ id: 'lua', name: 'Lua', state: 'daily' }),
			skill({ id: 'php', name: 'PHP', state: 'comfortable' }),
			skill({ id: 'java', name: 'Java', state: 'intermediate' }),
			skill({ id: 'py', name: 'Python', state: 'basic' }),
		],
		locale: 'es',
		url: 'https://example.com/',
		image: 'https://example.com/og.jpg',
	});

	it('takes the name, url and image as given, and the title in the page language', () => {
		expect(seo.name).toBe('Nombre Apellido');
		expect(seo.url).toBe('https://example.com/');
		expect(seo.image).toBe('https://example.com/og.jpg');
		expect(seo.jobTitle).toBe('Programador');
	});

	it('falls back to Spanish when the page language has no translation yet', () => {
		const catalan = personSeoFrom({
			profile,
			experience: [],
			skills: [],
			locale: 'ca',
			url: 'https://example.com/',
			image: 'https://example.com/og.jpg',
		});

		expect(catalan.jobTitle).toBe('Programador');
	});

	it('links the public profiles, and nothing else of the contact data', () => {
		expect(seo.sameAs).toEqual([
			'https://github.com/example',
			'https://linkedin.com/in/example/',
		]);
	});

	it('lists only the organizations where the person works now', () => {
		expect(seo.worksFor).toEqual(['Empresa Actual']);
	});

	it('lists only what the person uses daily or comfortably, not what they only know the basics of', () => {
		expect(seo.knowsAbout).toEqual(['Lua', 'PHP']);
	});
});

describe('OG_IMAGE', () => {
	it('describes the real file in public/, so the meta tags never lie about its size', async () => {
		const file = readFileSync(
			new URL(`../../public${OG_IMAGE.path}`, import.meta.url),
		);
		const { width, height, format } = await sharp(file).metadata();

		expect({ width, height }).toEqual({
			width: OG_IMAGE.width,
			height: OG_IMAGE.height,
		});
		expect(`image/${format}`).toBe(OG_IMAGE.type);
	});
});

describe('absoluteUrl', () => {
	it('resolves a site path against the origin of the site', () => {
		expect(absoluteUrl('/og.jpg', 'https://ioxee.github.io')).toBe(
			'https://ioxee.github.io/og.jpg',
		);
	});

	it('accepts the site as a URL object, which is what Astro.site is', () => {
		expect(absoluteUrl('/', new URL('https://ioxee.github.io'))).toBe(
			'https://ioxee.github.io/',
		);
	});

	it('fails with a clear message when the site is not configured', () => {
		expect(() => absoluteUrl('/og.jpg', undefined)).toThrow(/site/);
	});
});

describe('OG_LOCALES', () => {
	it('has an Open Graph locale for every supported locale', () => {
		expect(Object.keys(OG_LOCALES).sort()).toEqual([...LOCALES].sort());
		expect(OG_LOCALES.es).toBe('es_ES');
	});
});

describe('alternateOgLocales', () => {
	it('lists the Open Graph locale of every other language, never the page own one', () => {
		expect(alternateOgLocales('es')).toEqual(['en_US', 'ca_ES']);
		expect(alternateOgLocales('en')).toEqual(['es_ES', 'ca_ES']);
		expect(alternateOgLocales('ca')).toEqual(['es_ES', 'en_US']);
	});
});

describe('languageAlternates', () => {
	const site = 'https://ioxee.github.io';

	it('points to the page of every language, and x-default to the main one', () => {
		expect(languageAlternates(site)).toEqual([
			{ hreflang: 'es', href: 'https://ioxee.github.io/' },
			{ hreflang: 'en', href: 'https://ioxee.github.io/en/' },
			{ hreflang: 'ca', href: 'https://ioxee.github.io/ca/' },
			{ hreflang: 'x-default', href: 'https://ioxee.github.io/' },
		]);
	});

	it('accepts the site as a URL too, as Astro gives it', () => {
		expect(languageAlternates(new URL(site))[1]?.href).toBe(
			'https://ioxee.github.io/en/',
		);
	});

	it('refuses to build relative links when the site is not known', () => {
		expect(() => languageAlternates(undefined)).toThrow(/site/);
	});
});

describe('siteJsonLd', () => {
	const seoPerson = {
		name: 'Nombre Apellido',
		jobTitle: 'Programador',
		url: 'https://example.com/',
		image: 'https://example.com/avatar.webp',
		sameAs: ['https://github.com/example'],
		worksFor: ['Empresa Uno', 'Empresa Dos'],
		knowsAbout: ['Lua', 'C#'],
	};
	const graph = siteJsonLd(seoPerson, 'es');
	const nodeOf = (type: string) =>
		graph['@graph'].find((node) => node['@type'] === type);
	const person = nodeOf('Person') as ReturnType<typeof nodeOf> & {
		worksFor: unknown;
	};

	it('is one schema.org graph with the site and the person', () => {
		expect(graph['@context']).toBe('https://schema.org');
		expect(graph['@graph'].map((node) => node['@type']).sort()).toEqual([
			'Person',
			'WebSite',
		]);
	});

	it('names the site after the person, so a search engine shows that and not the host', () => {
		expect(nodeOf('WebSite')).toMatchObject({
			name: 'Nombre Apellido',
			url: 'https://example.com/',
			inLanguage: 'es',
		});
	});

	it('links the site to the person by @id', () => {
		expect(nodeOf('WebSite')).toMatchObject({
			publisher: { '@id': 'https://example.com/#person' },
		});
		expect(person).toMatchObject({ '@id': 'https://example.com/#person' });
	});

	it('describes the person with the public profile data', () => {
		expect(person).toMatchObject({
			name: 'Nombre Apellido',
			jobTitle: 'Programador',
			image: 'https://example.com/avatar.webp',
			sameAs: ['https://github.com/example'],
			knowsAbout: ['Lua', 'C#'],
		});
	});

	it('turns each employer into an Organization', () => {
		expect(person.worksFor).toEqual([
			{ '@type': 'Organization', name: 'Empresa Uno' },
			{ '@type': 'Organization', name: 'Empresa Dos' },
		]);
	});

	it('only carries what is public on the page, never contact or birth data', () => {
		expect(Object.keys(person ?? {}).sort()).toEqual([
			'@id',
			'@type',
			'image',
			'jobTitle',
			'knowsAbout',
			'name',
			'sameAs',
			'url',
			'worksFor',
		]);
	});
});

describe('serializeJsonLd', () => {
	const includesAny = (text: string, characters: readonly string[]) =>
		characters.some((character) => text.includes(character));

	it('escapes the characters that could close the script tag it is embedded in', () => {
		const text = '</script><script>alert(1)</script> & <!--';
		const serialized = serializeJsonLd({ text });

		expect(includesAny(serialized, ['<', '>', '&'])).toBe(false);
		expect(JSON.parse(serialized)).toEqual({ text });
	});

	it('escapes the line separators that break JavaScript parsers', () => {
		const text = 'a\u2028b\u2029c';
		const serialized = serializeJsonLd({ text });

		expect(includesAny(serialized, ['\u2028', '\u2029'])).toBe(false);
		expect(JSON.parse(serialized)).toEqual({ text });
	});
});
