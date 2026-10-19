import { describe, expect, it } from 'vitest';
import {
	isBackPage,
	leafPages,
	pageAtPosition,
	pagesAtPosition,
	positionCount,
	positionOfPage,
} from './book';

// Twelve pages: the cover (0) and eleven of content (1..11). The sheets are:
//   0: cover | back of the cover     3: p5 | p6     6: p11 | (blank)
//   1: p1 | p2                       4: p7 | p8
//   2: p3 | p4                       5: p9 | p10
const PAGES = 12;

describe('isBackPage', () => {
	it('says which pages are on the back of their leaf, the left one when the folder is open', () => {
		expect([0, 1, 2, 3, 4].map(isBackPage)).toEqual([
			false,
			false,
			true,
			false,
			true,
		]);
	});
});

describe('leafPages', () => {
	it('puts the cover alone on the first leaf and pairs up the rest, front then back', () => {
		expect(leafPages(['c', 'a', 'b', 'd', 'e'])).toEqual([
			{ front: 'c', back: null },
			{ front: 'a', back: 'b' },
			{ front: 'd', back: 'e' },
		]);
	});

	it('leaves the back of the last leaf empty when the pages do not pair up', () => {
		expect(leafPages(['c', 'a', 'b', 'd'])).toEqual([
			{ front: 'c', back: null },
			{ front: 'a', back: 'b' },
			{ front: 'd', back: null },
		]);
	});

	it('has one leaf for a folder with only a cover and none for no pages', () => {
		expect(leafPages(['c'])).toEqual([{ front: 'c', back: null }]);
		expect(leafPages([])).toEqual([]);
	});

	it('puts every page on exactly one face, the back ones where isBackPage says, whatever the count', () => {
		for (let total = 0; total <= 14; total += 1) {
			const pages = Array.from({ length: total }, (_, page) => page);
			const faces = leafPages(pages).flatMap(({ front, back }) => [
				{ page: front, back: false },
				...(back === null ? [] : [{ page: back, back: true }]),
			]);

			expect(faces.map(({ page }) => page)).toEqual(pages);
			for (const face of faces)
				expect(face.back).toBe(isBackPage(face.page));
		}
	});
});

describe('positionCount', () => {
	it('is one position per page when only one page shows at a time', () => {
		expect(positionCount(PAGES, 'single')).toBe(12);
	});

	it('is one position per spread when two pages show: closed, then one for every leaf turned', () => {
		expect(positionCount(12, 'spread')).toBe(7);
	});

	it('needs one more spread to see the back of the last leaf when it has a page', () => {
		expect(positionCount(13, 'spread')).toBe(8);
	});

	it('is 1 for a folder with only a cover, and 0 for nothing at all', () => {
		expect(positionCount(1, 'spread')).toBe(1);
		expect(positionCount(1, 'single')).toBe(1);
		expect(positionCount(0, 'spread')).toBe(0);
		expect(positionCount(0, 'single')).toBe(0);
	});
});

describe('positionOfPage', () => {
	it('is the page itself when only one shows at a time', () => {
		expect(positionOfPage(7, 'single')).toBe(7);
	});

	it('finds the spread that shows a page, on its left or on its right', () => {
		expect(positionOfPage(0, 'spread')).toBe(0);
		expect(positionOfPage(1, 'spread')).toBe(1);
		expect(positionOfPage(2, 'spread')).toBe(2);
		expect(positionOfPage(3, 'spread')).toBe(2);
		expect(positionOfPage(10, 'spread')).toBe(6);
		expect(positionOfPage(11, 'spread')).toBe(6);
	});

	it('never goes below the cover', () => {
		expect(positionOfPage(-4, 'spread')).toBe(0);
		expect(positionOfPage(-4, 'single')).toBe(0);
	});
});

describe('pagesAtPosition', () => {
	it('shows only the cover while the folder is closed', () => {
		expect(pagesAtPosition(0, PAGES, 'spread')).toEqual({
			left: null,
			right: 0,
		});
	});

	it('shows the inside of the cover, which has no page, next to the first page', () => {
		expect(pagesAtPosition(1, PAGES, 'spread')).toEqual({
			left: null,
			right: 1,
		});
	});

	it('shows the back of one leaf and the front of the next: two new pages at every turn', () => {
		expect(pagesAtPosition(2, PAGES, 'spread')).toEqual({
			left: 2,
			right: 3,
		});
		expect(pagesAtPosition(5, PAGES, 'spread')).toEqual({
			left: 8,
			right: 9,
		});
	});

	it('ends on the front of the last leaf, whose back is blank, when the pages of content are odd', () => {
		expect(pagesAtPosition(6, PAGES, 'spread')).toEqual({
			left: 10,
			right: 11,
		});
	});

	it('ends on a spread with the back cover on the right when the pages of content are even', () => {
		expect(pagesAtPosition(7, 13, 'spread')).toEqual({
			left: 12,
			right: null,
		});
	});

	it('shows exactly the page asked for when only one shows at a time', () => {
		expect(pagesAtPosition(4, PAGES, 'single')).toEqual({
			left: null,
			right: 4,
		});
	});
});

describe('pageAtPosition', () => {
	it('is the right-hand page of a spread, which is where the reading goes on', () => {
		expect(pageAtPosition(2, PAGES, 'spread')).toBe(3);
		expect(pageAtPosition(0, PAGES, 'spread')).toBe(0);
	});

	it('falls back to the left-hand page when the right is the back cover', () => {
		expect(pageAtPosition(7, 13, 'spread')).toBe(12);
	});

	it('is the position itself when only one page shows at a time', () => {
		expect(pageAtPosition(9, PAGES, 'single')).toBe(9);
	});

	it('keeps a position inside the folder', () => {
		expect(pageAtPosition(99, PAGES, 'single')).toBe(11);
		expect(pageAtPosition(99, PAGES, 'spread')).toBe(11);
		expect(pageAtPosition(-3, PAGES, 'spread')).toBe(0);
	});

	it('goes back and forth with positionOfPage: the position of a page shows that page', () => {
		for (let page = 0; page < PAGES; page += 1) {
			const position = positionOfPage(page, 'spread');
			const { left, right } = pagesAtPosition(position, PAGES, 'spread');

			expect([left, right]).toContain(page);
		}
	});
});

describe('the whole folder, for every size from 1 to 14 pages', () => {
	const sizes = Array.from({ length: 14 }, (_, index) => index + 1);

	it.each(sizes)(
		'shows each of %i pages in exactly one place when open, and positionOfPage finds it',
		(total) => {
			const seen: number[] = [];
			for (let at = 0; at < positionCount(total, 'spread'); at += 1) {
				const { left, right } = pagesAtPosition(at, total, 'spread');
				for (const page of [left, right]) {
					if (page === null) continue;

					seen.push(page);
					expect(positionOfPage(page, 'spread')).toBe(at);
				}
			}

			expect(seen).toEqual(
				Array.from({ length: total }, (_, page) => page),
			);
		},
	);

	it.each(sizes)(
		'reads each of %i pages one at a time when only one fits',
		(total) => {
			for (let page = 0; page < total; page += 1) {
				const at = positionOfPage(page, 'single');

				expect(pagesAtPosition(at, total, 'single')).toEqual({
					left: null,
					right: page,
				});
				expect(pageAtPosition(at, total, 'single')).toBe(page);
			}
		},
	);

	it.each(sizes)(
		'with %i pages, never leaves an open spread without a page on either side',
		(total) => {
			for (let at = 1; at < positionCount(total, 'spread'); at += 1) {
				const { left, right } = pagesAtPosition(at, total, 'spread');

				expect(left !== null || right !== null).toBe(true);
			}
		},
	);
});
