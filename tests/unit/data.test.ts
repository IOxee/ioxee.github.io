import { existsSync, readFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import type { DocumentOptions, ParseOptions, SchemaOptions } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
	certificationSchema,
	experienceSchema,
	languageSchema,
	profileSchema,
	projectSchema,
	skillSchema,
} from '../../src/lib/schemas';

const DATA_DIR = new URL('../../src/data/', import.meta.url);

// Same options the Astro `file()` loader uses, so the test and the build
// interpret the YAML files the same way (e.g. an unquoted date is a `Date` in both).
const YAML_OPTIONS: ParseOptions & DocumentOptions & SchemaOptions = {
	schema: 'core',
	customTags: ['timestamp'],
	merge: true,
};

// The schema already validates shapes, https links and end >= start; here only what crosses records.
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

describe('project screenshots', () => {
	const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

	it('has a source image in src/assets/projects named after every project id', () => {
		const missing = load('projects.yaml', projectSchema)
			.map((project) => project.id)
			.filter(
				(id) =>
					!EXTENSIONS.some((extension) =>
						existsSync(
							new URL(
								`../../src/assets/projects/${id}.${extension}`,
								import.meta.url,
							),
						),
					),
			);

		expect(missing).toEqual([]);
	});
});

describe('src/data/certifications.yaml', () => {
	// May be empty: without certifications the folder has no such section.
	it('is a valid list, possibly empty, with no duplicate ids', () => {
		const certifications = load('certifications.yaml', certificationSchema);

		expect(duplicateIds(certifications)).toEqual([]);
	});
});

describe('display order of projects and languages', () => {
	const repeated = (items: readonly { order: number }[]): number[] =>
		items
			.map((item) => item.order)
			.filter((order, index, all) => all.indexOf(order) !== index);

	it('has no repeated order within a collection', () => {
		expect(repeated(load('languages.yaml', languageSchema))).toEqual([]);
		expect(
			repeated(load('certifications.yaml', certificationSchema)),
		).toEqual([]);
	});
});

describe('src/data/languages.yaml', () => {
	it('has no duplicate ids', () => {
		expect(duplicateIds(load('languages.yaml', languageSchema))).toEqual(
			[],
		);
	});
});
