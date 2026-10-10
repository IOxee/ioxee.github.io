export const LOCALES = ['es', 'ca', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

// Debe coincidir con `i18n.defaultLocale` de astro.config.mjs. Es el literal 'es' (no el
// tipo `Locale`) porque `Localized` exige ese campo, y así `localize` siempre tiene reserva.
export const DEFAULT_LOCALE = 'es' satisfies Locale;

/** Un valor con traducciones opcionales; el español es obligatorio porque es el idioma de reserva. */
export type Localized<T> = { es: T; ca?: T | undefined; en?: T | undefined };

export function localize<T>(text: Localized<T>, locale: Locale): T {
	return text[locale] ?? text[DEFAULT_LOCALE];
}
