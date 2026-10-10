/** Fecha parcial: `AAAA` o `AAAA-MM`. */
export const PARTIAL_DATE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;

/** Extremo de un periodo al que pertenece la fecha. */
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
 * Número comparable `AAAAMM`. Un año suelto abre en enero si es el inicio de un periodo y
 * cierra en diciembre si es el final: así `2022` como fin nunca queda antes de `2022-03`.
 */
export function partialDateKey(date: string, bound: PeriodBound): number {
	const { year, month } = parsePartialDate(date);

	return year * 100 + (month ?? (bound === 'start' ? 1 : 12));
}
