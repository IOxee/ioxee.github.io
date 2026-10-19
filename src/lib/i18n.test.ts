import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LOCALE,
	LANGUAGES,
	LOCALES,
	localePath,
	localize,
} from './i18n';

describe('LANGUAGES', () => {
	it('offers every language the site has, once each', () => {
		expect(LANGUAGES.map((language) => language.locale).sort()).toEqual(
			[...LOCALES].sort(),
		);
	});

	it('puts Spanish first, as the main language, then English and Catalan', () => {
		expect(LANGUAGES.map((language) => language.locale)).toEqual([
			'es',
			'en',
			'ca',
		]);
		expect(LANGUAGES[0]?.locale).toBe(DEFAULT_LOCALE);
	});

	it('names each language in itself, so anyone can find theirs', () => {
		expect(LANGUAGES.map((language) => language.name)).toEqual([
			'Español',
			'English',
			'Català',
		]);
	});

	it('gives each language a short label that its full name contains, as accessibility asks', () => {
		for (const { label, name } of LANGUAGES) {
			expect(name.toLowerCase()).toContain(label.toLowerCase());
		}
	});
});

describe('localePath', () => {
	it('keeps the main language at the root, with no prefix', () => {
		expect(localePath('es')).toBe('/');
	});

	it('puts the others under their own prefix', () => {
		expect(localePath('en')).toBe('/en/');
		expect(localePath('ca')).toBe('/ca/');
	});
});

describe('localize', () => {
	it('returns the text in the requested locale when it exists', () => {
		const text = { es: 'Hola', ca: 'Hola!', en: 'Hello' };

		expect(localize(text, 'en')).toBe('Hello');
		expect(localize(text, 'ca')).toBe('Hola!');
	});

	it('falls back to the default locale when the translation is missing', () => {
		const text = { es: 'Programador' };

		expect(localize(text, 'ca')).toBe('Programador');
		expect(localize(text, 'en')).toBe('Programador');
	});

	it('works with non-string values such as paragraph lists', () => {
		const text = { es: ['uno', 'dos'], en: ['one'] };

		expect(localize(text, 'en')).toEqual(['one']);
		expect(localize(text, 'ca')).toEqual(['uno', 'dos']);
	});
});
