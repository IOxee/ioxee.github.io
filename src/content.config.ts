import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import {
	experienceSchema,
	languageSchema,
	profileSchema,
	projectSchema,
	skillSchema,
} from './lib/schemas';

// Cada colección es un único YAML (lista de objetos con `id`) validado con su esquema Zod.
//
// Ojo con lo que sí y lo que no frena el build: una violación del esquema lo hace fallar,
// pero un YAML mal formado, o una entrada sin `id`, solo se registra como error y deja la
// colección vacía o incompleta. Por eso `npm run test:coverage` (tests/unit/data.test.ts)
// se ejecuta antes de cada despliegue.
//
// Las cinco llamadas son explícitas a propósito: si se envuelven en un helper genérico,
// TypeScript pierde el tipo del esquema y `entry.data` pasa a ser `unknown`
// (lo vigila tests/types/collections.check.ts).
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
};
