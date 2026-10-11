import { type Locale, localize } from './i18n';
import type { ExperienceEntry, Profile, Skill } from './schemas';

/** `og:locale` de cada idioma: Open Graph usa `idioma_PAÍS`, no las etiquetas BCP 47 de `lang`. */
export const OG_LOCALES = {
	es: 'es_ES',
	ca: 'ca_ES',
	en: 'en_US',
} as const satisfies Record<Locale, string>;

/** La imagen que se ve al compartir el enlace. La genera `npm run assets:og`: 1200×630 es el formato de Open Graph. */
export const OG_IMAGE = {
	path: '/og.jpg',
	width: 1200,
	height: 630,
	type: 'image/jpeg',
} as const;

/** Convierte una ruta del sitio en una URL absoluta, que es lo que exigen `og:image`, `canonical`… */
export function absoluteUrl(
	path: string,
	site: URL | string | undefined,
): string {
	if (!site) {
		throw new Error(
			'Falta `site` en astro.config.mjs: sin él no se pueden crear URLs absolutas',
		);
	}

	return new URL(path, site).href;
}

export interface PersonSeo {
	name: string;
	jobTitle: string;
	url: string;
	image: string;
	sameAs: readonly string[];
	/** Nombres de las organizaciones donde trabaja ahora. */
	worksFor: readonly string[];
	knowsAbout: readonly string[];
}

/** Solo se declara como "conoce" lo que se usa a diario o con soltura: lo básico no es un oficio. */
const KNOWN_SKILL_STATES: readonly Skill['state'][] = ['daily', 'comfortable'];

interface PersonSeoSource {
	profile: Profile;
	experience: readonly ExperienceEntry[];
	skills: readonly Skill[];
	locale: Locale;
	/** URL absoluta de la página y de una imagen de la persona. */
	url: string;
	image: string;
}

/** Los datos del sitio, ya listos para `siteJsonLd`. */
export function personSeoFrom({
	profile,
	experience,
	skills,
	locale,
	url,
	image,
}: PersonSeoSource): PersonSeo {
	return {
		name: profile.name,
		jobTitle: localize(profile.headline, locale),
		url,
		image,
		sameAs: [profile.links.github, profile.links.linkedin],
		worksFor: experience.flatMap((entry) =>
			entry.kind === 'work' && entry.end === null && entry.organization
				? [entry.organization]
				: [],
		),
		knowsAbout: skills
			.filter((skill) => KNOWN_SKILL_STATES.includes(skill.state))
			.map((skill) => skill.name),
	};
}

/**
 * Datos estructurados (schema.org): el sitio y la persona, enlazados por `@id`. El sitio lleva el
 * nombre de la persona para que el buscador lo enseñe en lugar del dominio. De la persona va solo
 * lo que ya es público en la página: nada de fecha de nacimiento ni de correo, que los
 * rastreadores recogerían sin que se vean.
 */
export function siteJsonLd(person: PersonSeo, locale: Locale) {
	const personId = `${person.url}#person`;

	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				name: person.name,
				url: person.url,
				inLanguage: locale,
				publisher: { '@id': personId },
			},
			{
				'@id': personId,
				'@type': 'Person',
				name: person.name,
				jobTitle: person.jobTitle,
				url: person.url,
				image: person.image,
				sameAs: [...person.sameAs],
				worksFor: person.worksFor.map((name) => ({
					'@type': 'Organization',
					name,
				})),
				knowsAbout: [...person.knowsAbout],
			},
		],
	};
}

/**
 * JSON listo para ir dentro de `<script type="application/ld+json">`. Se escapan `<`, `>` y `&`
 * (si no, un texto con `</script>` cerraría la etiqueta) y los separadores de línea U+2028/9.
 */
export function serializeJsonLd(data: object): string {
	return JSON.stringify(data)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
