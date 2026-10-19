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
 * Comprobación solo de tipos (la valida `astro check`, no Vitest): cada colección debe
 * conservar exactamente el tipo de su esquema Zod. Si `content.config.ts` lo pierde,
 * `data` pasa a ser `unknown` y esta asignación deja de compilar.
 */
export const collectionTypesMatchTheirSchemas: [
	Equal<CollectionEntry<'profile'>['data'], Profile>,
	Equal<CollectionEntry<'experience'>['data'], ExperienceEntry>,
	Equal<CollectionEntry<'skills'>['data'], Skill>,
	Equal<CollectionEntry<'projects'>['data'], Project>,
	Equal<CollectionEntry<'languages'>['data'], Language>,
	Equal<CollectionEntry<'certifications'>['data'], Certification>,
] = [true, true, true, true, true, true];
