import type { CollectionEntry } from 'astro:content';
import type {
	Certification,
	ExperienceEntry,
	Language,
	Profile,
	Project,
	Skill,
} from '../../src/lib/schemas';

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

/**
 * Type-only check (validated by `astro check`, not Vitest): each collection must
 * keep exactly the type of its Zod schema. If `content.config.ts` loses it,
 * `data` becomes `unknown` and this assignment stops compiling.
 */
export const collectionTypesMatchTheirSchemas: [
	Equal<CollectionEntry<'profile'>['data'], Profile>,
	Equal<CollectionEntry<'experience'>['data'], ExperienceEntry>,
	Equal<CollectionEntry<'skills'>['data'], Skill>,
	Equal<CollectionEntry<'projects'>['data'], Project>,
	Equal<CollectionEntry<'languages'>['data'], Language>,
	Equal<CollectionEntry<'certifications'>['data'], Certification>,
] = [true, true, true, true, true, true];
