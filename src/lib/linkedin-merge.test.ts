import { describe, expect, it } from 'vitest';
import type { ImportedEntry } from './linkedin.ts';
import { planMerge, slugify } from './linkedin-merge.ts';
import type { ExperienceEntry } from './schemas.ts';

const existing = (overrides: Partial<ExperienceEntry>): ExperienceEntry => ({
	id: 'entry',
	kind: 'work',
	organization: 'Acme',
	role: { es: 'Rol propio' },
	summary: { es: 'Texto propio' },
	start: '2022',
	end: null,
	...overrides,
});

const imported = (overrides: Partial<ImportedEntry>): ImportedEntry => ({
	kind: 'work',
	organization: 'Acme',
	role: 'Developer',
	start: '2022',
	end: null,
	aliases: ['Acme'],
	...overrides,
});

describe('slugify', () => {
	it.each([
		['Techtiva Contech', 'techtiva-contech'],
		['  Fundació «La Caixa» ', 'fundacio-la-caixa'],
		['C# & .NET', 'c-net'],
		['***', 'entrada'],
	])('turns %j into %j', (text, expected) => {
		expect(slugify(text)).toBe(expected);
	});
});

describe('planMerge: matching what is already on the site', () => {
	it('recognizes the same organization however it is written', () => {
		const plan = planMerge(
			[existing({ id: 'techtiva', organization: 'Techtiva Contech' })],
			[
				imported({
					organization: 'TECHTIVA  contech',
					aliases: ['TECHTIVA  contech'],
				}),
			],
		);

		expect(plan.additions).toEqual([]);
		expect(plan.unchanged).toEqual(['techtiva']);
	});

	it('updates the dates when LinkedIn has others, and says which changed', () => {
		const plan = planMerge(
			[existing({ id: 'acme', start: '2022', end: '2023' })],
			[imported({ start: '2022-03', end: null })],
		);

		expect(plan.updates).toEqual([
			{
				id: 'acme',
				changes: [
					{ field: 'start', from: '2022', to: '2022-03' },
					{ field: 'end', from: '2023', to: null },
				],
			},
		]);
		expect(plan.unchanged).toEqual([]);
	});

	it('keeps a more precise date of the site when LinkedIn only has the year', () => {
		const plan = planMerge(
			[existing({ id: 'acme', start: '2022-09', end: '2023-06' })],
			[imported({ start: '2022', end: '2023' })],
		);

		expect(plan.updates).toEqual([]);
		expect(plan.unchanged).toEqual(['acme']);
	});

	it('does change a date that is not just a less precise form of the site one', () => {
		const plan = planMerge(
			[existing({ id: 'acme', start: '2022-09', end: '2023-06' })],
			[imported({ start: '2021', end: null })],
		);

		expect(plan.updates[0]?.changes).toEqual([
			{ field: 'start', from: '2022-09', to: '2021' },
			{ field: 'end', from: '2023-06', to: null },
		]);
	});

	it('treats a later stint at the same company as new instead of overwriting the old one', () => {
		const plan = planMerge(
			[existing({ id: 'acme-2022', start: '2022-09', end: '2023-06' })],
			[imported({ start: '2025-01', end: null })],
		);

		expect(plan.updates).toEqual([]);
		expect(plan.additions.map((entry) => entry.start)).toEqual(['2025-01']);
		expect(plan.onlyOnSite).toEqual(['acme-2022']);
	});

	it('still pairs entries whose start differs by up to two years, a correction and not a new job', () => {
		const plan = planMerge(
			[existing({ id: 'acme', start: '2022' })],
			[imported({ start: '2024' })],
		);

		expect(plan.updates).toHaveLength(1);
		expect(plan.additions).toEqual([]);
	});

	it('tells apart organizations written in alphabets other than the Latin one', () => {
		const plan = planMerge(
			[existing({ id: 'uno', organization: 'Компания' })],
			[
				imported({ organization: 'Другая', aliases: ['Другая'] }),
				imported({ organization: 'КОМПАНИЯ', aliases: ['КОМПАНИЯ'] }),
			],
		);

		expect(plan.unchanged).toEqual(['uno']);
		expect(plan.additions.map((entry) => entry.organization)).toEqual([
			'Другая',
		]);
	});

	it('never touches the texts that are already written', () => {
		const plan = planMerge(
			[existing({ id: 'acme' })],
			[
				imported({
					role: 'Otro rol',
					summary: 'Otro texto',
					start: '2021',
				}),
			],
		);

		expect(JSON.stringify(plan)).not.toContain('Otro');
	});

	it('finds a degree by its name when the site calls it where LinkedIn says the school', () => {
		const plan = planMerge(
			[
				existing({
					id: 'cfgs-daw',
					kind: 'education',
					organization: 'CFGS DAW',
					start: '2022',
					end: '2023',
				}),
			],
			[
				imported({
					kind: 'education',
					organization: 'Institut Example',
					role: 'CFGS DAW',
					start: '2022',
					end: '2023',
					aliases: ['Institut Example', 'CFGS DAW'],
				}),
			],
		);

		expect(plan.additions).toEqual([]);
		expect(plan.unchanged).toEqual(['cfgs-daw']);
	});

	it('does not match a job with a study of the same name', () => {
		const plan = planMerge(
			[existing({ id: 'acme', kind: 'work' })],
			[imported({ kind: 'education' })],
		);

		expect(plan.unchanged).toEqual([]);
		expect(plan.additions).toHaveLength(1);
	});

	it('pairs repeated organizations by their start, so two roles at one company stay two', () => {
		const plan = planMerge(
			[
				existing({ id: 'acme-2019', start: '2019', end: '2021' }),
				existing({ id: 'acme-2022', start: '2022', end: null }),
			],
			[
				imported({ start: '2022-05', end: null }),
				imported({ start: '2019', end: '2021' }),
			],
		);

		expect(plan.updates).toEqual([
			{
				id: 'acme-2022',
				changes: [{ field: 'start', from: '2022', to: '2022-05' }],
			},
		]);
		expect(plan.unchanged).toEqual(['acme-2019']);
		expect(plan.additions).toEqual([]);
	});

	it('matches each site entry only once: a second LinkedIn position becomes new', () => {
		const plan = planMerge(
			[existing({ id: 'acme' })],
			[
				imported({ start: '2022' }),
				imported({ start: '2018', end: '2019' }),
			],
		);

		expect(plan.unchanged).toEqual(['acme']);
		expect(plan.additions.map((entry) => entry.start)).toEqual(['2018']);
	});

	it('pairs the same way whichever order LinkedIn lists its positions in', () => {
		const plan = planMerge(
			[existing({ id: 'acme' })],
			[
				imported({ start: '2018', end: '2019' }),
				imported({ start: '2022' }),
			],
		);

		expect(plan.unchanged).toEqual(['acme']);
		expect(plan.additions.map((entry) => entry.start)).toEqual(['2018']);
	});

	it('prefers the first of two equally close entries in the file', () => {
		const plan = planMerge(
			[
				existing({ id: 'primero', start: '2022' }),
				existing({ id: 'segundo', start: '2022' }),
			],
			[imported({ start: '2022' })],
		);

		expect(plan.unchanged).toEqual(['primero']);
		expect(plan.onlyOnSite).toEqual(['segundo']);
	});

	it('lists what is only on the site, and keeps it', () => {
		const plan = planMerge(
			[
				existing({ id: 'acme' }),
				existing({ id: 'solo-web', organization: 'Solo web' }),
			],
			[imported({})],
		);

		expect(plan.onlyOnSite).toEqual(['solo-web']);
	});
});

describe('planMerge: new entries', () => {
	it('adds what the site does not have, written in Spanish fields with LinkedIn text', () => {
		const plan = planMerge(
			[],
			[
				imported({
					organization: 'New Co',
					summary: 'Hace cosas.',
					start: '2021-09',
					end: '2022-01',
				}),
			],
		);

		expect(plan.additions).toEqual([
			{
				id: 'new-co-2021',
				kind: 'work',
				organization: 'New Co',
				role: { es: 'Developer' },
				summary: { es: 'Hace cosas.' },
				start: '2021-09',
				end: '2022-01',
			},
		]);
	});

	it('uses the role as the summary when LinkedIn has no description, which the schema requires', () => {
		const [added] = planMerge([], [imported({})]).additions;

		expect(added?.summary).toEqual({ es: 'Developer' });
	});

	it('gives every new entry a different id', () => {
		const plan = planMerge(
			[existing({ id: 'new-co-2022', organization: 'Other' })],
			[
				imported({ organization: 'New Co', aliases: ['New Co'] }),
				imported({ organization: 'New Co', aliases: ['New Co'] }),
			],
		);

		expect(plan.additions.map((entry) => entry.id)).toEqual([
			'new-co-2022-2',
			'new-co-2022-3',
		]);
	});

	it('keeps ids unique across kinds, and only reports as "only on the site" the kinds it was given', () => {
		const plan = planMerge(
			[
				existing({
					id: 'tecnico-informatico-2022',
					kind: 'work',
					organization: 'Tecnico Informatico',
				}),
				existing({ id: 'otro', kind: 'work', organization: 'Otro' }),
			],
			[
				imported({
					kind: 'education',
					organization: 'Tecnico Informatico',
					aliases: ['Tecnico Informatico'],
					start: '2022',
				}),
			],
			{ kinds: ['education'] },
		);

		expect(plan.additions.map((entry) => entry.id)).toEqual([
			'tecnico-informatico-2022-2',
		]);
		expect(plan.onlyOnSite).toEqual([]);
	});

	it('adds nothing when only the dates of what exists should be updated', () => {
		const plan = planMerge([], [imported({})], { addNew: false });

		expect(plan.additions).toEqual([]);
	});
});
