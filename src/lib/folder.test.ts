import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SHEET_SIZES,
	type FolderCounts,
	PHOTO_WEIGHT,
	type SheetKind,
	chunkIndices,
	folderTabs,
	packByWeight,
	planSheets,
	sheetTitles,
} from './folder';

const counts = (overrides: Partial<FolderCounts> = {}): FolderCounts => ({
	experience: 5,
	education: 3,
	skillGroups: 2,
	languages: 3,
	certifications: 0,
	projects: 3,
	...overrides,
});

const kinds = (plan: ReturnType<typeof planSheets>) =>
	plan.map((sheet) => sheet.kind);

describe('chunkIndices', () => {
	it('splits 0..n-1 into groups of at most `size`', () => {
		expect(chunkIndices(5, 3)).toEqual([
			[0, 1, 2],
			[3, 4],
		]);
		expect(chunkIndices(6, 3)).toEqual([
			[0, 1, 2],
			[3, 4, 5],
		]);
		expect(chunkIndices(1, 3)).toEqual([[0]]);
	});

	it('gives no group for nothing', () => {
		expect(chunkIndices(0, 3)).toEqual([]);
	});

	it.each([0, -1, 1.5, Number.NaN])('rejects the group size %j', (size) => {
		expect(() => chunkIndices(3, size)).toThrow(RangeError);
	});

	it.each([-1, 1.5])('rejects the count %j', (count) => {
		expect(() => chunkIndices(count, 3)).toThrow(RangeError);
	});
});

describe('packByWeight', () => {
	it('fills each group up to the capacity, in order', () => {
		expect(packByWeight([1, 1, 1, 1, 1, 1], 4)).toEqual([
			[0, 1, 2, 3],
			[4, 5],
		]);
	});

	it('puts a heavy entry with a light one when they fit, and starts another group when they do not', () => {
		// 1 + 3 fit in 4; the next light one no longer does.
		expect(packByWeight([1, 3, 1], 4)).toEqual([[0, 1], [2]]);
		expect(packByWeight([3, 3], 4)).toEqual([[0], [1]]);
	});

	it('gives an entry heavier than the capacity a group of its own', () => {
		expect(packByWeight([1, 9, 1], 4)).toEqual([[0], [1], [2]]);
	});

	it('keeps the order: it never moves a light entry back to an earlier group', () => {
		expect(packByWeight([3, 1, 3, 1], 4)).toEqual([
			[0, 1],
			[2, 3],
		]);
		expect(packByWeight([2, 3, 1], 4)).toEqual([[0], [1, 2]]);
	});

	it('gives no group for nothing', () => {
		expect(packByWeight([], 4)).toEqual([]);
	});

	it.each([0, -1, 1.5, Number.NaN])('rejects the capacity %j', (capacity) => {
		expect(() => packByWeight([1], capacity)).toThrow(RangeError);
	});

	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects the weight %j',
		(weight) => {
			expect(() => packByWeight([1, weight], 4)).toThrow(RangeError);
		},
	);
});

describe('planSheets', () => {
	it('gives a certification with a photo most of a sheet, and lets short ones share what is left', () => {
		const sheets = planSheets(
			counts({ certifications: 4, photographedCertifications: [1] }),
		).filter((sheet) => sheet.kind === 'certifications');

		// Without a photo, four to a sheet; with a photo (weight PHOTO_WEIGHT) only one short one fits with it.
		expect(PHOTO_WEIGHT).toBeGreaterThan(1);
		expect(sheets.map((sheet) => sheet.items)).toEqual([
			[0, 1],
			[2, 3],
		]);
	});

	it('gives each certification with a photo a sheet of its own when two photos do not fit together', () => {
		const sheets = planSheets(
			counts({
				certifications: 3,
				photographedCertifications: [0, 1, 2],
			}),
		).filter((sheet) => sheet.kind === 'certifications');

		expect(sheets.map((sheet) => sheet.items)).toEqual([[0], [1], [2]]);
	});

	it('does not change anything for certifications without photo', () => {
		const sheets = planSheets(counts({ certifications: 6 })).filter(
			(sheet) => sheet.kind === 'certifications',
		);

		expect(sheets.map((sheet) => sheet.items)).toEqual([
			[0, 1, 2, 3],
			[4, 5],
		]);
	});

	it('rejects a photo for a certification that does not exist', () => {
		expect(() =>
			planSheets(
				counts({ certifications: 2, photographedCertifications: [2] }),
			),
		).toThrow(RangeError);
		expect(() =>
			planSheets(
				counts({ certifications: 2, photographedCertifications: [-1] }),
			),
		).toThrow(RangeError);
	});

	it('puts a cover first and the contact sheet last', () => {
		const plan = planSheets(counts());

		expect(plan[0]).toMatchObject({ kind: 'cover', section: 'home' });
		expect(plan.at(-1)).toMatchObject({
			kind: 'contact',
			section: 'contact',
		});
	});

	it('follows the order of the portfolio: about, experience, education, skills, certifications, projects', () => {
		expect(kinds(planSheets(counts({ certifications: 2 })))).toEqual([
			'cover',
			'about',
			'experience',
			'experience',
			'education',
			'skills',
			'certifications',
			'project',
			'project',
			'project',
			'contact',
		]);
	});

	it('spreads the experience over as many sheets as its size asks for, in order', () => {
		const experience = planSheets(counts({ experience: 7 })).filter(
			(sheet) => sheet.kind === 'experience',
		);

		expect(experience.map((sheet) => sheet.items)).toEqual([
			[0, 1, 2],
			[3, 4, 5],
			[6],
		]);
	});

	it('gives each project a sheet of its own', () => {
		const projects = planSheets(counts({ projects: 3 })).filter(
			(sheet) => sheet.kind === 'project',
		);

		expect(projects.map((sheet) => sheet.items)).toEqual([[0], [1], [2]]);
	});

	it('groups the certifications, which are short, several to a sheet', () => {
		const certifications = planSheets(counts({ certifications: 6 })).filter(
			(sheet) => sheet.kind === 'certifications',
		);

		expect(certifications.map((sheet) => sheet.items)).toEqual([
			[0, 1, 2, 3],
			[4, 5],
		]);
	});

	it('spreads the skill groups over sheets, a couple of groups to a sheet', () => {
		const skills = planSheets(counts({ skillGroups: 3 })).filter(
			(sheet) => sheet.kind === 'skills',
		);

		expect(skills.map((sheet) => sheet.items)).toEqual([[0, 1], [2]]);
	});

	it('keeps the languages on the skills sheets, with no sheet of their own', () => {
		expect(
			planSheets(counts({ skillGroups: 3, languages: 0 })).filter(
				(sheet) => sheet.kind === 'skills',
			),
		).toHaveLength(2);
		expect(
			planSheets(counts({ skillGroups: 3, languages: 3 })).filter(
				(sheet) => sheet.kind === 'skills',
			),
		).toHaveLength(2);
	});

	it('gives the languages a skills sheet when there are no skill groups to carry them', () => {
		const skills = planSheets(
			counts({ skillGroups: 0, languages: 2 }),
		).filter((sheet) => sheet.kind === 'skills');

		expect(skills.map((sheet) => sheet.items)).toEqual([[]]);
	});

	it('leaves out the sections that have nothing in them', () => {
		const plan = planSheets(
			counts({
				experience: 0,
				education: 0,
				skillGroups: 0,
				languages: 0,
				certifications: 0,
				projects: 0,
			}),
		);

		expect(kinds(plan)).toEqual(['cover', 'about', 'contact']);
	});

	it('writes the anchor of a section on its first sheet only', () => {
		const plan = planSheets(counts({ certifications: 1 }));
		const resume = plan.filter((sheet) => sheet.section === 'resume');

		expect(
			plan.filter((sheet) => sheet.anchor).map((sheet) => sheet.section),
		).toEqual([
			'home',
			'about-me',
			'resume',
			'certifications',
			'portfolio',
			'contact',
		]);
		expect(resume[0]?.anchor).toBe(true);
		expect(resume.slice(1).some((sheet) => sheet.anchor)).toBe(false);
	});

	it('moves the résumé anchor to the next sheet when the experience is empty', () => {
		const plan = planSheets(counts({ experience: 0 }));
		const resume = plan.filter((sheet) => sheet.section === 'resume');

		expect(resume.map((sheet) => sheet.kind)).toEqual([
			'education',
			'skills',
		]);
		expect(resume[0]?.anchor).toBe(true);
	});

	it('gives every sheet a different id', () => {
		const ids = planSheets(counts({ certifications: 6 })).map(
			(sheet) => sheet.id,
		);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('exposes the group sizes it uses', () => {
		expect(DEFAULT_SHEET_SIZES).toEqual({
			experience: 3,
			education: 4,
			skills: 2,
			certifications: 4,
		});
	});

	it('accepts other group sizes', () => {
		const plan = planSheets(counts({ experience: 4 }), {
			...DEFAULT_SHEET_SIZES,
			experience: 2,
		});

		expect(
			plan.filter((sheet) => sheet.kind === 'experience'),
		).toHaveLength(2);
	});

	it.each([
		'experience',
		'education',
		'skillGroups',
		'languages',
		'certifications',
		'projects',
	] as const)('rejects a negative count of %s', (key) => {
		expect(() => planSheets(counts({ [key]: -1 }))).toThrow(RangeError);
	});
});

describe('sheetTitles', () => {
	const labels: Record<SheetKind, string> = {
		cover: 'Isidro Rosell',
		about: 'Sobre mí',
		experience: 'Experiencia',
		education: 'Formación',
		skills: 'Habilidades',
		certifications: 'Certificaciones',
		project: 'Proyecto',
		'project-details': 'Proyecto',
		contact: 'Contacto',
	};
	const options = {
		labels,
		projectNames: ['Alfa', 'Beta', 'Gamma'],
		partTemplate: '{label} ({n} de {total})',
	};

	it('names every sheet after what it holds, with the name on the cover', () => {
		const titles = sheetTitles(
			planSheets(counts({ experience: 2, skillGroups: 2 })),
			options,
		);

		expect(titles).toEqual([
			'Isidro Rosell',
			'Sobre mí',
			'Experiencia',
			'Formación',
			'Habilidades',
			'Alfa',
			'Beta',
			'Gamma',
			'Contacto',
		]);
	});

	it('numbers the sheets of a section that takes more than one', () => {
		const titles = sheetTitles(
			planSheets(counts({ experience: 7, skillGroups: 3 })),
			options,
		);

		expect(
			titles.filter((title) => title.startsWith('Experiencia')),
		).toEqual([
			'Experiencia (1 de 3)',
			'Experiencia (2 de 3)',
			'Experiencia (3 de 3)',
		]);
		expect(
			titles.filter((title) => title.startsWith('Habilidades')),
		).toEqual(['Habilidades (1 de 2)', 'Habilidades (2 de 2)']);
	});

	it('names a project sheet after its project, and falls back to the generic label', () => {
		const plan = planSheets(counts({ projects: 3 }));

		expect(
			sheetTitles(plan, { ...options, projectNames: ['Alfa'] }).filter(
				(_, index) => plan[index]?.kind === 'project',
			),
		).toEqual(['Alfa', 'Proyecto', 'Proyecto']);
	});

	it('gives one title for every sheet of the plan', () => {
		const plan = planSheets(counts({ certifications: 6 }));

		expect(sheetTitles(plan, options)).toHaveLength(plan.length);
	});
});

describe('folderTabs', () => {
	it('has one tab per section, except the cover, pointing at the first sheet of the section', () => {
		const plan = planSheets(counts({ certifications: 2 }));

		expect(folderTabs(plan)).toEqual([
			{ section: 'about-me', index: 1 },
			{ section: 'resume', index: 2 },
			{ section: 'certifications', index: 6 },
			{ section: 'portfolio', index: 7 },
			{ section: 'contact', index: 10 },
		]);
	});

	it('does not offer a tab for a section that was left out', () => {
		const tabs = folderTabs(planSheets(counts({ certifications: 0 })));

		expect(tabs.map((tab) => tab.section)).not.toContain('certifications');
	});
});

describe('projects that take a second page', () => {
	it('puts the second page right after the first one of that project', () => {
		const plan = planSheets(counts({ projects: 3, detailedProjects: [0] }));
		const portfolio = plan.filter((sheet) => sheet.section === 'portfolio');

		expect(portfolio.map((sheet) => [sheet.kind, sheet.items[0]])).toEqual([
			['project', 0],
			['project-details', 0],
			['project', 1],
			['project', 2],
		]);
		expect(portfolio[0]?.anchor).toBe(true);
		expect(portfolio[1]?.anchor).toBe(false);
	});

	it('gives every sheet a different id, the second pages included', () => {
		const ids = planSheets(
			counts({ projects: 3, detailedProjects: [0, 2] }),
		).map((sheet) => sheet.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each([[[3]], [[-1]], [[1.5]]])(
		'rejects a second page for a project that does not exist (%j)',
		(detailedProjects) => {
			expect(() =>
				planSheets(counts({ projects: 3, detailedProjects })),
			).toThrow(RangeError);
		},
	);

	it('names both pages of such a project after it, as its first and second part', () => {
		const plan = planSheets(counts({ projects: 2, detailedProjects: [1] }));
		const titles = sheetTitles(plan, {
			labels: {
				cover: 'Portada',
				about: 'Sobre mí',
				experience: 'Experiencia',
				education: 'Formación',
				skills: 'Habilidades',
				certifications: 'Certificaciones',
				project: 'Proyecto',
				'project-details': 'Proyecto',
				contact: 'Contacto',
			},
			projectNames: ['Alfa', 'Beta'],
			partTemplate: '{label} ({n} de {total})',
		}).filter((_, index) => plan[index]?.section === 'portfolio');

		expect(titles).toEqual(['Alfa', 'Beta (1 de 2)', 'Beta (2 de 2)']);
	});
});
