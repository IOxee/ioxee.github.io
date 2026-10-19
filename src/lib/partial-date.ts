/** Partial date: `YYYY` or `YYYY-MM`. */
export const PARTIAL_DATE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;

export type PeriodBound = 'start' | 'end';

export interface PartialDate {
	readonly year: number;
	readonly month: number | null;
}

export function parsePartialDate(date: string): PartialDate {
	const match = PARTIAL_DATE.exec(date);
	if (!match) {
		throw new RangeError(
			`Fecha inválida (se espera AAAA o AAAA-MM): "${date}"`,
		);
	}

	return {
		year: Number(match[1]),
		month: match[2] ? Number(match[2]) : null,
	};
}

/**
 * Comparable `YYYYMM` number. A bare year opens in January if it is the start of a period and
 * closes in December if it is the end: so `2022` as an end is never before `2022-03`.
 */
export function partialDateKey(date: string, bound: PeriodBound): number {
	const { year, month } = parsePartialDate(date);

	return year * 100 + (month ?? (bound === 'start' ? 1 : 12));
}
