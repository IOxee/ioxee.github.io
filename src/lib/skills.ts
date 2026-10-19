import { SKILL_CATEGORIES, SKILL_STATES } from './schemas';
import type { Skill } from './schemas';

export interface SkillWithYears extends Skill {
	readonly years: number;
}

export interface SkillGroup {
	readonly category: Skill['category'];
	readonly skills: readonly SkillWithYears[];
}

/** Años de experiencia contados por año natural desde `since`. */
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

	return SKILL_CATEGORIES.map((category) => ({
		category,
		skills: withYears
			.filter((skill) => skill.category === category)
			.sort(compareSkills),
	})).filter((group) => group.skills.length > 0);
}
