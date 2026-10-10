import { describe, expect, it } from 'vitest';
import { partialDateKey } from './partial-date';

describe('partialDateKey', () => {
	it('places a bare year at the start of that year when it opens a period', () => {
		expect(partialDateKey('2022', 'start')).toBe(202201);
	});

	it('places a bare year at the end of that year when it closes a period', () => {
		expect(partialDateKey('2022', 'end')).toBe(202212);
	});

	it('keeps an explicit month whichever the bound', () => {
		expect(partialDateKey('2022-07', 'start')).toBe(202207);
		expect(partialDateKey('2022-07', 'end')).toBe(202207);
	});

	it.each(['22', '2022-13', '2022-00', '2022-7', '2022/07', ''])(
		'rejects the malformed date %j',
		(input) => {
			expect(() => partialDateKey(input, 'start')).toThrow(RangeError);
		},
	);
});
