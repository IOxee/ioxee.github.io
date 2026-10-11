import { parse } from 'csv-parse/sync';

/** Una fila del export de LinkedIn (o de su API, que usa las mismas columnas): columna → texto. */
export type LinkedinRow = Readonly<Record<string, string>>;

/** Una posición o un estudio de LinkedIn, ya traducido al modelo de `experience.yaml`. */
export interface ImportedEntry {
	kind: 'work' | 'education';
	organization: string;
	role: string;
	summary?: string;
	/** `AAAA` o `AAAA-MM`. */
	start: string;
	/** `null` si sigue en curso. */
	end: string | null;
	/**
	 * Otros nombres con los que la web puede llamar a lo mismo: en la formación, el título (la web
	 * pone «CFGS DAW» donde LinkedIn pone el centro).
	 */
	aliases: readonly string[];
}

export interface ImportResult {
	entries: ImportedEntry[];
	/** Filas que no se pudieron importar, y por qué. Nunca se descartan en silencio. */
	skipped: string[];
}

/** Rol de una formación sin título, que es como la web ya llama a estos registros. */
const DEFAULT_EDUCATION_ROLE = 'Estudiante';

/** Lo que `fetch-linkedin` guarda y `import-linkedin --json` lee: las filas de cada dominio. */
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

/** Lee el JSON de una instantánea y comprueba su forma antes de fiarse de ella. */
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
/** Lo que algunas exportaciones ponen como fin de lo que sigue en curso. */
const STILL_GOING = /^(?:present|actualidad|actualitat|actual|actualmente)$/i;

const unsupported = (text: string): RangeError =>
	new RangeError(`Fecha no reconocida: "${text}"`);

/** Mes (1-12) de un nombre completo o abreviado en inglés, español o catalán; `null` si no lo es. */
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
 * Fecha de LinkedIn («Mar 2022», «2005», «03/2022»…) como fecha parcial de la web (`AAAA-MM` o
 * `AAAA`). Vacía → `null`. Una fecha que no se entiende falla: adivinarla pondría datos falsos.
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
 * Filas de un CSV de LinkedIn. `requiredColumn` identifica la cabecera: algunos archivos llevan
 * notas antes de ella y se saltan. Si no aparece, no es el archivo que se esperaba.
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
		// Una comilla suelta en un campo sin comillas (`5" screens`) no debe tumbar todo el archivo.
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
 * Texto de una celda en una sola línea y sin caracteres de control. Estos textos acaban en
 * `experience.yaml`, en un pull request y en el registro del workflow: un salto de línea o una
 * secuencia de escape no deben poder empezar una línea nueva ahí.
 */
const field = (row: LinkedinRow, column: string): string =>
	(row[column] ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();

/** Lee `start` y `end` de una fila; un `end` vacío (o «Present») es «en curso». */
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

/** Convierte cada fila; las que fallan por datos malos se anotan en `skipped`, sin parar el resto. */
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

/** Las posiciones de `Positions.csv` (o del dominio `POSITIONS` de la API). */
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

/** Los estudios de `Education.csv` (o del dominio `EDUCATION` de la API). */
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
