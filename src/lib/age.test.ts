import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateAge, yearRange } from './age';

const on = (year: number, month: number, day: number): Date =>
	new Date(year, month - 1, day);

afterEach(() => {
	vi.useRealTimers();
});

describe('calculateAge', () => {
	it('returns the full years elapsed since the birth date', () => {
		expect(calculateAge('1990-04-14', on(2026, 10, 10))).toBe(36);
	});

	it('counts the birthday itself as already completed', () => {
		expect(calculateAge('1990-04-14', on(2026, 4, 14))).toBe(36);
	});

	it('does not count the birthday on the day before it', () => {
		expect(calculateAge('1990-04-14', on(2026, 4, 13))).toBe(35);
	});

	it('does not count the birthday when the birth month has not arrived yet', () => {
		expect(calculateAge('1990-04-14', on(2026, 1, 20))).toBe(35);
	});

	it('moves a leap-day birthday to March 1st in non-leap years', () => {
		expect(calculateAge('2004-02-29', on(2026, 2, 28))).toBe(21);
		expect(calculateAge('2004-02-29', on(2026, 3, 1))).toBe(22);
	});

	it('uses the current date when none is given', () => {
		vi.useFakeTimers();
		vi.setSystemTime(on(2026, 10, 10));

		expect(calculateAge('1990-04-14')).toBe(36);
	});

	it.each(['1990/04/14', '14-04-1990', '1990-4-14', ''])(
		'rejects the malformed date %j',
		(input) => {
			expect(() => calculateAge(input, on(2026, 10, 10))).toThrow(
				RangeError,
			);
		},
	);

	it('rejects dates that do not exist in the calendar', () => {
		expect(() => calculateAge('1990-02-30', on(2026, 10, 10))).toThrow(
			RangeError,
		);
	});

	it('rejects a birth date in the future', () => {
		expect(() => calculateAge('2030-01-01', on(2026, 10, 10))).toThrow(
			RangeError,
		);
	});
});

describe('yearRange', () => {
	it('spans from the start year to the current year', () => {
		expect(yearRange(2019, on(2026, 10, 10))).toBe('2019 - 2026');
	});

	it('shows a single year when the start year is the current one', () => {
		expect(yearRange(2026, on(2026, 1, 1))).toBe('2026');
	});

	it('shows only the start year when it lies in the future', () => {
		expect(yearRange(2030, on(2026, 10, 10))).toBe('2030');
	});

	it('uses the current date when none is given', () => {
		vi.useFakeTimers();
		vi.setSystemTime(on(2026, 10, 10));

		expect(yearRange(2019)).toBe('2019 - 2026');
	});
});
