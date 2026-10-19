/**
 * Anchors of the page sections. They are those of the v1 site (`#about-me`, `#resume`, …):
 * keeping them means old links, from a CV or LinkedIn for example, still arrive.
 * The order is the folder's: that of the tabs and that of the sheets.
 */
export const SECTION_IDS = {
	home: 'home',
	about: 'about-me',
	resume: 'resume',
	certifications: 'certifications',
	projects: 'portfolio',
	contact: 'contact',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];
