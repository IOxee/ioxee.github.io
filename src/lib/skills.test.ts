import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Skill } from './schemas';
import { groupSkills, yearsOfExperience } from './skills';

const NOW = new Date(2026, 9, 10);

const skill = (overrides: Partial<Skill> = {}): Skill => ({
	id: 'x',
	name: 'X',
	category: 'backend',
	since: 2020,
	state: 'daily',
	...overrides,
});

afterEach(() => {
	vi.useRealTimers();
});

describe('yearsOfExperience', () => {
	it('counts the calendar years since the start year', () => {
		expect(yearsOfExperience(2018, NOW)).toBe(8);
	});

	it('returns zero in the same year it started', () => {
		expect(yearsOfExperience(2026, NOW)).toBe(0);
	});

	it('rejects a start year in the future', () => {
		expect(() => yearsOfExperience(2027, NOW)).toThrow(RangeError);
	});

	it('uses the current date when none is given', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		expect(yearsOfExperience(2018)).toBe(8);
	});
});

describe('groupSkills', () => {
	it('orders groups backend, frontend, data regardless of input order', () => {
		const groups = groupSkills(
			[
				skill({ id: 'sql', name: 'SQL', category: 'data' }),
				skill({ id: 'html', name: 'HTML', category: 'frontend' }),
				skill({ id: 'lua', name: 'Lua', category: 'backend' }),
			],
			NOW,
		);

		expect(groups.map((group) => group.category)).toEqual([
			'backend',
			'frontend',
			'data',
		]);
	});

	it('puts categories of your own after the preferred ones, alphabetically', () => {
		const groups = groupSkills(
			[
				skill({ id: 'unity', name: 'Unity', category: 'games' }),
				skill({ id: 'docker', name: 'Docker', category: 'devops' }),
				skill({ id: 'sql', name: 'SQL', category: 'data' }),
			],
			NOW,
		);

		expect(groups.map((group) => group.category)).toEqual([
			'data',
			'devops',
			'games',
		]);
	});

	it('omits categories that have no skills', () => {
		const groups = groupSkills([skill({ category: 'frontend' })], NOW);

		expect(groups.map((group) => group.category)).toEqual(['frontend']);
	});

	it('sorts a group by state, then by years of experience, then by name', () => {
		const [group] = groupSkills(
			[
				skill({
					id: 'basic',
					name: 'Básico',
					state: 'basic',
					since: 2010,
				}),
				skill({
					id: 'mid',
					name: 'Intermedio',
					state: 'intermediate',
					since: 2012,
				}),
				skill({
					id: 'comfy',
					name: 'Soltura',
					state: 'comfortable',
					since: 2015,
				}),
				skill({
					id: 'daily-new',
					name: 'Beta',
					state: 'daily',
					since: 2024,
				}),
				skill({
					id: 'daily-old',
					name: 'Zeta',
					state: 'daily',
					since: 2016,
				}),
				skill({
					id: 'daily-tie',
					name: 'Alfa',
					state: 'daily',
					since: 2016,
				}),
			],
			NOW,
		);

		expect(group?.skills.map((entry) => entry.id)).toEqual([
			'daily-tie',
			'daily-old',
			'daily-new',
			'comfy',
			'mid',
			'basic',
		]);
	});

	it('attaches the computed years of experience to every skill', () => {
		const [group] = groupSkills([skill({ since: 2018 })], NOW);

		expect(group?.skills[0]?.years).toBe(8);
	});

	it('returns an empty list when there are no skills', () => {
		expect(groupSkills([], NOW)).toEqual([]);
	});

	it('does not mutate its input', () => {
		const input = Object.freeze([
			skill({ id: 'b', name: 'B', since: 2024 }),
			skill({ id: 'a', name: 'A', since: 2010 }),
		]);

		groupSkills(input, NOW);

		expect(input.map((entry) => entry.id)).toEqual(['b', 'a']);
		expect('years' in (input[0] as object)).toBe(false);
	});
});
