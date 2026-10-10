import { describe, expect, it } from 'vitest';
import { fill } from './text';

describe('fill', () => {
	it('replaces a placeholder with its value', () => {
		expect(fill('Hola {name}', { name: 'Ana' })).toBe('Hola Ana');
	});

	it('replaces every occurrence and several different placeholders', () => {
		expect(fill('{a} y {b}, otra vez {a}', { a: 'uno', b: 'dos' })).toBe(
			'uno y dos, otra vez uno',
		);
	});

	it('leaves unknown placeholders untouched so a missing value is visible', () => {
		expect(fill('Hola {name} {surname}', { name: 'Ana' })).toBe(
			'Hola Ana {surname}',
		);
	});

	it('treats special replacement patterns in the value literally', () => {
		expect(fill('Hola {name}', { name: 'Ana $& Lee $1' })).toBe(
			'Hola Ana $& Lee $1',
		);
	});

	it('returns the template as it is when it has no placeholders', () => {
		expect(fill('Sin variables', { name: 'Ana' })).toBe('Sin variables');
	});
});
