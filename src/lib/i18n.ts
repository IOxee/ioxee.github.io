export const LOCALES = ['es', 'ca', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

// Debe coincidir con `i18n.defaultLocale` de astro.config.mjs. Es el literal 'es' (no el
// tipo `Locale`) porque `Localized` exige ese campo, y así `localize` siempre tiene reserva.
export const DEFAULT_LOCALE = 'es' satisfies Locale;

/**
 * En el orden en que se ofrecen, el principal primero. `name` es el idioma escrito en sí mismo y contiene la sigla
 * (`label`): el nombre accesible de un enlace tiene que incluir el texto que se ve.
 */
export const LANGUAGES = [
	{ locale: 'es', label: 'ES', name: 'Español' },
	{ locale: 'en', label: 'EN', name: 'English' },
	{ locale: 'ca', label: 'CA', name: 'Català' },
] as const satisfies readonly { locale: Locale; label: string; name: string }[];

export function localePath(locale: Locale): string {
	return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

/** Un valor con traducciones opcionales; el español es obligatorio porque es el idioma de reserva. */
export type Localized<T> = { es: T; ca?: T | undefined; en?: T | undefined };

export function localize<T>(text: Localized<T>, locale: Locale): T {
	return text[locale] ?? text[DEFAULT_LOCALE];
}
