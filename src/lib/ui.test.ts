import { describe, expect, it } from 'vitest';
import { categoryLabel, dictionaries, formatYears, t, translate } from './ui';

const placeholders = (text: string): string[] =>
	[...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

describe('dictionaries', () => {
	const keys = Object.keys(
		dictionaries.es,
	) as (keyof typeof dictionaries.es)[];

	it.each(['en', 'ca'] as const)(
		'translates every interface text into %s, so the page does not mix languages',
		(locale) => {
			const missing = keys.filter(
				(key) => dictionaries[locale]?.[key] === undefined,
			);

			expect(missing).toEqual([]);
		},
	);

	it.each(['en', 'ca'] as const)(
		'keeps the same {placeholders} in the %s text as in the Spanish one',
		(locale) => {
			for (const key of keys) {
				const translated = dictionaries[locale]?.[key] ?? '';

				expect(placeholders(translated), key).toEqual(
					placeholders(dictionaries.es[key]),
				);
			}
		},
	);

	it.each(['en', 'ca'] as const)(
		'does not leave an empty %s text',
		(locale) => {
			for (const key of keys) {
				expect(dictionaries[locale]?.[key]?.trim(), key).not.toBe('');
			}
		},
	);

	it('names the document viewer buttons in the three languages, and the frame after the certificate', () => {
		expect(t('es', 'viewer.close')).toBe('Cerrar');
		expect(t('en', 'viewer.close')).toBe('Close');
		expect(t('ca', 'viewer.close')).toBe('Tanca');
		for (const locale of ['es', 'en', 'ca'] as const) {
			expect(t(locale, 'viewer.frameTitle')).toContain('{name}');
			expect(t(locale, 'viewer.newTab')).toMatch(/\S/);
		}
	});

	it('names the language selector in the three languages', () => {
		expect(t('es', 'lang.label')).toBe('Idioma');
		expect(t('en', 'lang.label')).toBe('Language');
		expect(t('ca', 'lang.label')).toBe('Idioma');
	});

	it('keeps the text a link shows inside the label it is read with', () => {
		// The accessible name of a link has to contain what is visible (WCAG 2.5.3).
		const pairs = [
			['cert.verify', 'cert.verifyLabel'],
			['cert.document', 'cert.documentLabel'],
			['project.document', 'project.documentLabel'],
			['mission.repo', 'mission.repoLabel'],
		] as const;

		for (const locale of ['es', 'en', 'ca'] as const) {
			for (const [visible, label] of pairs) {
				expect(t(locale, label), `${locale} ${label}`).toContain(
					t(locale, visible),
				);
			}
		}
	});
});

describe('translate', () => {
	const dictionaries = {
		es: { hello: 'Hola', bye: 'Adiós' },
		ca: { hello: 'Hola!' },
	};

	it('returns the text in the requested locale', () => {
		expect(translate(dictionaries, 'ca', 'hello')).toBe('Hola!');
	});

	it('falls back to Spanish when the locale has no entry for the key', () => {
		expect(translate(dictionaries, 'ca', 'bye')).toBe('Adiós');
	});

	it('falls back to Spanish when the locale has no dictionary at all', () => {
		expect(translate(dictionaries, 'en', 'hello')).toBe('Hola');
	});
});

describe('t', () => {
	it('returns the Spanish interface texts', () => {
		expect(t('es', 'period.present')).toBe('Actualidad');
		expect(t('es', 'skill.state.daily')).toBe('Uso diario');
	});

	it('keeps the {name} placeholder in every text that is filled with a name', () => {
		const keys = [
			'meta.title',
			'meta.description',
			'card.photoAlt',
			'mission.repoLabel',
			'cert.verifyLabel',
			'cert.imageAlt',
			'cert.imageLabel',
			'cert.documentLabel',
			'project.documentLabel',
		] as const;

		for (const key of keys) {
			expect(t('es', key), key).toContain('{name}');
		}
	});

	it('names the four skill states', () => {
		expect(t('es', 'skill.state.comfortable')).toBe('Con soltura');
		expect(t('es', 'skill.state.intermediate')).toBe('Intermedio');
		expect(t('es', 'skill.state.basic')).toBe('Básico');
	});
});

describe('categoryLabel', () => {
	it('uses the translation when the category has one', () => {
		expect(categoryLabel('es', 'data')).toBe('Datos');
		expect(categoryLabel('en', 'desktop')).toBe('Desktop');
	});

	it('shows the id as words when the category has no translation', () => {
		expect(categoryLabel('es', 'game-dev')).toBe('Game dev');
		expect(categoryLabel('en', 'devops')).toBe('Devops');
	});
});

describe('formatYears', () => {
	it.each([
		['es', 0, 'menos de 1 año'],
		['es', 1, '1 año'],
		['es', 8, '8 años'],
		['ca', 0, "menys d'1 any"],
		['ca', 1, '1 any'],
		['ca', 8, '8 anys'],
		['en', 0, 'less than 1 year'],
		['en', 1, '1 year'],
		['en', 8, '8 years'],
	] as const)('formats %s with %i years as %j', (locale, years, expected) => {
		expect(formatYears(years, locale)).toBe(expected);
	});

	it.each([-1, 1.5, Number.NaN])('rejects %j', (years) => {
		expect(() => formatYears(years, 'es')).toThrow(RangeError);
	});
});
