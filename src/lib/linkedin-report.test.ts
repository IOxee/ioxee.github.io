import { describe, expect, it } from 'vitest';
import type { MergePlan } from './linkedin-merge.ts';
import { formatReport, sensitiveHints } from './linkedin-report.ts';

const emptyPlan: MergePlan = {
	updates: [],
	additions: [],
	unchanged: [],
	onlyOnSite: [],
};

describe('formatReport', () => {
	it('says there is nothing to do when LinkedIn and the site already match', () => {
		const text = formatReport({
			plan: { ...emptyPlan, unchanged: ['acme'] },
			skipped: [],
			write: false,
		});

		expect(text).toMatch(/nada que cambiar/i);
		expect(text).toContain('1 ya coinciden');
	});

	it('tells a dry run from a real one, so nobody thinks the file changed when it did not', () => {
		const plan = { ...emptyPlan, unchanged: ['a'] };

		expect(formatReport({ plan, skipped: [], write: false })).toMatch(
			/simulaci[oó]n/i,
		);
		expect(formatReport({ plan, skipped: [], write: true })).not.toMatch(
			/simulaci[oó]n/i,
		);
	});

	it('lists each date change, with "en curso" for an open end', () => {
		const text = formatReport({
			plan: {
				...emptyPlan,
				updates: [
					{
						id: 'acme',
						changes: [
							{ field: 'start', from: '2022', to: '2022-03' },
							{ field: 'end', from: '2023', to: null },
						],
					},
				],
			},
			skipped: [],
			write: true,
		});

		expect(text).toContain('acme');
		expect(text).toContain('start: 2022 → 2022-03');
		expect(text).toContain('end: 2023 → en curso');
	});

	it('lists the new entries and warns that their text comes from LinkedIn', () => {
		const text = formatReport({
			plan: {
				...emptyPlan,
				additions: [
					{
						id: 'nueva-2019',
						kind: 'work',
						organization: 'Nueva',
						role: { es: 'Developer' },
						summary: { es: 'x' },
						start: '2019',
						end: null,
					},
				],
			},
			skipped: [],
			write: true,
		});

		expect(text).toContain('Nueva');
		expect(text).toContain('Developer');
		expect(text).toContain('2019 → en curso');
		expect(text).toMatch(/revisa/i);
	});

	it('does not say "0 ya coinciden" next to a list of changes', () => {
		const text = formatReport({
			plan: {
				...emptyPlan,
				updates: [
					{
						id: 'a',
						changes: [{ field: 'end', from: null, to: '2020' }],
					},
				],
			},
			skipped: [],
			write: false,
		});

		expect(text).not.toContain('0 ya coinciden');
	});

	it('warns about a new entry whose imported text looks like personal data', () => {
		const text = formatReport({
			plan: {
				...emptyPlan,
				additions: [
					{
						id: 'x-2020',
						kind: 'work',
						organization: 'X',
						role: { es: 'Dev' },
						summary: {
							es: 'Escríbeme a yo@example.com o llama al +34 600 123 456, más en https://example.com',
						},
						start: '2020',
						end: null,
					},
				],
			},
			skipped: [],
			write: false,
		});

		expect(text).toMatch(/correo/);
		expect(text).toMatch(/teléfono/);
		expect(text).toMatch(/enlace/);
		expect(text).toContain('x-2020');
	});

	it('does not warn about an ordinary text', () => {
		expect(
			sensitiveHints('Desarrollo web con C# y SQL desde 2023-03-01.'),
		).toEqual([]);
	});

	it('lists what is only on the site, and the rows that could not be imported', () => {
		const text = formatReport({
			plan: { ...emptyPlan, onlyOnSite: ['solo-web'] },
			skipped: ['Posición sin empresa (Dev)'],
			write: true,
		});

		expect(text).toContain('solo-web');
		expect(text).toContain('Posición sin empresa (Dev)');
	});
});
