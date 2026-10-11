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
		'Cartilla de superviviente de {name}, programador full-stack, sobre una mesa de trabajo',
	'notFound.title': 'Esta página no está en el inventario',
	'notFound.pageTitle': 'Página no encontrada - {name}',
	'notFound.description': 'La dirección no existe o se ha movido.',
	'notFound.stamp': 'Sin registro',
	'notFound.back': 'Volver al inicio',
	'nav.label': 'Principal',
	'nav.about': 'Sobre mí',
	'nav.resume': 'Experiencia',
	'nav.projects': 'Proyectos',
	'nav.contact': 'Contacto',
	'theme.toNight': 'Pasar a noche',
	'theme.toDay': 'Pasar a día',
	'card.title': 'Cartilla de superviviente',
	'card.photoAlt': 'Ilustración de {name} con auriculares y un portátil',
	'card.trade': 'Oficio',
	'card.base': 'Base',
	'card.age': 'Edad',
	'card.issued': 'Expedida',
	'card.stamp': 'En activo',
	'section.about': 'Sobre mí',
	'section.experience': 'Experiencia',
	'section.education': 'Formación',
	'section.skills': 'Habilidades',
	'section.languages': 'Idiomas',
	'section.projects': 'Proyectos',
	'section.contact': 'Contacto',
	'about.nationality': 'Nacionalidad',
	'about.occupation': 'Ocupación',
	'about.cv': 'Descargar CV',
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
	'footer.rights': 'Todos los derechos reservados',
} as const;

export type UiKey = keyof typeof es;

// Catalán e inglés se añaden aquí cuando se traduzca la interfaz; mientras tanto caen al español.
const dictionaries: Dictionaries<UiKey> = { es, ca: {}, en: {} };

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

/** `menos de 1 año`, `1 año`, `8 años`… según el idioma. */
export function formatYears(years: number, locale: Locale): string {
	if (!Number.isInteger(years) || years < 0) {
		throw new RangeError(`Número de años no válido: ${years}`);
	}

	const text = YEARS[locale];
	if (years === 0) return text.less;

	return years === 1 ? text.one : text.many(years);
}
