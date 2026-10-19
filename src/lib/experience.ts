import { parsePartialDate, partialDateKey } from './partial-date';
import type { ExperienceEntry } from './schemas';

export function formatPartialDate(date: string): string {
	const { year, month } = parsePartialDate(date);

	return month === null
		? String(year)
		: `${String(month).padStart(2, '0')}/${year}`;
}

export function formatPeriod(
	start: string,
	end: string | null,
	presentLabel: string,
): string {
	const from = formatPartialDate(start);
	if (end === null) {
		return `${from} - ${presentLabel}`;
	}

	const to = formatPartialDate(end);

	return from === to ? from : `${from} - ${to}`;
}

const isOngoing = (entry: ExperienceEntry): boolean => entry.end === null;

// Ongoing entries compare equal to each other (0): the start decides between them.
const endKey = (entry: ExperienceEntry): number =>
	entry.end === null ? 0 : partialDateKey(entry.end, 'end');

/**
 * Ongoing first; then, most recent to oldest: finished ones by their end and the
 * rest by their start, with the id as the last tie-breaker so the order is deterministic.
 */
export function sortExperience(
	entries: readonly ExperienceEntry[],
): ExperienceEntry[] {
	return [...entries].sort(
		(a, b) =>
			Number(isOngoing(b)) - Number(isOngoing(a)) ||
			endKey(b) - endKey(a) ||
			partialDateKey(b.start, 'start') -
				partialDateKey(a.start, 'start') ||
			a.id.localeCompare(b.id),
	);
}
