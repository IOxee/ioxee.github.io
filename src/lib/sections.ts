/**
 * Anclas de las secciones de la página. Son las del sitio v1 (`#about-me`, `#resume`, …):
 * mantenerlas hace que los enlaces antiguos, por ejemplo desde un CV o LinkedIn, sigan llegando.
 * El orden es el de la carpeta: el de las pestañas y el de las hojas.
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
