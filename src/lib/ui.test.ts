import { describe, expect, it } from 'vitest';
import { formatYears, t, translate } from './ui';

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
