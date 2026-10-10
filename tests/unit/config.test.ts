import { describe, expect, it } from 'vitest';
import config from '../../astro.config.mjs';
import { DEFAULT_LOCALE, LOCALES } from '../../src/lib/i18n';

// Los idiomas viven en dos sitios (la config de Astro y `src/lib/i18n.ts`); este test los mantiene en sync.
describe('astro.config.mjs i18n', () => {
	it('declares exactly the locales of src/lib/i18n.ts', () => {
		expect(config.i18n?.locales).toEqual([...LOCALES]);
	});

	it('uses the same default locale as src/lib/i18n.ts', () => {
		expect(config.i18n?.defaultLocale).toBe(DEFAULT_LOCALE);
	});
});
