import { readFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import type { DocumentOptions, ParseOptions, SchemaOptions } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
	experienceSchema,
	languageSchema,
	profileSchema,
	projectSchema,
	skillSchema,
} from '../../src/lib/schemas';

const DATA_DIR = new URL('../../src/data/', import.meta.url);

// Mismas opciones que usa el loader `file()` de Astro, para que el test y el build
// interpreten igual los YAML (p. ej. una fecha sin comillas es un `Date` en ambos).
const YAML_OPTIONS: ParseOptions & DocumentOptions & SchemaOptions = {
	schema: 'core',
	customTags: ['timestamp'],
	merge: true,
};

// El esquema ya valida formas, enlaces https y fin >= inicio; aquí solo lo que cruza registros.
const load = <T>(file: string, schema: z.ZodType<T>): T[] =>
	z
		.array(schema)
		.parse(
			parse(readFileSync(new URL(file, DATA_DIR), 'utf8'), YAML_OPTIONS),
		);

const duplicateIds = (items: readonly { id: string }[]): string[] =>
	items
		.map((item) => item.id)
		.filter((id, index, all) => all.indexOf(id) !== index);

describe('src/data/profile.yaml', () => {
	it('holds exactly one profile', () => {
		expect(load('profile.yaml', profileSchema)).toHaveLength(1);
	});
});

describe('src/data/experience.yaml', () => {
	const entries = load('experience.yaml', experienceSchema);

	it('has no duplicate ids', () => {
		expect(duplicateIds(entries)).toEqual([]);
	});

	it('has both work and education entries', () => {
		expect(entries.some((item) => item.kind === 'work')).toBe(true);
		expect(entries.some((item) => item.kind === 'education')).toBe(true);
	});
});

describe('src/data/skills.yaml', () => {
	const skills = load('skills.yaml', skillSchema);

	it('has no duplicate ids', () => {
		expect(duplicateIds(skills)).toEqual([]);
	});

	it('never starts in the future', () => {
		const currentYear = new Date().getFullYear();

		expect(
			skills
				.filter((item) => item.since > currentYear)
				.map((item) => item.id),
		).toEqual([]);
	});
});

describe('src/data/projects.yaml', () => {
	it('has no duplicate ids', () => {
		expect(duplicateIds(load('projects.yaml', projectSchema))).toEqual([]);
	});
});

describe('src/data/languages.yaml', () => {
	it('has no duplicate ids', () => {
		expect(duplicateIds(load('languages.yaml', languageSchema))).toEqual(
			[],
		);
	});
});
