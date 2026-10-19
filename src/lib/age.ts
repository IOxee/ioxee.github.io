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

	// `Date` normalizes impossible dates (30 February → 2 March); if anything changes, the date did not exist.
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

/** Someone born on 29 February has their birthday on 1 March in non-leap years. */
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

/** Range for the copyright: `2019 - 2026`, or just the year if none has passed yet. */
export function yearRange(startYear: number, today: Date = new Date()): string {
	const currentYear = today.getFullYear();

	return currentYear > startYear
		? `${startYear} - ${currentYear}`
		: String(startYear);
}
