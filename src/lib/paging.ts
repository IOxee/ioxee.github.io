/**
 * Where a page that does not fit is cut, on narrow screens: there the sheets are as tall as the screen
 * and whatever does not fit on one goes on to a new sheet right behind it. The browser measures and moves
 * the pieces (`src/scripts/paginator.ts`); the decisions live here so they can be tested without painting
 * anything.
 */

/** A block of the page (a paragraph, a heading, a list…), measured from the top of the page. */
export interface BlockBox {
	top: number;
	bottom: number;
	/** A heading never stays alone at the foot of a page: it goes on with what follows it. */
	heading: boolean;
	/** It can be cut itself (a list by its items, a paragraph by its words…). */
	splittable: boolean;
	/** It never starts a page: it goes on with the block before it (the links under a text). */
	glued?: boolean;
}

export interface PageBreak {
	/** The first block that goes whole to the next page. */
	from: number;
	/** The block that is cut in two (it is the one before `from`), or `null` if none is. */
	split: number | null;
}

/** A list is never cut leaving fewer items than this on either sheet (the items of a list are its blocks). */
export const MIN_ITEMS = 2;

/**
 * Where to cut a run of blocks so that what stays ends above `limit`. The first block that does not fit is
 * cut if part of it fits and it can be cut; if not, it goes whole to the next page, together with the block
 * before it if it is glued to it and with the headings just before. With `minItems`, at least that many blocks
 * stay and go (the items of a list). `null` if everything fits, or if nothing but headings would stay: then there
 * is nothing to cut.
 */
export function pageBreak(
	blocks: readonly BlockBox[],
	limit: number,
	minItems = 1,
): PageBreak | null {
	const index = blocks.findIndex((block) => block.bottom > limit);
	const block = blocks[index];
	if (!block) return null;

	if (block.splittable && block.top < limit) {
		return { from: index + 1, split: index };
	}

	let from = Math.min(index, blocks.length - minItems);
	if (blocks[from]?.glued) from--;
	while (from > 0 && blocks[from - 1]?.heading) from--;
	if (from < minItems) return null;
	if (blocks.slice(0, from).every((kept) => kept.heading)) return null;

	return { from, split: null };
}

/**
 * The largest `n` from 0 to `count` for which `fits(n)` holds, assuming that if `n` fits so does any
 * smaller one (the words of a paragraph: the fewer, the shorter). 0 if not even one fits.
 */
export function largestFitting(
	count: number,
	fits: (n: number) => boolean,
): number {
	let low = 0;
	let high = Math.max(Math.floor(count), 0);
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (fits(middle)) low = middle;
		else high = middle - 1;
	}

	return low;
}

/** A paragraph is never cut leaving fewer lines than this on either sheet: no line ends up alone. */
export const MIN_LINES = 2;

/**
 * How far down the part of a paragraph that stays may reach, if it is cut: above `limit` and leaving at least
 * `MIN_LINES` for the next sheet. `null` if it cannot be cut keeping `MIN_LINES` on each side.
 */
export function paragraphRoom(
	top: number,
	limit: number,
	lines: number,
	lineHeight: number,
): number | null {
	if (!(lineHeight > 0) || lines < 2 * MIN_LINES) return null;

	const room = Math.min(limit, top + (lines - MIN_LINES) * lineHeight);

	return room - top >= MIN_LINES * lineHeight - 1 ? room : null;
}

/** The most sheets one page can become: a guard so that a page that cannot be cut never loops. */
export const MAX_CONTINUATIONS = 40;
