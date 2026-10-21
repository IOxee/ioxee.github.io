/**
 * The folder script's decisions that do not depend on the browser: which page comes next, what is
 * announced, what a gesture does. They live here so they can be tested without painting anything.
 */
import {
	type Layout,
	pageAtPosition,
	pagesAtPosition,
	positionOfPage,
} from './book';
import {
	type AnchoredPage,
	type PagerAction,
	indexForHash,
	swipeAction,
} from './pager';
import { fill } from './text';

export interface StatusTemplates {
	cover: string;
	one: string;
	two: string;
}

export function readingStatus(
	page: number,
	total: number,
	layout: Layout,
	title: string,
	templates: StatusTemplates,
): string {
	if (page === 0) return fill(templates.cover, { title });

	const content = String(total - 1);
	const { left, right } = pagesAtPosition(
		positionOfPage(page, layout),
		total,
		layout,
	);
	if (left !== null && right !== null) {
		return fill(templates.two, {
			left: String(left),
			right: String(right),
			total: content,
			title,
		});
	}

	return fill(templates.one, { page: String(page), total: content, title });
}

/** What the bar under the folder shows on a narrow screen: the page being read and how many there are. */
export const pagerCount = (page: number, total: number): string =>
	`${page + 1} / ${Math.max(total, 1)}`;

/** The requested page (with a tab or an anchor), if it is visible there even as the left one; otherwise, the right one. */
export function pageForPosition(
	position: number,
	preferred: number | null,
	total: number,
	layout: Layout,
): number {
	if (preferred !== null && positionOfPage(preferred, layout) === position) {
		return preferred;
	}

	return pageAtPosition(position, total, layout);
}

/**
 * The progress that gets painted. With reduced motion there are no half turns: the sheet jumps whole
 * halfway through, just as the page being read changes.
 */
export const shownProgress = (progress: number, reduced: boolean): number =>
	reduced ? Math.round(progress) : progress;

/**
 * Which page the address leads to. Without an anchor it is the cover (so "Back" all the way to the start returns
 * to it); with an anchor that is not a section of the folder, none.
 */
export const pageForHash = (
	hash: string,
	plan: readonly AnchoredPage[],
): number | null => (hash === '' ? 0 : indexForHash(hash, plan));

const TAP_EDGE = 0.25;

export function tapAction(
	x: number,
	width: number,
	edge = TAP_EDGE,
): PagerAction | null {
	if (!(width > 0)) return null;
	if (x < width * edge) return 'prev';
	if (x > width * (1 - edge)) return 'next';

	return null;
}

const TAP_SLOP = 10;

export function gestureAction(
	dx: number,
	dy: number,
	x: number,
	width: number,
): PagerAction | null {
	const swipe = swipeAction(dx, dy);
	if (swipe) return swipe;
	if (Math.abs(dx) >= TAP_SLOP || Math.abs(dy) >= TAP_SLOP) return null;

	return tapAction(x, width);
}
