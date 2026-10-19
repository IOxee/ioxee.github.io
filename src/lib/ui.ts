import type { Locale } from './i18n';

type Dictionaries<K extends string> = {
	es: Record<K, string>;
	ca?: Partial<Record<K, string>>;
	en?: Partial<Record<K, string>>;
};

/** Texto de interfaz en `locale`, o en español si ese idioma aún no lo traduce. */
export function translate<K extends string>(
	dictionaries: Dictionaries<K>,
	locale: Locale,
	// `NoInfer`: las claves válidas las fijan los diccionarios, no el argumento.
	key: NoInfer<K>,
): string {
	return dictionaries[locale]?.[key] ?? dictionaries.es[key];
}

const es = {
	'a11y.skipToContent': 'Saltar al contenido',
	'meta.title': '{name} - Portfolio de programador full-stack',
	'meta.description':
		'Portfolio de {name}, programador full-stack en Cataluña: experiencia, habilidades y proyectos con C#, SQL y videojuegos.',
	'meta.imageAlt':
		'Carpeta amarilla con la foto y el nombre de {name}, programador full-stack, sobre una mesa de trabajo',
	'notFound.title': 'Esta página no está en el inventario',
	'notFound.pageTitle': 'Página no encontrada - {name}',
	'notFound.description': 'La dirección no existe o se ha movido.',
	'notFound.stamp': 'Sin registro',
	'notFound.back': 'Volver al inicio',
	'nav.label': 'Principal',
	'lang.label': 'Idioma',
	'nav.about': 'Sobre mí',
	'nav.resume': 'Experiencia',
	'nav.projects': 'Proyectos',
	'nav.contact': 'Contacto',
	'nav.certifications': 'Certificaciones',
	'section.certifications': 'Certificaciones',
	'cert.validUntil': 'Vigente hasta {date}',
	'cert.expired': 'Caducada en {date}',
	'cert.verify': 'Comprobar credencial',
	'cert.verifyLabel': 'Comprobar credencial: {name}',
	'cert.imageAlt': 'Certificado: {name}',
	'cert.imageLabel': 'Ver en grande el certificado: {name}',
	'cert.document': 'Ver documento (PDF)',
	'cert.documentLabel': 'Ver documento (PDF): {name}',
	'viewer.close': 'Cerrar',
	'viewer.newTab': 'Abrir en otra pestaña',
	'viewer.frameTitle': 'Documento: {name}',
	'folder.label': 'Carpeta con las hojas del portfolio',
	'folder.tab': 'Portfolio',
	'folder.scrollHint': 'Haz scroll',
	'folder.prev': 'Hoja anterior',
	'folder.next': 'Hoja siguiente',
	'folder.help':
		'Las hojas giran con la rueda del ratón, las flechas del teclado, deslizando el dedo o desde el menú.',
	'folder.part': '{label} ({n} de {total})',
	'folder.statusCover': 'Portada: {title}',
	'folder.statusOne': 'Página {page} de {total}: {title}',
	'folder.statusTwo': 'Páginas {left} y {right} de {total}: {title}',
	'theme.toNight': 'Modo oscuro',
	'theme.toDay': 'Modo claro',
	'card.photoAlt': 'Ilustración de {name} con auriculares y un portátil',
	'card.age': 'Edad',
	'section.about': 'Sobre mí',
	'section.experience': 'Experiencia',
	'section.education': 'Formación',
	'section.skills': 'Habilidades',
	'section.languages': 'Idiomas',
	'section.projects': 'Proyectos',
	'section.contact': 'Contacto',
	'period.present': 'Actualidad',
	'skill.category.backend': 'Backend',
	'skill.category.frontend': 'Frontend',
	'skill.category.data': 'Datos',
	'skill.state.daily': 'Uso diario',
	'skill.state.comfortable': 'Con soltura',
	'skill.state.intermediate': 'Intermedio',
	'skill.state.basic': 'Básico',
	'language.level.native': 'Nativo',
	'language.level.high': 'Alto',
	'language.level.medium': 'Medio',
	'language.level.basic': 'Básico',
	'mission.repo': 'Ver repositorio',
	'mission.repoLabel': 'Ver repositorio de {name}',
	'contact.email': 'Correo',
	'contact.github': 'GitHub',
	'contact.linkedin': 'LinkedIn',
	'contact.cv': 'Descargar CV',
	'footer.rights': 'Todos los derechos reservados',
} as const;

export type UiKey = keyof typeof es;

// Las traducciones se tipan como completas: una clave sin traducir es un error al compilar, no un
// texto en español dentro de una página en inglés. Lo que sí cae al español es el contenido de los
// YAML (`localize`), que se traduce a su ritmo.
const en: Record<UiKey, string> = {
	'a11y.skipToContent': 'Skip to content',
	'meta.title': '{name} - Full-stack developer portfolio',
	'meta.description':
		'Portfolio of {name}, a full-stack developer in Catalonia: experience, skills and projects with C#, SQL and video games.',
	'meta.imageAlt':
		'Yellow folder with the photo and name of {name}, full-stack developer, on a work desk',
	'notFound.title': 'This page is not in the inventory',
	'notFound.pageTitle': 'Page not found - {name}',
	'notFound.description': 'The address does not exist or has moved.',
	'notFound.stamp': 'Not on file',
	'notFound.back': 'Back to home',
	'nav.label': 'Main',
	'lang.label': 'Language',
	'nav.about': 'About me',
	'nav.resume': 'Experience',
	'nav.projects': 'Projects',
	'nav.contact': 'Contact',
	'nav.certifications': 'Certifications',
	'section.certifications': 'Certifications',
	'cert.validUntil': 'Valid until {date}',
	'cert.expired': 'Expired on {date}',
	'cert.verify': 'Verify credential',
	'cert.verifyLabel': 'Verify credential: {name}',
	'cert.imageAlt': 'Certificate: {name}',
	'cert.imageLabel': 'View the certificate larger: {name}',
	'cert.document': 'View document (PDF)',
	'cert.documentLabel': 'View document (PDF): {name}',
	'viewer.close': 'Close',
	'viewer.newTab': 'Open in a new tab',
	'viewer.frameTitle': 'Document: {name}',
	'folder.label': 'Folder with the portfolio sheets',
	'folder.tab': 'Portfolio',
	'folder.scrollHint': 'Scroll down',
	'folder.prev': 'Previous sheet',
	'folder.next': 'Next sheet',
	'folder.help':
		'The sheets turn with the mouse wheel, the keyboard arrows, a swipe of the finger or from the menu.',
	'folder.part': '{label} ({n} of {total})',
	'folder.statusCover': 'Cover: {title}',
	'folder.statusOne': 'Page {page} of {total}: {title}',
	'folder.statusTwo': 'Pages {left} and {right} of {total}: {title}',
	'theme.toNight': 'Dark mode',
	'theme.toDay': 'Light mode',
	'card.photoAlt': 'Illustration of {name} with headphones and a laptop',
	'card.age': 'Age',
	'section.about': 'About me',
	'section.experience': 'Experience',
	'section.education': 'Education',
	'section.skills': 'Skills',
	'section.languages': 'Languages',
	'section.projects': 'Projects',
	'section.contact': 'Contact',
	'period.present': 'Present',
	'skill.category.backend': 'Backend',
	'skill.category.frontend': 'Frontend',
	'skill.category.data': 'Data',
	'skill.state.daily': 'Daily use',
	'skill.state.comfortable': 'Comfortable',
	'skill.state.intermediate': 'Intermediate',
	'skill.state.basic': 'Basic',
	'language.level.native': 'Native',
	'language.level.high': 'High',
	'language.level.medium': 'Medium',
	'language.level.basic': 'Basic',
	'mission.repo': 'View repository',
	'mission.repoLabel': 'View repository: {name}',
	'contact.email': 'Email',
	'contact.github': 'GitHub',
	'contact.linkedin': 'LinkedIn',
	'contact.cv': 'Download CV',
	'footer.rights': 'All rights reserved',
};

const ca: Record<UiKey, string> = {
	'a11y.skipToContent': 'Salta al contingut',
	'meta.title': '{name} - Portfolio de programador full-stack',
	'meta.description':
		'Portfolio de {name}, programador full-stack a Catalunya: experiència, habilitats i projectes amb C#, SQL i videojocs.',
	'meta.imageAlt':
		'Carpeta groga amb la foto i el nom de {name}, programador full-stack, sobre una taula de treball',
	'notFound.title': "Aquesta pàgina no és a l'inventari",
	'notFound.pageTitle': 'Pàgina no trobada - {name}',
	'notFound.description': "L'adreça no existeix o s'ha mogut.",
	'notFound.stamp': 'Sense registre',
	'notFound.back': "Torna a l'inici",
	'nav.label': 'Principal',
	'lang.label': 'Idioma',
	'nav.about': 'Sobre mi',
	'nav.resume': 'Experiència',
	'nav.projects': 'Projectes',
	'nav.contact': 'Contacte',
	'nav.certifications': 'Certificacions',
	'section.certifications': 'Certificacions',
	'cert.validUntil': 'Vigent fins al {date}',
	'cert.expired': 'Caducada el {date}',
	'cert.verify': 'Comprova la credencial',
	'cert.verifyLabel': 'Comprova la credencial: {name}',
	'cert.imageAlt': 'Certificat: {name}',
	'cert.imageLabel': 'Veure el certificat en gran: {name}',
	'cert.document': 'Veure el document (PDF)',
	'cert.documentLabel': 'Veure el document (PDF): {name}',
	'viewer.close': 'Tanca',
	'viewer.newTab': 'Obre en una pestanya nova',
	'viewer.frameTitle': 'Document: {name}',
	'folder.label': 'Carpeta amb els fulls del portfolio',
	'folder.tab': 'Portfolio',
	'folder.scrollHint': 'Fes scroll',
	'folder.prev': 'Full anterior',
	'folder.next': 'Full següent',
	'folder.help':
		'Els fulls giren amb la roda del ratolí, amb les fletxes del teclat, lliscant el dit o des del menú.',
	'folder.part': '{label} ({n} de {total})',
	'folder.statusCover': 'Coberta: {title}',
	'folder.statusOne': 'Pàgina {page} de {total}: {title}',
	'folder.statusTwo': 'Pàgines {left} i {right} de {total}: {title}',
	'theme.toNight': 'Mode fosc',
	'theme.toDay': 'Mode clar',
	'card.photoAlt': 'Il·lustració de {name} amb auriculars i un portàtil',
	'card.age': 'Edat',
	'section.about': 'Sobre mi',
	'section.experience': 'Experiència',
	'section.education': 'Formació',
	'section.skills': 'Habilitats',
	'section.languages': 'Idiomes',
	'section.projects': 'Projectes',
	'section.contact': 'Contacte',
	'period.present': 'Actualitat',
	'skill.category.backend': 'Backend',
	'skill.category.frontend': 'Frontend',
	'skill.category.data': 'Dades',
	'skill.state.daily': 'Ús diari',
	'skill.state.comfortable': 'Amb soltesa',
	'skill.state.intermediate': 'Intermedi',
	'skill.state.basic': 'Bàsic',
	'language.level.native': 'Natiu',
	'language.level.high': 'Alt',
	'language.level.medium': 'Mitjà',
	'language.level.basic': 'Bàsic',
	'mission.repo': 'Veure el repositori',
	'mission.repoLabel': 'Veure el repositori de {name}',
	'contact.email': 'Correu',
	'contact.github': 'GitHub',
	'contact.linkedin': 'LinkedIn',
	'contact.cv': 'Descarrega el CV',
	'footer.rights': 'Tots els drets reservats',
};

export const dictionaries: Dictionaries<UiKey> = { es, ca, en };

export const t = (locale: Locale, key: UiKey): string =>
	translate(dictionaries, locale, key);

const YEARS = {
	es: {
		less: 'menos de 1 año',
		one: '1 año',
		many: (n: number) => `${n} años`,
	},
	ca: {
		less: "menys d'1 any",
		one: '1 any',
		many: (n: number) => `${n} anys`,
	},
	en: {
		less: 'less than 1 year',
		one: '1 year',
		many: (n: number) => `${n} years`,
	},
} satisfies Record<
	Locale,
	{ less: string; one: string; many: (n: number) => string }
>;

export function formatYears(years: number, locale: Locale): string {
	if (!Number.isInteger(years) || years < 0) {
		throw new RangeError(`Número de años no válido: ${years}`);
	}

	const text = YEARS[locale];
	if (years === 0) return text.less;

	return years === 1 ? text.one : text.many(years);
}
