import { describe, expect, it } from 'vitest';
import { displayUrl } from './url';

describe('displayUrl', () => {
	it.each([
		['https://github.com/IOxee', 'github.com/IOxee'],
		['https://linkedin.com/in/ioxee/', 'linkedin.com/in/ioxee'],
		['https://fractalgamestudios.es/', 'fractalgamestudios.es'],
		['https://www.example.com/', 'example.com'],
		['https://example.com/path?utm=1#section', 'example.com/path'],
	])('shortens %s to %s', (url, expected) => {
		expect(displayUrl(url)).toBe(expected);
	});

	it('rejects text that is not a URL', () => {
		expect(() => displayUrl('no es una url')).toThrow(TypeError);
	});
});
