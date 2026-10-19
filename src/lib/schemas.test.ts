import type { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import {
	certificationSchema,
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
	imageAlt: { es: 'Captura de la portada' },
	repo: 'https://github.com/example/demo',
	start: '2024-01',
	end: '2024-03',
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

const language = {
	id: 'ca',
	name: { es: 'Catalán' },
	level: 'native',
	order: 1,
};

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

	it.each(['daily', 'comfortable', 'intermediate', 'basic'])(
		'accepts the state %s',
		(state) => {
			expect(accepts(skillSchema, { ...skill, state })).toBe(true);
		},
	);

	it('rejects the retired "learning" state', () => {
		expect(accepts(skillSchema, { ...skill, state: 'learning' })).toBe(
			false,
		);
	});

	it('accepts any kebab-case category', () => {
		for (const category of ['games', 'game-dev', 'devops2']) {
			expect(accepts(skillSchema, { ...skill, category })).toBe(true);
		}
	});

	it('rejects a malformed category or an unknown state', () => {
		for (const category of ['', 'Game Dev', 'game_dev']) {
			expect(accepts(skillSchema, { ...skill, category })).toBe(false);
		}
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

	it('requires when it started, which is what orders the projects', () => {
		expect(accepts(projectSchema, { ...project, start: undefined })).toBe(
			false,
		);
	});

	it('takes `end: null` for a project still under way', () => {
		expect(accepts(projectSchema, { ...project, end: null })).toBe(true);
	});

	it.each(['marzo 2024', '2024-13', '24-03'])(
		'rejects the date %j',
		(start) => {
			expect(accepts(projectSchema, { ...project, start })).toBe(false);
		},
	);

	it('rejects an end before the start', () => {
		expect(
			accepts(projectSchema, {
				...project,
				start: '2024-05',
				end: '2024-03',
			}),
		).toBe(false);
	});

	it('accepts the details of a project that takes a second page: the challenge, its points and a closing line', () => {
		const details = {
			intro: { es: 'El reto era…' },
			points: { es: ['Uno', 'Dos'] },
			closing: { es: 'Incluye…' },
		};

		expect(accepts(projectSchema, { ...project, details })).toBe(true);
		expect(
			accepts(projectSchema, {
				...project,
				details: { ...details, closing: undefined },
			}),
		).toBe(true);
	});

	it('rejects details without points, which would leave the second page empty', () => {
		expect(
			accepts(projectSchema, {
				...project,
				details: { intro: { es: 'El reto era…' }, points: { es: [] } },
			}),
		).toBe(false);
	});

	it.each([undefined, { es: '' }, { en: 'Screenshot' }])(
		'requires the alt text of the screenshot, in Spanish (%j)',
		(imageAlt) => {
			expect(accepts(projectSchema, { ...project, imageAlt })).toBe(
				false,
			);
		},
	);

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

const certification = {
	id: 'curso-demo',
	name: 'Curso de demostración',
	issuer: 'Plataforma Ejemplo',
	issued: '2023-05',
	order: 1,
};

describe('certificationSchema', () => {
	it('accepts a certification with only what is required', () => {
		expect(accepts(certificationSchema, certification)).toBe(true);
	});

	it('accepts the optional expiry, verification link and summary', () => {
		expect(
			accepts(certificationSchema, {
				...certification,
				expires: '2026-05',
				url: 'https://example.com/verify/123',
				summary: { es: 'Qué cubre.' },
			}),
		).toBe(true);
	});

	it('keeps the optional alternative text of its photo, in the languages it is given', () => {
		const parsed = certificationSchema.parse({
			...certification,
			imageAlt: {
				es: 'Diploma con el sello de la academia',
				en: 'Diploma',
			},
		});

		expect(parsed.imageAlt).toEqual({
			es: 'Diploma con el sello de la academia',
			en: 'Diploma',
		});
		expect(
			certificationSchema.parse(certification).imageAlt,
		).toBeUndefined();
	});

	it.each([{ es: '' }, { es: '   ' }, { ca: 'Sense castellà' }])(
		'rejects the alternative text %j: it needs Spanish and cannot be empty',
		(imageAlt) => {
			expect(
				accepts(certificationSchema, { ...certification, imageAlt }),
			).toBe(false);
		},
	);

	it.each(['name', 'issuer', 'issued', 'order'])(
		'rejects a certification without %s',
		(field) => {
			expect(
				accepts(certificationSchema, {
					...certification,
					[field]: undefined,
				}),
			).toBe(false);
		},
	);

	it.each(['', '   '])('rejects the empty issuer %j', (issuer) => {
		expect(accepts(certificationSchema, { ...certification, issuer })).toBe(
			false,
		);
	});

	it.each(['2022-13', 'ayer', '22', '2022-3'])(
		'rejects the issue date %j',
		(issued) => {
			expect(
				accepts(certificationSchema, { ...certification, issued }),
			).toBe(false);
		},
	);

	it('rejects an expiry before the issue date', () => {
		expect(
			accepts(certificationSchema, {
				...certification,
				issued: '2023-05',
				expires: '2023-04',
			}),
		).toBe(false);
	});

	it('accepts an expiry in the same month or in the same year, which closes in December', () => {
		expect(
			accepts(certificationSchema, {
				...certification,
				issued: '2023-05',
				expires: '2023-05',
			}),
		).toBe(true);
		expect(
			accepts(certificationSchema, {
				...certification,
				issued: '2023-05',
				expires: '2023',
			}),
		).toBe(true);
	});

	it('does not throw while reporting a badly formed date next to a valid one', () => {
		for (const dates of [
			{ issued: 'ayer', expires: '2024' },
			{ issued: '2023-05', expires: 'mañana' },
		]) {
			expect(() =>
				certificationSchema.safeParse({ ...certification, ...dates }),
			).not.toThrow();
			expect(
				accepts(certificationSchema, { ...certification, ...dates }),
			).toBe(false);
		}
	});

	it.each([
		'javascript:alert(1)',
		'http://example.com/verify',
		'//example.com/verify',
		'not a url',
		// An https page takes them as paths on the site itself, not as another website.
		'https:example.com/verify',
		'https:/example.com/verify',
		// Username and password in the link: they show in the address bar and mislead about which site you are going to.
		'https://user:pass@example.com/verify',
	])(
		'rejects the verification link %j, which is not an https address',
		(url) => {
			expect(
				accepts(certificationSchema, { ...certification, url }),
			).toBe(false);
		},
	);

	it('trims the spaces around the verification link, so the link it renders is clean', () => {
		const parsed = certificationSchema.parse({
			...certification,
			url: ' https://example.com/verify ',
		});

		expect(parsed.url).toBe('https://example.com/verify');
	});

	it.each([0, -1, 1.5])('rejects the order %j', (order) => {
		expect(accepts(certificationSchema, { ...certification, order })).toBe(
			false,
		);
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

	it.each([
		'cv.pdf',
		'//evil.example/cv.pdf',
		'/\\evil.example/cv.pdf',
		'https://evil.example/cv.pdf',
	])('rejects the CV path %j, which is not a path inside this site', (cv) => {
		expect(accepts(profileSchema, { ...profile, cv })).toBe(false);
	});

	it('accepts an absolute path inside the site as the CV', () => {
		expect(
			accepts(profileSchema, {
				...profile,
				cv: '/assets/documents/cv.pdf',
			}),
		).toBe(true);
	});

	it('accepts a profile without a CV, so the download link can be left out', () => {
		const { cv: _cv, ...withoutCv } = profile;

		expect(accepts(profileSchema, withoutCv)).toBe(true);
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

	it.each([0, -1, 1.5, '1'])('rejects the display order %j', (order) => {
		expect(accepts(languageSchema, { ...language, order })).toBe(false);
	});

	it('requires a display order', () => {
		expect(accepts(languageSchema, { ...language, order: undefined })).toBe(
			false,
		);
	});

	it('rejects an unknown level', () => {
		expect(accepts(languageSchema, { ...language, level: 'fluent' })).toBe(
			false,
		);
	});
});
