/**
 * Pone al día `src/data/experience.yaml` con lo que hay en LinkedIn: mueve las fechas que han
 * cambiado y añade los registros que faltan. Nunca reescribe un texto ya escrito ni borra nada.
 * Sin `--write` solo enseña lo que haría.
 *
 *   npm run import:linkedin -- <carpeta del export>        (con Positions.csv y/o Education.csv)
 *   npm run import:linkedin -- --positions P.csv --education E.csv
 *   npm run import:linkedin -- --json instantanea.json      (la que deja `fetch-linkedin`)
 *
 * Node 22.18 o superior.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { planMerge } from '../src/lib/linkedin-merge.ts';
import { formatReport } from '../src/lib/linkedin-report.ts';
import { applyPlan, readExperience } from '../src/lib/linkedin-yaml.ts';
import {
	type ImportResult,
	type LinkedinRow,
	type Snapshot,
	educationToEntries,
	parseLinkedinCsv,
	parseSnapshot,
	positionsToEntries,
} from '../src/lib/linkedin.ts';
import type { ExperienceEntry } from '../src/lib/schemas.ts';

const DEFAULT_DATA = 'src/data/experience.yaml';

const USAGE = `Uso: npm run import:linkedin -- <carpeta del export de LinkedIn> [opciones]

Opciones:
  --positions <archivo>   Positions.csv (por defecto, el de la carpeta)
  --education <archivo>   Education.csv (por defecto, el de la carpeta)
  --json <archivo>        en lugar de los CSV, la instantánea que deja fetch-linkedin
  --write                 escribe los cambios; sin esto es una simulación
  --update-only           solo actualiza fechas, sin añadir registros nuevos
  --data <archivo>        experience.yaml a usar (por defecto ${DEFAULT_DATA})`;

interface Cli {
	positionals: string[];
	values: {
		positions?: string;
		education?: string;
		json?: string;
		write?: boolean;
		'update-only'?: boolean;
		data?: string;
		help?: boolean;
	};
}

const parseCli = (): Cli =>
	parseArgs({
		allowPositionals: true,
		options: {
			positions: { type: 'string' },
			education: { type: 'string' },
			json: { type: 'string' },
			write: { type: 'boolean' },
			'update-only': { type: 'boolean' },
			data: { type: 'string' },
			help: { type: 'boolean', short: 'h' },
		},
	});

/** Lee un CSV si existe. Una ruta dada a mano que no existe es un error; una por defecto, no. */
function readCsv(
	path: string | undefined,
	explicit: boolean,
	column: string,
): LinkedinRow[] | undefined {
	if (path === undefined) return undefined;
	if (!existsSync(path)) {
		if (explicit) throw new Error(`No existe el archivo ${path}`);
		return undefined;
	}

	return parseLinkedinCsv(readFileSync(path, 'utf8'), column);
}

function loadRows({ positionals, values }: Cli): Snapshot {
	const folder = positionals[0];

	if (values.json !== undefined) {
		if (folder !== undefined || values.positions || values.education) {
			throw new Error('Usa --json o los CSV, no las dos cosas a la vez.');
		}
		if (!existsSync(values.json)) {
			throw new Error(`No existe el archivo ${values.json}`);
		}

		return parseSnapshot(readFileSync(values.json, 'utf8'));
	}

	const inFolder = (file: string): string | undefined =>
		folder === undefined ? undefined : join(folder, file);
	const rows: Snapshot = {};
	const positions = readCsv(
		values.positions ?? inFolder('Positions.csv'),
		values.positions !== undefined,
		'Company Name',
	);
	const education = readCsv(
		values.education ?? inFolder('Education.csv'),
		values.education !== undefined,
		'School Name',
	);
	if (positions) rows.positions = positions;
	if (education) rows.education = education;

	if (!rows.positions && !rows.education) {
		throw new Error(
			`No he encontrado Positions.csv ni Education.csv.\n\n${USAGE}`,
		);
	}

	return rows;
}

function main(): void {
	const cli = parseCli();
	const { values } = cli;
	if (values.help) {
		console.log(USAGE);
		return;
	}

	const dataPath = values.data ?? DEFAULT_DATA;
	const original = readFileSync(dataPath, 'utf8');
	const site = readExperience(original);

	const rows = loadRows(cli);
	const results: ImportResult[] = [];
	const kinds: ExperienceEntry['kind'][] = [];
	if (rows.positions) {
		results.push(positionsToEntries(rows.positions));
		kinds.push('work');
		if (rows.positions.length === 0) {
			console.warn(
				'Aviso: LinkedIn no tiene posiciones (¿la instantánea aún no está lista?).',
			);
		}
	}
	if (rows.education) {
		results.push(educationToEntries(rows.education));
		kinds.push('education');
	}

	// Solo se compara lo que LinkedIn ha dado: sin Education.csv, la formación no es «solo de la web».
	const plan = planMerge(
		site,
		results.flatMap((result) => result.entries),
		{ addNew: !values['update-only'], kinds },
	);

	// Se calcula y se valida siempre, también en la simulación: así lo que se enseña es lo que se
	// escribiría, y un dato que rompe el esquema se ve antes de pedir `--write`.
	const updated = applyPlan(
		original,
		plan,
		new Date().toISOString().slice(0, 10),
	);
	readExperience(updated);

	const write = values.write === true;
	console.log(
		formatReport({
			plan,
			skipped: results.flatMap((result) => result.skipped),
			write,
		}),
	);

	if (write && updated !== original) writeFileSync(dataPath, updated);
}

try {
	main();
} catch (error: unknown) {
	console.error(
		`Error: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exitCode = 1;
}
