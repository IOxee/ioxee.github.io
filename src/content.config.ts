import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import {
	certificationSchema,
	experienceSchema,
	languageSchema,
	profileSchema,
	projectSchema,
	skillSchema,
} from './lib/schemas';

// Una violación del esquema hace fallar el build, pero un YAML mal formado o una entrada sin `id` solo se registra
// y deja la colección vacía o incompleta: por eso `tests/unit/data.test.ts` corre antes de cada despliegue.
//
// Las llamadas son explícitas a propósito: con un helper genérico `entry.data` pasa a `unknown`
// (lo vigila `tests/types/collections.check.ts`).
const yaml = (name: string) => file(`src/data/${name}.yaml`);

export const collections = {
	profile: defineCollection({
		loader: yaml('profile'),
		schema: profileSchema,
	}),
	experience: defineCollection({
		loader: yaml('experience'),
		schema: experienceSchema,
	}),
	skills: defineCollection({ loader: yaml('skills'), schema: skillSchema }),
	projects: defineCollection({
		loader: yaml('projects'),
		schema: projectSchema,
	}),
	languages: defineCollection({
		loader: yaml('languages'),
		schema: languageSchema,
	}),
	certifications: defineCollection({
		loader: yaml('certifications'),
		schema: certificationSchema,
	}),
};
