import { parse } from 'csv-parse/sync';

export type LinkedinRow = Readonly<Record<string, string>>;

export interface ImportedEntry {
	kind: 'work' | 'education';
	organization: string;
	role: string;
	summary?: string;
	start: string;
	end: string | null;
	/**
	 * Other names the site may use for the same thing: in education, the title (the site
	 * says "CFGS DAW" where LinkedIn says the school).
	 */
	aliases: readonly string[];
}

export interface ImportResult {
	entries: ImportedEntry[];
	/** Rows that could not be imported, and why. They are never silently dropped. */
	skipped: string[];
}

/** Role of an education entry without a title, which is how the site already names these records. */
const DEFAULT_EDUCATION_ROLE = 'Estudiante';

export interface Snapshot {
	positions?: LinkedinRow[];
	education?: LinkedinRow[];
}

const isRowList = (value: unknown): value is LinkedinRow[] =>
	Array.isArray(value) &&
	value.every(
		(row: unknown) =>
			typeof row === 'object' &&
			row !== null &&
			!Array.isArray(row) &&
			Object.values(row).every((cell) => typeof cell === 'string'),
	);

export function parseSnapshot(text: string): Snapshot {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('La instantánea no es JSON válido');
	}
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new Error(
			'La instantánea debe ser un objeto con «positions» y «education»',
		);
	}

	const snapshot: Snapshot = {};
	for (const section of ['positions', 'education'] as const) {
		const rows = (data as Record<string, unknown>)[section];
		if (rows === undefined) continue;
		if (!isRowList(rows)) {
			throw new Error(
				`«${section}» debe ser una lista de filas con valores de texto`,
			);
		}
		snapshot[section] = rows;
	}

	return snapshot;
}

const MONTH_NAMES = [
	['january', 'enero', 'gener'],
	['february', 'febrero', 'febrer'],
	['march', 'marzo', 'març'],
	['april', 'abril'],
	['may', 'mayo', 'maig'],
	['june', 'junio', 'juny'],
	['july', 'julio', 'juliol'],
	['august', 'agosto', 'agost'],
	['september', 'septiembre', 'setembre'],
	['october', 'octubre'],
	['november', 'noviembre', 'novembre'],
	['december', 'diciembre', 'desembre'],
] as const;

const YEAR = /^(\d{4})$/;
const YEAR_MONTH = /^(\d{4})[-/](\d{1,2})$/;
const MONTH_YEAR = /^(\d{1,2})[-/](\d{4})$/;
const MONTH_NAME_YEAR = /^([a-zñçáéíóú]+)\.?\s+(?:de\s+)?(\d{4})$/i;
/** What some exports put as the end date of what is still ongoing. */
const STILL_GOING = /^(?:present|actualidad|actualitat|actual|actualmente)$/i;

const unsupported = (text: string): RangeError =>
	new RangeError(`Fecha no reconocida: "${text}"`);

function monthFromName(word: string): number | null {
	const name = word.toLowerCase();
	if (name.length < 3) return null;

	const index = MONTH_NAMES.findIndex((names) =>
		names.some((full) => full.startsWith(name)),
	);

	return index === -1 ? null : index + 1;
}

const pad = (month: number): string => String(month).padStart(2, '0');

/**
 * A LinkedIn date ("Mar 2022", "2005", "03/2022"…) as a partial site date (`YYYY-MM` or
 * `YYYY`). Empty → `null`. A date that is not understood fails: guessing it would put in false data.
 */
export function parseLinkedinDate(text: string): string | null {
	const value = text.trim();
	if (value === '') return null;

	if (YEAR.test(value)) return value;

	const yearMonth = YEAR_MONTH.exec(value);
	const monthYear = MONTH_YEAR.exec(value);
	const named = MONTH_NAME_YEAR.exec(value);

	const parts: [string, number | null] | null = yearMonth
		? [yearMonth[1] ?? '', Number(yearMonth[2])]
		: monthYear
			? [monthYear[2] ?? '', Number(monthYear[1])]
			: named
				? [named[2] ?? '', monthFromName(named[1] ?? '')]
				: null;

	const [year, month] = parts ?? [];
	if (!year || !month || month < 1 || month > 12) {
		throw unsupported(value);
	}

	return `${year}-${pad(month)}`;
}

/**
 * Rows of a LinkedIn CSV. `requiredColumn` identifies the header: some files carry
 * notes before it and those are skipped. If it does not appear, it is not the expected file.
 */
export function parseLinkedinCsv(
	text: string,
	requiredColumn: string,
): LinkedinRow[] {
	const table: string[][] = parse(text, {
		bom: true,
		trim: true,
		skip_empty_lines: true,
		relax_column_count: true,
		// A stray quote in an unquoted field (`5" screens`) must not bring down the whole file.
		relax_quotes: true,
	});

	const headerIndex = table.findIndex((cells) =>
		cells.includes(requiredColumn),
	);
	const header = table[headerIndex];
	if (!header) {
		throw new Error(
			`No encuentro la columna «${requiredColumn}»: ¿es el archivo que toca?`,
		);
	}

	return table
		.slice(headerIndex + 1)
		.map((cells) =>
			Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ''])),
		);
}

/**
 * Text of a cell on a single line and without control characters. These texts end up in
 * `experience.yaml`, in a pull request and in the workflow log: a line break or an escape
 * sequence must not be able to start a new line there.
 */
const field = (row: LinkedinRow, column: string): string =>
	(row[column] ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();

function readDates(
	row: LinkedinRow,
	startColumn: string,
	endColumn: string,
): { start: string; end: string | null } | null {
	const start = parseLinkedinDate(field(row, startColumn));
	if (start === null) return null;

	const end = field(row, endColumn);

	return {
		start,
		end: STILL_GOING.test(end) ? null : parseLinkedinDate(end),
	};
}

function convertRows(
	rows: readonly LinkedinRow[],
	convert: (row: LinkedinRow) => ImportedEntry | string,
	label: (row: LinkedinRow) => string,
): ImportResult {
	const result: ImportResult = { entries: [], skipped: [] };

	for (const row of rows) {
		try {
			const converted = convert(row);
			if (typeof converted === 'string') result.skipped.push(converted);
			else result.entries.push(converted);
		} catch (error) {
			if (!(error instanceof RangeError)) throw error;
			result.skipped.push(`${label(row)}: ${error.message}`);
		}
	}

	return result;
}

const withSummary = (summary: string): { summary?: string } =>
	summary === '' ? {} : { summary };

export function positionsToEntries(rows: readonly LinkedinRow[]): ImportResult {
	return convertRows(
		rows,
		(row) => {
			const organization = field(row, 'Company Name');
			if (organization === '') {
				return `Posición sin empresa (${field(row, 'Title') || 'sin título'})`;
			}

			const dates = readDates(row, 'Started On', 'Finished On');
			if (!dates) return `Posición «${organization}» sin fecha de inicio`;

			return {
				kind: 'work',
				organization,
				role: field(row, 'Title') || organization,
				...withSummary(field(row, 'Description')),
				...dates,
				aliases: [organization],
			};
		},
		(row) => `Posición «${field(row, 'Company Name')}»`,
	);
}

export function educationToEntries(rows: readonly LinkedinRow[]): ImportResult {
	return convertRows(
		rows,
		(row) => {
			const organization = field(row, 'School Name');
			const degree = field(row, 'Degree Name');
			if (organization === '') {
				return `Estudio sin centro (${degree || 'sin título'})`;
			}

			const dates = readDates(row, 'Start Date', 'End Date');
			if (!dates) return `Estudio «${organization}» sin fecha de inicio`;

			return {
				kind: 'education',
				organization,
				role: degree || DEFAULT_EDUCATION_ROLE,
				...withSummary(field(row, 'Notes')),
				...dates,
				aliases: degree ? [organization, degree] : [organization],
			};
		},
		(row) => `Estudio «${field(row, 'School Name')}»`,
	);
}
