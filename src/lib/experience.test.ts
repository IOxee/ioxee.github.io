import { describe, expect, it } from 'vitest';
import { formatPartialDate, formatPeriod, sortExperience } from './experience';
import type { ExperienceEntry } from './schemas';

const entry = (overrides: Partial<ExperienceEntry> = {}): ExperienceEntry => ({
	id: 'x',
	kind: 'work',
	role: { es: 'Rol' },
	summary: { es: 'Resumen' },
	start: '2020',
	end: null,
	...overrides,
});

const ids = (entries: readonly ExperienceEntry[]): string[] =>
	entries.map((item) => item.id);

describe('sortExperience', () => {
	it('puts the most recent start first', () => {
		const sorted = sortExperience([
			entry({ id: 'old', start: '2018' }),
			entry({ id: 'new', start: '2023' }),
		]);

		expect(ids(sorted)).toEqual(['new', 'old']);
	});

	it('uses the month to break ties within the same year', () => {
		const sorted = sortExperience([
			entry({ id: 'feb', start: '2022-02' }),
			entry({ id: 'sep', start: '2022-09' }),
		]);

		expect(ids(sorted)).toEqual(['sep', 'feb']);
	});

	it('puts ongoing entries before finished ones that started the same year', () => {
		const sorted = sortExperience([
			entry({ id: 'done', start: '2022', end: '2023' }),
			entry({ id: 'ongoing', start: '2022', end: null }),
		]);

		expect(ids(sorted)).toEqual(['ongoing', 'done']);
	});

	it('puts the later end first when both are finished and started together', () => {
		const sorted = sortExperience([
			entry({ id: 'short', start: '2020', end: '2021' }),
			entry({ id: 'long', start: '2020', end: '2023' }),
		]);

		expect(ids(sorted)).toEqual(['long', 'short']);
	});

	it('puts ongoing entries before finished ones even when they started earlier', () => {
		const sorted = sortExperience([
			entry({ id: 'done', start: '2022', end: '2023' }),
			entry({ id: 'ongoing', start: '2018', end: null }),
		]);

		expect(ids(sorted)).toEqual(['ongoing', 'done']);
	});

	it('orders finished entries by their end, latest first', () => {
		const sorted = sortExperience([
			entry({ id: 'ended-2021', start: '2015', end: '2021' }),
			entry({ id: 'ended-2023', start: '2022', end: '2023' }),
		]);

		expect(ids(sorted)).toEqual(['ended-2023', 'ended-2021']);
	});

	it('breaks ties between finished entries by the latest start', () => {
		const sorted = sortExperience([
			entry({ id: 'early', start: '2020', end: '2023' }),
			entry({ id: 'late', start: '2022', end: '2023' }),
		]);

		expect(ids(sorted)).toEqual(['late', 'early']);
	});

	it('treats a bare-year end as the end of that year', () => {
		const sorted = sortExperience([
			entry({ id: 'march', start: '2021', end: '2022-03' }),
			entry({ id: 'year', start: '2021', end: '2022' }),
		]);

		expect(ids(sorted)).toEqual(['year', 'march']);
	});

	it('treats a bare-year start as the start of that year', () => {
		const sorted = sortExperience([
			entry({ id: 'year', start: '2022' }),
			entry({ id: 'feb', start: '2022-02' }),
		]);

		expect(ids(sorted)).toEqual(['feb', 'year']);
	});

	it('falls back to the id so the order is deterministic', () => {
		const sorted = sortExperience([entry({ id: 'b' }), entry({ id: 'a' })]);

		expect(ids(sorted)).toEqual(['a', 'b']);
	});

	it('does not mutate its input', () => {
		const input = Object.freeze([
			entry({ id: 'old', start: '2018' }),
			entry({ id: 'new', start: '2023' }),
		]);

		sortExperience(input);

		expect(ids(input)).toEqual(['old', 'new']);
	});
});

describe('formatPartialDate', () => {
	it('shows only the year when the date has no month', () => {
		expect(formatPartialDate('2024')).toBe('2024');
	});

	it('shows month and year when the date has a month', () => {
		expect(formatPartialDate('2024-03')).toBe('03/2024');
	});

	it('rejects a malformed date', () => {
		expect(() => formatPartialDate('marzo')).toThrow(RangeError);
	});
});

describe('formatPeriod', () => {
	it('shows the present label for ongoing entries', () => {
		expect(formatPeriod('2022', null, 'Actualidad')).toBe(
			'2022 - Actualidad',
		);
	});

	it('shows a year range for finished entries', () => {
		expect(formatPeriod('2018', '2020', 'Actualidad')).toBe('2018 - 2020');
	});

	it('shows month and year when the dates include months', () => {
		expect(formatPeriod('2022-02', '2022-07', 'Actualidad')).toBe(
			'02/2022 - 07/2022',
		);
	});

	it('mixes both precisions when needed', () => {
		expect(formatPeriod('2022', '2023-02', 'Actualidad')).toBe(
			'2022 - 02/2023',
		);
	});

	it('collapses a period that starts and ends on the same date', () => {
		expect(formatPeriod('2020', '2020', 'Actualidad')).toBe('2020');
	});

	it('rejects malformed dates', () => {
		expect(() => formatPeriod('abc', null, 'Actualidad')).toThrow(
			RangeError,
		);
	});
});
