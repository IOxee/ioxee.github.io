import { parsePartialDate, partialDateKey } from './partial-date';
import type { ExperienceEntry } from './schemas';

function formatPartialDate(date: string): string {
	const { year, month } = parsePartialDate(date);

	return month === null
		? String(year)
		: `${String(month).padStart(2, '0')}/${year}`;
}

/** `2022 - Actualidad`, `2018 - 2020` o `02/2022 - 07/2022`. La etiqueta de "en curso" depende del idioma. */
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

// Las entradas en curso comparan igual entre sí (0): entre ellas decide el inicio.
const endKey = (entry: ExperienceEntry): number =>
	entry.end === null ? 0 : partialDateKey(entry.end, 'end');

/**
 * En curso primero; luego, de más reciente a más antigua: las terminadas por su fin y las
 * demás por su inicio, y como último desempate el id para que el orden sea determinista.
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
