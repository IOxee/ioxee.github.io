import { describe, expect, it } from 'vitest';
import { contrastRatio, oklchToHex, parseOklch } from './color';

describe('parseOklch', () => {
	it('reads a percentage lightness', () => {
		expect(parseOklch('oklch(87% 0.07 88)')).toEqual({
			l: 0.87,
			c: 0.07,
			h: 88,
		});
	});

	it('reads a unit lightness', () => {
		expect(parseOklch('oklch(0.87 0.07 88)')).toEqual({
			l: 0.87,
			c: 0.07,
			h: 88,
		});
	});

	it('ignores extra whitespace and letter case', () => {
		expect(parseOklch('  OKLCH( 50%   0.1  200 ) ')).toEqual({
			l: 0.5,
			c: 0.1,
			h: 200,
		});
	});

	it('accepts a hue written with the deg unit', () => {
		expect(parseOklch('oklch(50% 0.1 200deg)').h).toBe(200);
	});

	it.each([
		'',
		'#fff',
		'rgb(0 0 0)',
		'oklch(50% 0.1)',
		'oklch(abc 0.1 200)',
		'oklch(50% 0.1 200 / 0.5)',
	])('rejects %j, because tokens must be opaque OKLCH colors', (input) => {
		expect(() => parseOklch(input)).toThrow(RangeError);
	});
});

describe('oklchToHex', () => {
	it('converts black and white', () => {
		expect(oklchToHex('oklch(0% 0 0)')).toBe('#000000');
		expect(oklchToHex('oklch(100% 0 0)')).toBe('#ffffff');
	});

	it('converts a neutral grey through the sRGB transfer curve', () => {
		// L = 0.5 → luz lineal 0.125 → 1.055 · 0.125^(1/2.4) − 0.055 = 0.3886 → 99/255 = 0x63.
		expect(oklchToHex('oklch(0.5 0 0)')).toBe('#636363');
	});

	it('converts the OKLCH coordinates of pure sRGB red to #ff0000', () => {
		expect(oklchToHex('oklch(0.628 0.2577 29.23)')).toBe('#ff0000');
	});

	it('clips colors outside the sRGB gamut to a valid six-digit hex', () => {
		expect(oklchToHex('oklch(70% 0.4 30)')).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('rejects what is not an opaque oklch() color', () => {
		expect(() => oklchToHex('#fff')).toThrow(RangeError);
	});
});

describe('contrastRatio', () => {
	it('gives 21:1 for black on white', () => {
		expect(contrastRatio('oklch(100% 0 0)', 'oklch(0% 0 0)')).toBeCloseTo(
			21,
			1,
		);
	});

	it('gives 1:1 for identical colors', () => {
		expect(
			contrastRatio('oklch(60% 0.1 120)', 'oklch(60% 0.1 120)'),
		).toBeCloseTo(1, 5);
	});

	it('does not depend on the order of the arguments', () => {
		const a = 'oklch(30% 0.05 80)';
		const b = 'oklch(85% 0.07 90)';

		expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
	});

	it('matches a hand-computed mid grey against white', () => {
		// L = 0.5 en un gris neutro → luminancia relativa 0.5³ = 0.125 → (1 + 0.05) / (0.125 + 0.05).
		expect(contrastRatio('oklch(0.5 0 0)', 'oklch(100% 0 0)')).toBeCloseTo(
			6,
			1,
		);
	});

	it('matches the known contrast of pure sRGB red on white', () => {
		expect(
			contrastRatio('oklch(0.628 0.2577 29.23)', 'oklch(100% 0 0)'),
		).toBeCloseTo(4, 1);
	});

	it('clips colors outside the sRGB gamut instead of returning NaN', () => {
		expect(
			Number.isFinite(
				contrastRatio('oklch(70% 0.4 30)', 'oklch(0% 0 0)'),
			),
		).toBe(true);
	});
});
