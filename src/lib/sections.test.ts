import { describe, expect, it } from 'vitest';
import { SECTION_IDS } from './sections';

describe('SECTION_IDS', () => {
	it('keeps the anchors of the v1 site so old links keep working', () => {
		expect(SECTION_IDS).toEqual({
			home: 'home',
			about: 'about-me',
			resume: 'resume',
			projects: 'portfolio',
			contact: 'contact',
		});
	});

	it('has no repeated ids, which would make two sections share an anchor', () => {
		const ids = Object.values(SECTION_IDS);

		expect(new Set(ids).size).toBe(ids.length);
	});
});
