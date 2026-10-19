import type { SheetPlan } from './folder';
import type { SectionId } from './sections';

export type PagerAction = 'prev' | 'next' | 'first' | 'last';

export type SheetState = 'past' | 'current' | 'future';

export function clampIndex(index: number, total: number): number {
	if (total <= 0 || Number.isNaN(index)) return 0;

	return Math.min(Math.max(Math.floor(index), 0), total - 1);
}

export function turn(
	index: number,
	action: PagerAction,
	total: number,
): number {
	switch (action) {
		case 'next':
			return clampIndex(index + 1, total);
		case 'prev':
			return clampIndex(index - 1, total);
		case 'first':
			return 0;
		case 'last':
			return clampIndex(total - 1, total);
	}
}

const KEY_ACTIONS: Readonly<Record<string, PagerAction>> = {
	ArrowRight: 'next',
	PageDown: 'next',
	ArrowLeft: 'prev',
	PageUp: 'prev',
	Home: 'first',
	End: 'last',
};

/** What a key does, or `null` if it is not the folder's (so its normal use is not taken away). */
export const keyAction = (key: string): PagerAction | null =>
	Object.hasOwn(KEY_ACTIONS, key) ? (KEY_ACTIONS[key] ?? null) : null;

export const DEFAULT_SWIPE_DISTANCE = 48;

export function swipeAction(
	dx: number,
	dy: number,
	distance = DEFAULT_SWIPE_DISTANCE,
): PagerAction | null {
	if (Math.abs(dx) < distance || Math.abs(dx) <= Math.abs(dy)) return null;

	return dx < 0 ? 'next' : 'prev';
}

export function sheetStates(index: number, total: number): SheetState[] {
	return Array.from({ length: Math.max(total, 0) }, (_, position) => {
		if (position < index) return 'past';
		return position === index ? 'current' : 'future';
	});
}

export const isNear = (position: number, index: number): boolean =>
	Math.abs(position - index) <= 1;

/** The minimum scrolled per sheet: without this, one wheel tick would turn several at once. */
const MIN_SCROLL_STEP = 320;

export const scrollStep = (viewportHeight: number): number =>
	Math.max(MIN_SCROLL_STEP, Math.round(viewportHeight / 2));

/**
 * How many steps the page has scrolled since the folder was pinned, with fractions: it is what
 * decides how far the sheet being turned has rotated. It goes from the first position to the last.
 */
export function scrollProgress(
	offset: number,
	step: number,
	total: number,
): number {
	if (!(step > 0) || !Number.isFinite(offset) || !(total > 0)) return 0;

	return Math.min(Math.max(offset / step, 0), total - 1);
}

export const scrollOffsetFor = (index: number, step: number): number =>
	Math.max(0, index) * step;

/**
 * How far you must have moved toward another sheet (in steps) for it to finish turning on its own. It is small
 * on purpose: a wheel tick moves about 100 px and a keyboard arrow 40, a small fraction of the sheet,
 * and with "the nearest stop" they would go back instead of turning it. A trackpad
 * brush, of a few pixels, stays below it.
 */
export const SETTLE_THRESHOLD = 0.04;

/**
 * Which reading point the folder finishes settling at when scrolling stops between two.
 * It follows the direction of movement: it starts from `origin` (where it was before moving) and, if it has
 * gone past `threshold` steps to one side, continues to the sheet on that side. An already exact point
 * stays where it is. `null` if the scroll is outside the track (above the folder, or beyond the last sheet):
 * there is nothing to settle there.
 */
export function settleTarget(
	position: number,
	origin: number,
	count: number,
	threshold: number = SETTLE_THRESHOLD,
): number | null {
	if (!Number.isFinite(position) || !Number.isFinite(origin) || !(count > 0))
		return null;

	const last = count - 1;
	if (position < 0 || position > last) return null;

	const from = Math.min(Math.max(Math.round(origin), 0), last);
	const moved = position - from;
	const hops = Math.max(Math.ceil(Math.abs(moved) - threshold), 0);

	return Math.min(Math.max(from + Math.sign(moved) * hops, 0), last);
}

/**
 * The folder does not shrink below this: smaller, the text could no longer be read. With the
 * menu and footer always in view, a 768-tall laptop (about 650 px of page) leaves the folder
 * little more than 540 px: it has to go down to here to stay pinned.
 */
export const MIN_FIT_SCALE = 0.65;
/**
 * Nor is it enlarged above this: on a huge screen (4K, ultrawide) the folder fills the height
 * or width it has, but beyond that the paper and the screenshots would look pixelated.
 */
export const MAX_FIT_SCALE = 2.4;

/**
 * How much to scale the folder so it fills the gap the window leaves: it shrinks if it does not
 * fit and, if there is room to spare, it is enlarged up to `maximum` (1 by default: not enlarged). If it would have to
 * shrink more than `minimum` it is not pinned (`null`): it would look cut off or unreadable.
 */
export function fitScale(
	available: number,
	natural: number,
	minimum = MIN_FIT_SCALE,
	maximum = 1,
): number | null {
	if (!(available > 0) || !(natural > 0)) return null;

	const scale = Math.min(maximum, available / natural);

	return scale >= minimum ? scale : null;
}

export type AnchoredPage = Pick<SheetPlan, 'section' | 'anchor'>;

export function indexForHash(
	hash: string,
	plan: readonly AnchoredPage[],
): number | null {
	const id = hash.startsWith('#') ? hash.slice(1) : hash;
	const index = plan.findIndex(
		(sheet) => sheet.anchor && sheet.section === id,
	);

	return index === -1 ? null : index;
}

export function sectionAt(
	index: number,
	plan: readonly AnchoredPage[],
): SectionId {
	const sheet = plan[clampIndex(index, plan.length)];
	if (!sheet) throw new RangeError('La carpeta no tiene hojas');

	return sheet.section;
}
