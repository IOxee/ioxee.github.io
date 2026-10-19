import { describe, expect, it } from 'vitest';
import { sortByOrder, sortNewestFirst } from './order';

const item = (id: string, order: number) => ({ id, order });
const ids = (items: readonly { id: string }[]): string[] =>
	items.map((entry) => entry.id);

describe('sortByOrder', () => {
	it('sorts ascending by order, whatever the input order', () => {
		const sorted = sortByOrder([item('c', 3), item('a', 1), item('b', 2)]);

		expect(ids(sorted)).toEqual(['a', 'b', 'c']);
	});

	it('breaks ties by id so the result is deterministic', () => {
		const sorted = sortByOrder([item('b', 1), item('a', 1)]);

		expect(ids(sorted)).toEqual(['a', 'b']);
	});

	it('does not mutate its input', () => {
		const input = Object.freeze([item('b', 2), item('a', 1)]);

		sortByOrder(input);

		expect(ids(input)).toEqual(['b', 'a']);
	});

	it('returns an empty list when there is nothing to sort', () => {
		expect(sortByOrder([])).toEqual([]);
	});
});

describe('sortNewestFirst', () => {
	const dated = (id: string, start: string, end: string | null) => ({
		id,
		start,
		end,
	});

	it('puts the most recently finished first, and anything still under way before all of them', () => {
		const sorted = sortNewestFirst([
			dated('old', '2022-12', '2023-01'),
			dated('new', '2026-10', '2026-10'),
			dated('going', '2021', null),
			dated('mid', '2023-12', '2024-04'),
			dated('spring', '2023-01', '2023-02'),
		]);

		expect(sorted.map((item) => item.id)).toEqual([
			'going',
			'new',
			'mid',
			'spring',
			'old',
		]);
	});

	it('breaks a tie on the end by the start, and then by id', () => {
		const sorted = sortNewestFirst([
			dated('b', '2024-01', '2024-06'),
			dated('a', '2024-01', '2024-06'),
			dated('later', '2024-03', '2024-06'),
		]);

		expect(sorted.map((item) => item.id)).toEqual(['later', 'a', 'b']);
	});

	it('does not change the list it is given', () => {
		const input = [
			dated('old', '2020', '2020'),
			dated('new', '2021', '2021'),
		];
		sortNewestFirst(input);

		expect(input.map((item) => item.id)).toEqual(['old', 'new']);
	});
});
