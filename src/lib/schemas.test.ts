import type { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import {
	experienceSchema,
	languageSchema,
	profileSchema,
	projectSchema,
	skillSchema,
} from './schemas';

const accepts = (schema: z.ZodType, value: unknown): boolean =>
	schema.safeParse(value).success;

const skill = {
	id: 'lua',
	name: 'Lua',
	category: 'backend',
	since: 2018,
	state: 'daily',
};

const experience = {
	id: 'job',
	kind: 'work',
	role: { es: 'Rol' },
	summary: { es: 'Resumen' },
	start: '2022',
	end: null,
};

const project = {
	id: 'demo',
	name: 'Demo',
	summary: { es: 'Resumen' },
	stack: ['TypeScript'],
	repo: 'https://github.com/example/demo',
};

const profile = {
	id: 'main',
	name: 'Nombre Apellido',
	headline: { es: 'Programador' },
	birthDate: '1990-04-14',
	nationality: { es: 'Española' },
	location: { es: 'Barcelona' },
	occupation: { es: 'Desarrollador' },
	about: { es: ['Un párrafo'] },
	links: {
		github: 'https://github.com/example',
		linkedin: 'https://linkedin.com/in/example',
		email: 'alguien@example.com',
	},
	cv: '/cv.pdf',
};

const language = { id: 'ca', name: { es: 'Catalán' }, level: 'native' };

describe('skillSchema', () => {
	it('accepts a valid skill', () => {
		expect(accepts(skillSchema, skill)).toBe(true);
	});

	it.each([true, false])('accepts provisional: %s', (provisional) => {
		expect(accepts(skillSchema, { ...skill, provisional })).toBe(true);
	});

	it('rejects a provisional flag that is not a boolean', () => {
		expect(accepts(skillSchema, { ...skill, provisional: 'yes' })).toBe(
			false,
		);
	});

	it.each(['Lua', 'c#', 'a_b', '-x', 'x-', ''])('rejects the id %j', (id) => {
		expect(accepts(skillSchema, { ...skill, id })).toBe(false);
	});

	it.each([1989, 2018.5, '2018'])('rejects the start year %j', (since) => {
		expect(accepts(skillSchema, { ...skill, since })).toBe(false);
	});

	it('rejects an unknown category or state', () => {
		expect(accepts(skillSchema, { ...skill, category: 'games' })).toBe(
			false,
		);
		expect(accepts(skillSchema, { ...skill, state: 'expert' })).toBe(false);
	});
});

describe('experienceSchema', () => {
	it('accepts an ongoing entry without an organization', () => {
		expect(accepts(experienceSchema, experience)).toBe(true);
	});

	it('accepts a bare-year end that falls after a dated start in the same year', () => {
		const entry = { ...experience, start: '2022-02', end: '2022' };

		expect(accepts(experienceSchema, entry)).toBe(true);
	});

	it('accepts a period that starts and ends on the same date', () => {
		expect(
			accepts(experienceSchema, {
				...experience,
				start: '2020',
				end: '2020',
			}),
		).toBe(true);
	});

	it.each([
		['2023', '2022'],
		['2022-05', '2022-02'],
	])('rejects an end before the start (%s → %s)', (start, end) => {
		expect(accepts(experienceSchema, { ...experience, start, end })).toBe(
			false,
		);
	});

	it('reports a malformed date as a validation error instead of throwing', () => {
		const entry = { ...experience, start: '2022-13', end: '2023' };

		expect(() => experienceSchema.safeParse(entry)).not.toThrow();
		expect(accepts(experienceSchema, entry)).toBe(false);
	});

	it.each(['2022-13', '22', '2022-7'])(
		'rejects the start date %j',
		(start) => {
			expect(accepts(experienceSchema, { ...experience, start })).toBe(
				false,
			);
		},
	);

	it('requires a Spanish role', () => {
		expect(
			accepts(experienceSchema, { ...experience, role: { en: 'Role' } }),
		).toBe(false);
	});
});

describe('projectSchema', () => {
	it('accepts a valid project', () => {
		expect(accepts(projectSchema, project)).toBe(true);
	});

	it('rejects an empty stack', () => {
		expect(accepts(projectSchema, { ...project, stack: [] })).toBe(false);
	});

	it.each([
		'http://github.com/example/demo',
		'javascript:alert(1)',
		'file:///etc/passwd',
		'ftp://example.com/demo',
	])('rejects the repository URL %j', (repo) => {
		expect(accepts(projectSchema, { ...project, repo })).toBe(false);
	});
});

describe('profileSchema', () => {
	it('accepts a valid profile, with or without a company link', () => {
		const withCompany = {
			...profile,
			links: { ...profile.links, company: 'https://example.com/' },
		};

		expect(accepts(profileSchema, profile)).toBe(true);
		expect(accepts(profileSchema, withCompany)).toBe(true);
	});

	it.each(['2003-02-29', '1990-13-01', '1990/04/14', ''])(
		'rejects the birth date %j',
		(birthDate) => {
			expect(accepts(profileSchema, { ...profile, birthDate })).toBe(
				false,
			);
		},
	);

	it('rejects a CV path that is not absolute', () => {
		expect(accepts(profileSchema, { ...profile, cv: 'cv.pdf' })).toBe(
			false,
		);
	});

	it('rejects an invalid email', () => {
		const links = { ...profile.links, email: 'no-es-un-email' };

		expect(accepts(profileSchema, { ...profile, links })).toBe(false);
	});

	it.each(['javascript:alert(1)', 'http://github.com/example'])(
		'rejects the link %j, because links become hrefs',
		(github) => {
			const links = { ...profile.links, github };

			expect(accepts(profileSchema, { ...profile, links })).toBe(false);
		},
	);

	it('requires Spanish text, the fallback locale', () => {
		expect(
			accepts(profileSchema, { ...profile, headline: { en: 'Dev' } }),
		).toBe(false);
		expect(accepts(profileSchema, { ...profile, about: { es: [] } })).toBe(
			false,
		);
	});

	it('rejects whitespace-only text', () => {
		expect(accepts(profileSchema, { ...profile, name: '   ' })).toBe(false);
	});
});

describe('languageSchema', () => {
	it('accepts a valid language', () => {
		expect(accepts(languageSchema, language)).toBe(true);
	});

	it('rejects an unknown level', () => {
		expect(accepts(languageSchema, { ...language, level: 'fluent' })).toBe(
			false,
		);
	});
});
