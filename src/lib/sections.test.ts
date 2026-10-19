import { describe, expect, it } from 'vitest';
import { SECTION_IDS } from './sections';

describe('SECTION_IDS', () => {
	it('keeps the anchors of the v1 site so old links keep working', () => {
		expect(SECTION_IDS).toEqual({
			home: 'home',
			about: 'about-me',
			resume: 'resume',
			certifications: 'certifications',
			projects: 'portfolio',
			contact: 'contact',
		});
	});

	it('lists the sections in the order they appear in the folder', () => {
		expect(Object.keys(SECTION_IDS)).toEqual([
			'home',
			'about',
			'resume',
			'certifications',
			'projects',
			'contact',
		]);
	});

	it('has no repeated ids, which would make two sections share an anchor', () => {
		const ids = Object.values(SECTION_IDS);

		expect(new Set(ids).size).toBe(ids.length);
	});
});
