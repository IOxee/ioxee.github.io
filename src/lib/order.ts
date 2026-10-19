import { partialDateKey } from './partial-date';

/**
 * Explicit display order (`order`, ascending). Astro's content store does not keep the order of
 * the YAML file, so it cannot be relied on.
 */
export function sortByOrder<T extends { id: string; order: number }>(
	items: readonly T[],
): T[] {
	return [...items].sort(
		(a, b) => a.order - b.order || a.id.localeCompare(b.id),
	);
}

/**
 * Most recent to oldest, as in a résumé: what is still going first; then,
 * what ended latest; on equal end, what started latest; and, last, the id, so the
 * order does not depend on how the data was loaded.
 */
export function sortNewestFirst<
	T extends { id: string; start: string; end: string | null },
>(items: readonly T[]): T[] {
	const endKey = (end: string | null): number =>
		end === null ? Number.POSITIVE_INFINITY : partialDateKey(end, 'end');

	return [...items].sort(
		(a, b) =>
			// Two ongoing ones give `Infinity - Infinity`, which is `NaN`: it counts as a tie.
			endKey(b.end) - endKey(a.end) ||
			0 ||
			partialDateKey(b.start, 'start') -
				partialDateKey(a.start, 'start') ||
			a.id.localeCompare(b.id),
	);
}
