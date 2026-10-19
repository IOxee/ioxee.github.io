import { SECTION_IDS, type SectionId } from './sections';
import { fill } from './text';

export type SheetKind =
	| 'cover'
	| 'about'
	| 'experience'
	| 'education'
	| 'skills'
	| 'certifications'
	| 'project'
	| 'project-details'
	| 'contact';

export interface SheetPlan {
	id: string;
	kind: SheetKind;
	section: SectionId;
	items: readonly number[];
	anchor: boolean;
}

export interface FolderCounts {
	experience: number;
	education: number;
	/** Categorías de habilidades (Backend, Frontend…), no habilidades sueltas. */
	skillGroups: number;
	languages: number;
	certifications: number;
	projects: number;
	detailedProjects?: readonly number[];
	photographedCertifications?: readonly number[];
}

/**
 * Cuánto ocupa, en las certificaciones de una hoja, una con foto a todo el ancho: una sin foto vale 1
 * y en una hoja caben 4 (`DEFAULT_SHEET_SIZES.certifications`), así que con una foto solo cabe otra corta.
 */
export const PHOTO_WEIGHT = 3;

/**
 * Cuántas entradas caben en una hoja (en las habilidades, categorías). Los proyectos llevan
 * siempre una hoja cada uno.
 */
export interface SheetSizes {
	experience: number;
	education: number;
	skills: number;
	certifications: number;
}

export const DEFAULT_SHEET_SIZES: SheetSizes = {
	experience: 3,
	education: 4,
	skills: 2,
	certifications: 4,
};

function assertCount(value: number, what: string): void {
	if (!Number.isInteger(value) || value < 0) {
		throw new RangeError(`Cantidad no válida de ${what}: ${value}`);
	}
}

export function chunkIndices(count: number, size: number): number[][] {
	assertCount(count, 'entradas');
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError(`Tamaño de grupo no válido: ${size}`);
	}

	return Array.from({ length: Math.ceil(count / size) }, (_, group) =>
		Array.from(
			{ length: Math.min(size, count - group * size) },
			(_, position) => group * size + position,
		),
	);
}

/**
 * Nunca adelanta una entrada a un grupo anterior (se leerían desordenadas), y una más pesada que la capacidad se
 * queda sola en el suyo.
 */
export function packByWeight(
	weights: readonly number[],
	capacity: number,
): number[][] {
	if (!Number.isInteger(capacity) || capacity < 1) {
		throw new RangeError(`Capacidad de hoja no válida: ${capacity}`);
	}
	for (const weight of weights) {
		if (!Number.isFinite(weight) || weight <= 0) {
			throw new RangeError(`Peso de entrada no válido: ${weight}`);
		}
	}

	const groups: number[][] = [];
	let used = 0;
	weights.forEach((weight, index) => {
		const current = groups.at(-1);
		if (current && used + weight <= capacity) {
			current.push(index);
			used += weight;

			return;
		}

		groups.push([index]);
		used = weight;
	});

	return groups;
}

/**
 * Una sección sin contenido no tiene hoja (ni pestaña) y la primera hoja de cada sección recibe su ancla. Los idiomas
 * no tienen hoja propia: van en la última de habilidades (o en una sola, vacía de categorías, si no hay ninguna).
 */
export function planSheets(
	counts: FolderCounts,
	sizes: SheetSizes = DEFAULT_SHEET_SIZES,
): SheetPlan[] {
	for (const [value, what] of [
		[counts.experience, 'experiencia'],
		[counts.education, 'formación'],
		[counts.skillGroups, 'categorías de habilidades'],
		[counts.languages, 'idiomas'],
		[counts.certifications, 'certificaciones'],
		[counts.projects, 'proyectos'],
	] as const) {
		assertCount(value, what);
	}
	const detailed = new Set(counts.detailedProjects ?? []);
	for (const index of detailed) {
		if (!Number.isInteger(index) || index < 0 || index >= counts.projects) {
			throw new RangeError(
				`No hay un proyecto ${index} al que dar otra página`,
			);
		}
	}
	const photographed = new Set(counts.photographedCertifications ?? []);
	for (const index of photographed) {
		if (
			!Number.isInteger(index) ||
			index < 0 ||
			index >= counts.certifications
		) {
			throw new RangeError(
				`No hay una certificación ${index} a la que ponerle foto`,
			);
		}
	}

	const sheets: Omit<SheetPlan, 'anchor'>[] = [];

	const add = (
		kind: SheetKind,
		section: SectionId,
		items: readonly number[] = [],
		suffix = '',
	) => sheets.push({ id: `${kind}${suffix}`, kind, section, items });

	const addChunks = (
		kind: SheetKind,
		section: SectionId,
		chunks: readonly (readonly number[])[],
	) =>
		chunks.forEach((items, group) =>
			add(kind, section, items, `-${group + 1}`),
		);

	const addGroups = (
		kind: SheetKind,
		section: SectionId,
		count: number,
		size: number,
	) => addChunks(kind, section, chunkIndices(count, size));

	const skillChunks = chunkIndices(counts.skillGroups, sizes.skills);
	if (skillChunks.length === 0 && counts.languages > 0) skillChunks.push([]);

	add('cover', SECTION_IDS.home);
	add('about', SECTION_IDS.about);
	addGroups(
		'experience',
		SECTION_IDS.resume,
		counts.experience,
		sizes.experience,
	);
	addGroups(
		'education',
		SECTION_IDS.resume,
		counts.education,
		sizes.education,
	);
	addChunks('skills', SECTION_IDS.resume, skillChunks);
	addChunks(
		'certifications',
		SECTION_IDS.certifications,
		packByWeight(
			Array.from({ length: counts.certifications }, (_, index) =>
				photographed.has(index) ? PHOTO_WEIGHT : 1,
			),
			sizes.certifications,
		),
	);
	for (let index = 0; index < counts.projects; index += 1) {
		add('project', SECTION_IDS.projects, [index], `-${index + 1}`);
		if (detailed.has(index)) {
			add(
				'project-details',
				SECTION_IDS.projects,
				[index],
				`-${index + 1}`,
			);
		}
	}
	add('contact', SECTION_IDS.contact);

	const seen = new Set<SectionId>();

	return sheets.map((sheet) => {
		const anchor = !seen.has(sheet.section);
		seen.add(sheet.section);

		return { ...sheet, anchor };
	});
}

export interface SheetTitleOptions {
	labels: Readonly<Record<SheetKind, string>>;
	projectNames: readonly string[];
	partTemplate: string;
}

export function sheetTitles(
	plan: readonly SheetPlan[],
	{ labels, projectNames, partTemplate }: SheetTitleOptions,
): string[] {
	return plan.map((sheet) => {
		if (sheet.kind === 'project' || sheet.kind === 'project-details') {
			const item = sheet.items[0] ?? 0;
			const name = projectNames[item] ?? labels[sheet.kind];
			const twoPages = plan.some(
				(other) =>
					other.kind === 'project-details' && other.items[0] === item,
			);
			if (!twoPages) return name;

			return fill(partTemplate, {
				label: name,
				n: sheet.kind === 'project' ? '1' : '2',
				total: '2',
			});
		}

		const same = plan.filter((other) => other.kind === sheet.kind);
		if (same.length < 2) return labels[sheet.kind];

		return fill(partTemplate, {
			label: labels[sheet.kind],
			n: String(same.indexOf(sheet) + 1),
			total: String(same.length),
		});
	});
}

export function folderTabs(
	plan: readonly SheetPlan[],
): { section: SectionId; index: number }[] {
	return plan.flatMap((sheet, index) =>
		sheet.anchor && sheet.section !== SECTION_IDS.home
			? [{ section: sheet.section, index }]
			: [],
	);
}
