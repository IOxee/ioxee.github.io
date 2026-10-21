import { describe, expect, it } from 'vitest';
import {
	type BlockBox,
	MIN_LINES,
	largestFitting,
	pageBreak,
	paragraphRoom,
} from './paging';

const block = (
	top: number,
	bottom: number,
	kind: Partial<Pick<BlockBox, 'heading' | 'splittable' | 'glued'>> = {},
): BlockBox => ({
	top,
	bottom,
	heading: kind.heading ?? false,
	splittable: kind.splittable ?? false,
	glued: kind.glued ?? false,
});

const title = block(0, 40, { heading: true });

describe('pageBreak', () => {
	it('cuts nothing when everything fits', () => {
		expect(pageBreak([title, block(40, 200)], 300)).toBeNull();
		expect(pageBreak([], 300)).toBeNull();
	});

	it('moves to the next page the first block that does not fit, and everything after it', () => {
		expect(
			pageBreak(
				[title, block(40, 200), block(200, 320), block(320, 400)],
				300,
			),
		).toEqual({ from: 2, split: null });
	});

	it('cuts a block that can be cut when part of it fits', () => {
		expect(
			pageBreak(
				[title, block(40, 200), block(200, 420, { splittable: true })],
				300,
			),
		).toEqual({ from: 3, split: 2 });
	});

	it('does not cut a block that starts below the limit: it goes whole', () => {
		expect(
			pageBreak(
				[title, block(40, 300), block(300, 420, { splittable: true })],
				300,
			),
		).toEqual({ from: 2, split: null });
	});

	it('takes along the headings right before the block that goes, so none is left alone at the foot', () => {
		expect(
			pageBreak(
				[
					title,
					block(40, 200),
					block(200, 240, { heading: true }),
					block(240, 380),
				],
				300,
			),
		).toEqual({ from: 2, split: null });
	});

	it('does not cut when only headings would stay: there would be a page with a title and nothing else', () => {
		expect(pageBreak([title, block(40, 600)], 300)).toBeNull();
		expect(pageBreak([block(0, 600)], 300)).toBeNull();
	});

	it('takes along the block a glued one goes with, so the links never start a page alone', () => {
		expect(
			pageBreak(
				[
					title,
					block(40, 200),
					block(200, 280),
					block(280, 320, { glued: true }),
				],
				300,
			),
		).toEqual({ from: 2, split: null });
	});

	it('with minItems, leaves at least that many on each side', () => {
		const items = [0, 1, 2, 3, 4].map((n) => block(n * 80, n * 80 + 80));

		// Only the last one does not fit: two go, so none is left alone on the next sheet.
		expect(pageBreak(items, 330, 2)).toEqual({ from: 3, split: null });
		// Only the first one fits: it would stay alone, so the list is not cut there.
		expect(pageBreak(items, 100, 2)).toBeNull();
		expect(pageBreak(items, 170, 2)).toEqual({ from: 2, split: null });
	});

	it('cuts even the first block when it can be cut', () => {
		expect(pageBreak([block(0, 600, { splittable: true })], 300)).toEqual({
			from: 1,
			split: 0,
		});
	});
});

describe('largestFitting', () => {
	it('finds the most that fit', () => {
		expect(largestFitting(100, (n) => n <= 37)).toBe(37);
		expect(largestFitting(100, () => true)).toBe(100);
	});

	it('is 0 when not even one fits, or there is nothing to fit', () => {
		expect(largestFitting(100, () => false)).toBe(0);
		expect(largestFitting(0, () => true)).toBe(0);
		expect(largestFitting(-3, () => true)).toBe(0);
	});

	it('asks few times: it halves the range each time', () => {
		let asked = 0;
		largestFitting(1000, (n) => {
			asked++;

			return n <= 600;
		});

		expect(asked).toBeLessThanOrEqual(10);
	});
});

describe('paragraphRoom', () => {
	it('lets the paragraph reach the limit when enough lines are left for the next sheet', () => {
		// 10 lines of 20 px from y = 100: it would end at 300; the limit is 220.
		expect(paragraphRoom(100, 220, 10, 20)).toBe(220);
	});

	it('leaves at least MIN_LINES for the next sheet', () => {
		// 10 lines: at most 8 stay, so it ends at 100 + 8 × 20 even if there is room for 9.
		expect(paragraphRoom(100, 290, 10, 20)).toBe(
			100 + (10 - MIN_LINES) * 20,
		);
	});

	it('does not cut when fewer than MIN_LINES would stay', () => {
		expect(paragraphRoom(100, 125, 10, 20)).toBeNull();
	});

	it('does not cut a paragraph too short to keep MIN_LINES on each side', () => {
		expect(paragraphRoom(100, 140, 2 * MIN_LINES - 1, 20)).toBeNull();
	});

	it('does not cut without a line height', () => {
		expect(paragraphRoom(100, 220, 10, 0)).toBeNull();
		expect(paragraphRoom(100, 220, 10, Number.NaN)).toBeNull();
	});
});
