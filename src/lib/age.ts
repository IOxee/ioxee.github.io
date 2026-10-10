const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

interface CalendarDate {
	readonly year: number;
	readonly month: number;
	readonly day: number;
}

function parseIsoDate(value: string): CalendarDate {
	const match = ISO_DATE.exec(value);
	if (!match) {
		throw new RangeError(
			`Fecha inválida (se espera AAAA-MM-DD): "${value}"`,
		);
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);

	// `Date` normaliza fechas imposibles (30 de febrero → 2 de marzo); si cambia algo, no existía.
	const calendar = new Date(year, month - 1, day);
	const exists =
		calendar.getFullYear() === year &&
		calendar.getMonth() === month - 1 &&
		calendar.getDate() === day;
	if (!exists) {
		throw new RangeError(`La fecha no existe en el calendario: "${value}"`);
	}

	return { year, month, day };
}

/** Años cumplidos a `today`. Quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos. */
export function calculateAge(
	birthDate: string,
	today: Date = new Date(),
): number {
	const birth = parseIsoDate(birthDate);
	const month = today.getMonth() + 1;
	const hadBirthday =
		month > birth.month ||
		(month === birth.month && today.getDate() >= birth.day);

	const age = today.getFullYear() - birth.year - (hadBirthday ? 0 : 1);
	if (age < 0) {
		throw new RangeError(
			`La fecha de nacimiento está en el futuro: "${birthDate}"`,
		);
	}

	return age;
}

/** Rango para el copyright: `2019 - 2026`, o solo el año si aún no ha pasado ninguno. */
export function yearRange(startYear: number, today: Date = new Date()): string {
	const currentYear = today.getFullYear();

	return currentYear > startYear
		? `${startYear} - ${currentYear}`
		: String(startYear);
}
