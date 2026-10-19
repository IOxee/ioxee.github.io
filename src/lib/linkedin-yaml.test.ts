import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { MergePlan } from './linkedin-merge.ts';
import { applyPlan, readExperience } from './linkedin-yaml.ts';

const SOURCE = `# Experiencia y formación.
# Fechas: 'AAAA' o 'AAAA-MM'. \`end: null\` = en curso.
- id: acme
  kind: work
  organization: Acme
  role:
      es: Programador
  summary:
      es: Texto escrito a mano, a propósito muy largo para comprobar que ninguna línea de más de ochenta caracteres se parte en varias.
  start: '2022'
  end: null

# Este comentario va con el siguiente registro.
- id: instituto
  kind: education
  organization: CFGS DAW
  role:
      es: Estudiante
  summary:
      es: Estudiante de DAW.
  start: '2020'
  end: '2022'
`;

const emptyPlan: MergePlan = {
	updates: [],
	additions: [],
	unchanged: [],
	onlyOnSite: [],
};

describe('readExperience', () => {
	it('reads the entries and validates them against the schema', () => {
		const entries = readExperience(SOURCE);

		expect(entries.map((entry) => entry.id)).toEqual(['acme', 'instituto']);
	});

	it('fails, naming the problem, when an entry is not valid', () => {
		const broken = SOURCE.replace("start: '2022'", "start: 'ayer'");

		expect(() => readExperience(broken)).toThrow(/start/);
	});

	it('fails when the file is not a list of entries', () => {
		expect(() => readExperience('id: acme\n')).toThrow(/lista/);
	});

	it('refuses two entries with the same id, which would break the content collection', () => {
		const duplicated = `${SOURCE}${SOURCE.split('\n').slice(2).join('\n')}`;

		expect(() => readExperience(duplicated)).toThrow(/acme/);
		expect(() => readExperience(duplicated)).toThrow(/repetido/);
	});

	it('points at the position of an invalid entry that has no id', () => {
		expect(() => readExperience('- kind: work\n')).toThrow(/n\.º 1/);
		expect(() => readExperience('- just text\n')).toThrow(/n\.º 1/);
	});
});

describe('applyPlan', () => {
	it('returns the same text when there is nothing to change', () => {
		expect(applyPlan(SOURCE, emptyPlan, '2026-10-11')).toBe(SOURCE);
	});

	it('keeps Windows line endings when the file has them', () => {
		const windows = SOURCE.replaceAll('\n', '\r\n');
		const plan: MergePlan = {
			...emptyPlan,
			updates: [
				{
					id: 'instituto',
					changes: [{ field: 'end', from: '2022', to: '2023' }],
				},
			],
		};

		const text = applyPlan(windows, plan, '2026-10-11');

		expect(text.replaceAll('\r\n', '')).not.toContain('\n');
		expect(parse(text)[1].end).toBe('2023');
	});

	it('changes only the dates of an updated entry, keeping the texts and the comments', () => {
		const plan: MergePlan = {
			...emptyPlan,
			updates: [
				{
					id: 'acme',
					changes: [
						{ field: 'start', from: '2022', to: '2022-03' },
						{ field: 'end', from: null, to: '2024-01' },
					],
				},
			],
		};

		const text = applyPlan(SOURCE, plan, '2026-10-11');
		const [acme, instituto] = parse(text);

		expect(acme).toMatchObject({
			start: '2022-03',
			end: '2024-01',
			summary: { es: parse(SOURCE)[0].summary.es },
		});
		expect(instituto).toEqual(parse(SOURCE)[1]);
		expect(text).toContain("start: '2022-03'");
		expect(text).toContain("end: '2024-01'");
		expect(text).toContain('# Fechas:');
		expect(text).toContain(
			'# Este comentario va con el siguiente registro.',
		);
	});

	it('can mark an entry as ongoing again', () => {
		const plan: MergePlan = {
			...emptyPlan,
			updates: [
				{
					id: 'instituto',
					changes: [{ field: 'end', from: '2022', to: null }],
				},
			],
		};

		const text = applyPlan(SOURCE, plan, '2026-10-11');

		expect(parse(text)[1].end).toBeNull();
		expect(text).toContain('end: null');
	});

	it('appends new entries, with years kept as text and a note asking to review them', () => {
		const plan: MergePlan = {
			...emptyPlan,
			additions: [
				{
					id: 'nueva-2019',
					kind: 'work',
					organization: 'Nueva',
					role: { es: 'Developer' },
					summary: { es: 'Hace cosas.' },
					start: '2019',
					end: '2021-06',
				},
			],
		};

		const text = applyPlan(SOURCE, plan, '2026-10-11');
		const entries = parse(text);

		expect(entries).toHaveLength(3);
		expect(entries[2]).toEqual({
			id: 'nueva-2019',
			kind: 'work',
			organization: 'Nueva',
			role: { es: 'Developer' },
			summary: { es: 'Hace cosas.' },
			start: '2019',
			end: '2021-06',
		});
		expect(text).toContain("start: '2019'");
		expect(text).toContain("end: '2021-06'");
		expect(text).toContain(
			'# Importado de LinkedIn el 2026-10-11: revisa el texto.',
		);
		expect(() => readExperience(text)).not.toThrow();
	});

	it('quotes new text with single quotes, like Prettier does, so the next format check passes', () => {
		const plan: MergePlan = {
			...emptyPlan,
			additions: [
				{
					id: 'nueva-2019',
					kind: 'work',
					organization: 'Nueva',
					role: { es: 'Developer' },
					summary: { es: 'Responsabilidades: web' },
					start: '2019',
					end: null,
				},
			],
		};

		expect(applyPlan(SOURCE, plan, '2026-10-11')).toContain(
			"es: 'Responsabilidades: web'",
		);
	});

	it('refuses a plan that updates an entry that is not in the file', () => {
		const plan: MergePlan = {
			...emptyPlan,
			updates: [
				{
					id: 'no-existe',
					changes: [{ field: 'end', from: null, to: '2020' }],
				},
			],
		};

		expect(() => applyPlan(SOURCE, plan, '2026-10-11')).toThrow(
			/no-existe/,
		);
	});

	it('fails when the file is not a list of entries', () => {
		expect(() => applyPlan('id: acme\n', emptyPlan, '2026-10-11')).toThrow(
			/lista/,
		);
	});
});
