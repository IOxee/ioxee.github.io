import type { ImportedEntry } from './linkedin.ts';
import type { ExperienceEntry } from './schemas.ts';

export interface DateChange {
	field: 'start' | 'end';
	from: string | null;
	to: string | null;
}

export interface EntryUpdate {
	id: string;
	changes: DateChange[];
}

/** Un registro nuevo, con el texto de LinkedIn en el campo español. */
export interface NewEntry {
	id: string;
	kind: ExperienceEntry['kind'];
	organization: string;
	role: { es: string };
	summary: { es: string };
	start: string;
	end: string | null;
}

export interface MergePlan {
	/** Registros que ya estaban y cuyas fechas cambian. */
	updates: EntryUpdate[];
	additions: NewEntry[];
	/** Registros que ya estaban y coinciden con LinkedIn. */
	unchanged: string[];
	/** Registros de la web que LinkedIn no tiene. No se tocan ni se borran. */
	onlyOnSite: string[];
}

export interface MergeOptions {
	/** `false`: solo actualizar fechas, sin crear registros nuevos. */
	addNew?: boolean;
	/**
	 * Tipos de registro de los que LinkedIn ha dado datos. Los demás no se comparan ni se listan
	 * como «solo en la web», pero sus ids siguen contando para que los nuevos no los repitan.
	 */
	kinds?: readonly ExperienceEntry['kind'][];
}

/** Más años de diferencia entre dos inicios y es otra etapa en la misma organización. */
const MAX_START_GAP_YEARS = 2;

/** Texto en minúsculas, sin acentos y con guiones en lugar de símbolos y espacios. */
export function slugify(text: string): string {
	const slug = text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug === '' ? 'entrada' : slug;
}

/**
 * Clave para comparar nombres sin fijarse en mayúsculas, acentos, espacios ni símbolos. Vale para
 * cualquier alfabeto: «slugify» solo conserva el latino y juntaría organizaciones distintas.
 */
const nameKey = (text: string): string =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * `true` si LinkedIn no aporta nada que la web no sepa: la misma fecha, o un año cuando la web
 * ya tiene ese año con mes (`2022` frente a `2022-09`).
 */
const addsNothing = (site: string | null, linkedin: string | null): boolean =>
	site === linkedin ||
	(site !== null && linkedin !== null && site.startsWith(`${linkedin}-`));

const yearOf = (date: string): number => Number(date.slice(0, 4));

interface Pairing {
	imported: number;
	site: number;
	/** Menor es mejor: 0 si empiezan igual, y crece con los años de diferencia. */
	distance: number;
}

/**
 * Empareja cada registro de LinkedIn con, como mucho, uno de la web: mismo tipo y mismo nombre
 * (o título, en la formación). Cuando una organización aparece varias veces gana el par con el
 * inicio más cercano, así que dos puestos en la misma empresa siguen siendo dos.
 */
function pairEntries(
	site: readonly ExperienceEntry[],
	imported: readonly ImportedEntry[],
): Map<number, number> {
	const pairings: Pairing[] = [];

	imported.forEach((entry, importedIndex) => {
		const names = new Set(
			[entry.organization, ...entry.aliases].map(nameKey),
		);

		site.forEach((current, siteIndex) => {
			if (
				current.kind !== entry.kind ||
				!current.organization ||
				!names.has(nameKey(current.organization))
			) {
				return;
			}

			const gap = Math.abs(yearOf(current.start) - yearOf(entry.start));
			if (gap > MAX_START_GAP_YEARS) return;

			pairings.push({
				imported: importedIndex,
				site: siteIndex,
				distance: current.start === entry.start ? 0 : 1 + gap,
			});
		});
	});

	// El mejor par primero, sin depender del orden en que LinkedIn lista las posiciones.
	pairings.sort(
		(a, b) =>
			a.distance - b.distance ||
			a.imported - b.imported ||
			a.site - b.site,
	);

	const matches = new Map<number, number>();
	const taken = new Set<number>();
	for (const { imported: importedIndex, site: siteIndex } of pairings) {
		if (matches.has(importedIndex) || taken.has(siteIndex)) continue;
		matches.set(importedIndex, siteIndex);
		taken.add(siteIndex);
	}

	return matches;
}

function dateChanges(
	current: ExperienceEntry,
	entry: ImportedEntry,
): DateChange[] {
	const changes: DateChange[] = [];

	if (!addsNothing(current.start, entry.start)) {
		changes.push({ field: 'start', from: current.start, to: entry.start });
	}
	if (!addsNothing(current.end, entry.end)) {
		changes.push({ field: 'end', from: current.end, to: entry.end });
	}

	return changes;
}

/**
 * Qué hay que cambiar en `experience.yaml` para que coincida con LinkedIn. Solo mueve fechas y
 * añade registros: nunca reescribe un texto ya escrito ni borra nada.
 */
export function planMerge(
	site: readonly ExperienceEntry[],
	imported: readonly ImportedEntry[],
	{ addNew = true, kinds }: MergeOptions = {},
): MergePlan {
	const matches = pairEntries(site, imported);
	const ids = new Set(site.map((entry) => entry.id));
	const plan: MergePlan = {
		updates: [],
		additions: [],
		unchanged: [],
		onlyOnSite: [],
	};

	const uniqueId = (base: string): string => {
		let id = base;
		for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
		ids.add(id);

		return id;
	};

	imported.forEach((entry, importedIndex) => {
		const siteIndex = matches.get(importedIndex);
		const current = siteIndex === undefined ? undefined : site[siteIndex];

		if (current) {
			const changes = dateChanges(current, entry);
			if (changes.length > 0)
				plan.updates.push({ id: current.id, changes });
			else plan.unchanged.push(current.id);
		} else if (addNew) {
			plan.additions.push({
				id: uniqueId(
					`${slugify(entry.organization)}-${yearOf(entry.start)}`,
				),
				kind: entry.kind,
				organization: entry.organization,
				role: { es: entry.role },
				// El esquema exige resumen: sin descripción en LinkedIn, el rol hace de resumen.
				summary: { es: entry.summary ?? entry.role },
				start: entry.start,
				end: entry.end,
			});
		}
	});

	const matched = new Set(matches.values());
	plan.onlyOnSite = site
		.filter(
			(entry, siteIndex) =>
				!matched.has(siteIndex) &&
				(!kinds || kinds.includes(entry.kind)),
		)
		.map((entry) => entry.id);

	return plan;
}
