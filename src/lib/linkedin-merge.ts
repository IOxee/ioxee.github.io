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
	updates: EntryUpdate[];
	additions: NewEntry[];
	unchanged: string[];
	/** Site records that LinkedIn does not have. They are neither touched nor deleted. */
	onlyOnSite: string[];
}

export interface MergeOptions {
	addNew?: boolean;
	/**
	 * Record types LinkedIn has provided data for. The others are neither compared nor listed
	 * as "only on the web", but their ids still count so that new ones do not repeat them.
	 */
	kinds?: readonly ExperienceEntry['kind'][];
}

/** More years than this between two starts and it is a different stage at the same organization. */
const MAX_START_GAP_YEARS = 2;

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
 * Key for comparing names ignoring case, accents, spaces and symbols. It works for
 * any alphabet: "slugify" only keeps Latin and would merge different organizations.
 */
const nameKey = (text: string): string =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * `true` if LinkedIn adds nothing the site does not already know: the same date, or a year when the site
 * already has that year with a month (`2022` versus `2022-09`).
 */
const addsNothing = (site: string | null, linkedin: string | null): boolean =>
	site === linkedin ||
	(site !== null && linkedin !== null && site.startsWith(`${linkedin}-`));

const yearOf = (date: string): number => Number(date.slice(0, 4));

interface Pairing {
	imported: number;
	site: number;
	distance: number;
}

/**
 * Pairs each LinkedIn record with at most one site record: same type and same name
 * (or title, in education). When an organization appears several times the pair with the
 * closest start wins, so two positions at the same company remain two.
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

	// The best pair first, regardless of the order in which LinkedIn lists the positions.
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
				// The schema requires a summary: with no LinkedIn description, the role serves as the summary.
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
