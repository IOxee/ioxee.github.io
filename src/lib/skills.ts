import { PREFERRED_SKILL_CATEGORIES, SKILL_STATES } from './schemas';
import type { Skill } from './schemas';

export interface SkillWithYears extends Skill {
	readonly years: number;
}

export interface SkillGroup {
	readonly category: Skill['category'];
	readonly skills: readonly SkillWithYears[];
}

/** Years of experience counted by calendar year from `since`. */
export function yearsOfExperience(
	since: number,
	today: Date = new Date(),
): number {
	const years = today.getFullYear() - since;
	if (years < 0) {
		throw new RangeError(`El año de inicio está en el futuro: ${since}`);
	}

	return years;
}

const stateWeight = (state: Skill['state']): number =>
	SKILL_STATES.indexOf(state);

const compareSkills = (a: SkillWithYears, b: SkillWithYears): number =>
	stateWeight(a.state) - stateWeight(b.state) ||
	b.years - a.years ||
	a.name.localeCompare(b.name, 'es');

export function groupSkills(
	skills: readonly Skill[],
	today: Date = new Date(),
): SkillGroup[] {
	const withYears = skills.map((skill) => ({
		...skill,
		years: yearsOfExperience(skill.since, today),
	}));

	const present = new Set(withYears.map((skill) => skill.category));
	const preferred = PREFERRED_SKILL_CATEGORIES.filter((category) =>
		present.has(category),
	);
	const others = [...present]
		.filter((category) => !preferred.some((known) => known === category))
		.sort();

	return [...preferred, ...others].map((category) => ({
		category,
		skills: withYears
			.filter((skill) => skill.category === category)
			.sort(compareSkills),
	}));
}
