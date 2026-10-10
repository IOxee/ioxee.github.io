/**
 * Anclas de las secciones de la página. Son las del sitio v1 (`#about-me`, `#resume`, …):
 * mantenerlas hace que los enlaces antiguos, por ejemplo desde un CV o LinkedIn, sigan llegando.
 */
export const SECTION_IDS = {
	home: 'home',
	about: 'about-me',
	resume: 'resume',
	projects: 'portfolio',
	contact: 'contact',
} as const;
