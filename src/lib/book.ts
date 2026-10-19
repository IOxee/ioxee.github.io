/**
 * The folder as a book of double-sided sheets.
 *
 * A page is one face of a sheet. The cover (page 0) is the front face of the first
 * sheet; its back is the inside of the cover and carries nothing. After that, each sheet carries two pages:
 * the front one (the one read on the right when the folder is open) and the back one (the one on the left
 * once the sheet has been turned).
 *
 * With room for two pages a "spread" (`spread`) is shown: the back of the turned sheet on the
 * left and the front of the next one on the right, so each turn reveals two new
 * pages. On narrow screens only one page is shown at a time (`single`).
 *
 * A "position" is a reading point: a spread or a page, depending on the layout.
 */

export type Layout = 'spread' | 'single';

export interface LeafPages<T> {
	front: T;
	back: T | null;
}

export interface VisiblePages {
	left: number | null;
	right: number | null;
}

export const isBackPage = (page: number): boolean => page > 0 && page % 2 === 0;

export function leafPages<T>(pages: readonly T[]): LeafPages<T>[] {
	const [cover, ...rest] = pages;
	if (cover === undefined) return [];

	const leaves: LeafPages<T>[] = [{ front: cover, back: null }];
	for (let start = 0; start < rest.length; start += 2) {
		leaves.push({
			front: rest[start] as T,
			back: rest[start + 1] ?? null,
		});
	}

	return leaves;
}

const lastPage = (pages: number): number => Math.max(pages - 1, 0);

/** How many reading points there are. With spreads, one more if the last sheet has something on its back. */
export function positionCount(pages: number, layout: Layout): number {
	if (pages <= 1) return Math.max(pages, 0);

	return layout === 'single' ? pages : Math.floor(lastPage(pages) / 2) + 2;
}

const clampPosition = (position: number, pages: number, layout: Layout) =>
	Math.min(
		Math.max(Math.floor(position), 0),
		Math.max(positionCount(pages, layout) - 1, 0),
	);

export function positionOfPage(page: number, layout: Layout): number {
	const clamped = Math.max(Math.floor(page), 0);
	if (layout === 'single' || clamped === 0) return clamped;

	return clamped % 2 === 1 ? (clamped + 1) / 2 : clamped / 2 + 1;
}

export function pagesAtPosition(
	position: number,
	pages: number,
	layout: Layout,
): VisiblePages {
	const at = clampPosition(position, pages, layout);
	if (layout === 'single' || at === 0) return { left: null, right: at };

	const inside = (page: number) => (page <= lastPage(pages) ? page : null);

	return {
		// The back of the cover is the inside of the cover: it is not a page.
		left: at >= 2 ? inside(2 * at - 2) : null,
		right: inside(2 * at - 1),
	};
}

export function pageAtPosition(
	position: number,
	pages: number,
	layout: Layout,
): number {
	const { left, right } = pagesAtPosition(position, pages, layout);

	return right ?? left ?? 0;
}
