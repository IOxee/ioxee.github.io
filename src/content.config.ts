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

// A schema violation fails the build, but a malformed YAML or an entry without an `id` is only logged
// and leaves the collection empty or incomplete: that is why `tests/unit/data.test.ts` runs before every deploy.
//
// The calls are explicit on purpose: with a generic helper `entry.data` becomes `unknown`
// (guarded by `tests/types/collections.check.ts`).
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
