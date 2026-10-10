import { describe, expect, it } from 'vitest';
import { localize } from './i18n';

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
