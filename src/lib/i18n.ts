export const LOCALES = ['es', 'ca', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

// Must match `i18n.defaultLocale` in astro.config.mjs. It is the literal 'es' (not the
// `Locale` type) because `Localized` requires that field, and that way `localize` always has a fallback.
export const DEFAULT_LOCALE = 'es' satisfies Locale;

/**
 * In the order they are offered, the main one first. `name` is the language written in itself and contains the abbreviation
 * (`label`): the accessible name of a link has to include the visible text.
 */
export const LANGUAGES = [
	{ locale: 'es', label: 'ES', name: 'Español' },
	{ locale: 'en', label: 'EN', name: 'English' },
	{ locale: 'ca', label: 'CA', name: 'Català' },
] as const satisfies readonly { locale: Locale; label: string; name: string }[];

export function localePath(locale: Locale): string {
	return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

/** A value with optional translations; Spanish is mandatory because it is the fallback language. */
export type Localized<T> = { es: T; ca?: T | undefined; en?: T | undefined };

export function localize<T>(text: Localized<T>, locale: Locale): T {
	return text[locale] ?? text[DEFAULT_LOCALE];
}
