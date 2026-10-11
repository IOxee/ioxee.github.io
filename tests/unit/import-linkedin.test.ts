import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const script = (name: string): string =>
	fileURLToPath(new URL(`../../scripts/${name}.ts`, import.meta.url));

const EXPERIENCE = `# Experiencia.
- id: acme
  kind: work
  organization: Acme
  role:
      es: Programador
  summary:
      es: Texto escrito a mano.
  start: '2022'
  end: null

- id: uni-2022
  kind: work
  organization: Otro
  role:
      es: Otro puesto
  summary:
      es: Otro texto.
  start: '2022'
  end: '2023'
`;

const POSITIONS = `Company Name,Title,Description,Location,Started On,Finished On
Acme,Developer,"Builds, tests",Lleida,Mar 2022,
Nueva,Support,,,Feb 2019,Jul 2019
`;

const root = mkdtempSync(join(tmpdir(), 'import-linkedin-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let caseDir: string;
let dataFile: string;
let exportDir: string;

beforeEach(() => {
	caseDir = mkdtempSync(join(root, 'case-'));
	dataFile = join(caseDir, 'experience.yaml');
	exportDir = join(caseDir, 'export');
	mkdirSync(exportDir);
	writeFileSync(dataFile, EXPERIENCE);
	writeFileSync(join(exportDir, 'Positions.csv'), POSITIONS);
});

/** Ejecuta un script como lo haría la persona: con Node, desde la terminal. */
function run(name: string, args: string[], env: Record<string, string> = {}) {
	const result = spawnSync(process.execPath, [script(name), ...args], {
		encoding: 'utf8',
		env: { ...process.env, ...env },
	});

	return { code: result.status, out: result.stdout, err: result.stderr };
}

const importer = (args: string[]) => run('import-linkedin', args);

describe('import-linkedin', () => {
	it('shows what it would do and writes nothing without --write', () => {
		const { code, out } = importer([exportDir, '--data', dataFile]);

		expect(code).toBe(0);
		expect(out).toContain('simulación');
		expect(out).toContain('start: 2022 → 2022-03');
		expect(out).toContain('Nueva');
		expect(readFileSync(dataFile, 'utf8')).toBe(EXPERIENCE);
	});

	it('writes the dates and the new entries with --write, and a second run changes nothing', () => {
		expect(importer([exportDir, '--data', dataFile, '--write']).code).toBe(
			0,
		);

		const written = readFileSync(dataFile, 'utf8');
		expect(written).toContain("start: '2022-03'");
		expect(written).toContain('Texto escrito a mano.');
		expect(written).toContain('id: nueva-2019');

		const second = importer([exportDir, '--data', dataFile, '--write']);
		expect(second.out).toContain('Nada que cambiar');
		expect(readFileSync(dataFile, 'utf8')).toBe(written);
	});

	it('only moves dates with --update-only', () => {
		importer([exportDir, '--data', dataFile, '--write', '--update-only']);

		const written = readFileSync(dataFile, 'utf8');
		expect(written).toContain("start: '2022-03'");
		expect(written).not.toContain('nueva-2019');
	});

	it('reads the snapshot that fetch-linkedin leaves, instead of the CSV files', () => {
		const snapshot = join(caseDir, 'snapshot.json');
		writeFileSync(
			snapshot,
			JSON.stringify({
				positions: [
					{
						'Company Name': 'Acme',
						Title: 'Developer',
						'Started On': 'Mar 2022',
						'Finished On': '',
					},
				],
			}),
		);

		const { code, out } = importer([
			'--json',
			snapshot,
			'--data',
			dataFile,
		]);

		expect(code).toBe(0);
		expect(out).toContain('start: 2022 → 2022-03');
	});

	it('does not accept a snapshot and CSV files at the same time', () => {
		const { code, err } = importer([
			exportDir,
			'--json',
			join(caseDir, 'x.json'),
			'--data',
			dataFile,
		]);

		expect(code).toBe(1);
		expect(err).toContain('--json');
	});

	it('validates the result even in a dry run, so a bad date is seen before asking for --write', () => {
		writeFileSync(
			join(exportDir, 'Positions.csv'),
			`${POSITIONS.split('\n')[0]}\nAcme,Developer,,,Mar 2022,Jan 2020\n`,
		);

		const { code, out, err } = importer([exportDir, '--data', dataFile]);

		expect(code).toBe(1);
		expect(err).toMatch(/anterior al inicio/);
		expect(out).toBe('');
	});

	it('does not repeat the id of an entry of the other kind when only one kind is imported', () => {
		writeFileSync(
			join(exportDir, 'Education.csv'),
			'School Name,Start Date,End Date,Notes,Degree Name,Activities\nUni,2022,2023,,Grau,\n',
		);
		rmSync(join(exportDir, 'Positions.csv'));

		importer([exportDir, '--data', dataFile, '--write']);

		const written = readFileSync(dataFile, 'utf8');
		expect(written).toContain('id: uni-2022-2');
		expect(written.match(/id: uni-2022$/gm)).toHaveLength(1);
	});

	it('fails, without touching the file, when the folder has no LinkedIn files', () => {
		const empty = join(root, 'empty');
		mkdirSync(empty, { recursive: true });

		const { code, err } = importer([empty, '--data', dataFile, '--write']);

		expect(code).toBe(1);
		expect(err).toContain('Positions.csv');
		expect(readFileSync(dataFile, 'utf8')).toBe(EXPERIENCE);
	});

	it('fails when a file given by hand does not exist', () => {
		const { code, err } = importer([
			'--positions',
			join(root, 'nope.csv'),
			'--data',
			dataFile,
		]);

		expect(code).toBe(1);
		expect(err).toContain('nope.csv');
	});

	it('explains an unknown option instead of dumping a stack trace', () => {
		const { code, err } = importer(['--api']);

		expect(code).toBe(1);
		expect(err).toMatch(/^Error: /);
		expect(err).not.toContain('node:internal');
	});

	it('prints the usage with --help', () => {
		expect(importer(['--help']).out).toContain('--write');
	});
});

describe('fetch-linkedin', () => {
	const fetcher = (args: string[], token = '') =>
		run('fetch-linkedin', args, { LINKEDIN_ACCESS_TOKEN: token });

	it('asks where to save the snapshot', () => {
		const { code, err } = fetcher([]);

		expect(code).toBe(1);
		expect(err).toContain('Uso:');
	});

	it('asks for the token, and writes nothing, when there is none', () => {
		const output = join(caseDir, 'snapshot.json');

		const { code, err } = fetcher([output]);

		expect(code).toBe(1);
		expect(err).toContain('LINKEDIN_ACCESS_TOKEN');
		expect(existsSync(output)).toBe(false);
	});

	it('refuses a token that is not valid, without printing it', () => {
		const { code, err, out } = fetcher(
			[join(caseDir, 'snapshot.json')],
			'tok en with spaces',
		);

		expect(code).toBe(1);
		expect(err).not.toContain('tok en');
		expect(out).not.toContain('tok en');
	});
});
