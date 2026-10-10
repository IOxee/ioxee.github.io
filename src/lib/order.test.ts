import { describe, expect, it } from 'vitest';
import { sortByOrder } from './order';

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
