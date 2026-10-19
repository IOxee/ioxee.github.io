import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color';
import { PALETTES, THEMES, themeCss } from './theme';

const kebab = (token: string): string =>
	token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe.each(THEMES)('palette %s', (theme) => {
	const palette = PALETTES[theme];

	it('keeps the body ink on paper at AAA contrast (7:1)', () => {
		expect(
			contrastRatio(palette.ink, palette.paper),
		).toBeGreaterThanOrEqual(7);
	});

	it('keeps the muted ink on paper at AA contrast (4.5:1)', () => {
		expect(
			contrastRatio(palette.inkMuted, palette.paper),
		).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps the ink readable on the darker paper used for mounts and tabs', () => {
		expect(
			contrastRatio(palette.ink, palette.paperShade),
		).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps links on paper at AA contrast (4.5:1)', () => {
		expect(
			contrastRatio(palette.accent, palette.paper),
		).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps the stamp visible on paper (3:1, it is large graphic text)', () => {
		expect(
			contrastRatio(palette.stamp, palette.paper),
		).toBeGreaterThanOrEqual(3);
	});

	// The white sheets of the folder are another paper: what is read on them has its own contrast.
	it('keeps the ink, the muted ink and the links readable on the document sheets', () => {
		expect(
			contrastRatio(palette.ink, palette.sheet),
		).toBeGreaterThanOrEqual(7);
		expect(
			contrastRatio(palette.inkMuted, palette.sheet),
		).toBeGreaterThanOrEqual(4.5);
		expect(
			contrastRatio(palette.accent, palette.sheet),
		).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps the ink readable on the folder and on its darker tab, and the stamp visible on the folder', () => {
		expect(
			contrastRatio(palette.ink, palette.folder),
		).toBeGreaterThanOrEqual(7);
		expect(
			contrastRatio(palette.ink, palette.folderShade),
		).toBeGreaterThanOrEqual(4.5);
		expect(
			contrastRatio(palette.stamp, palette.folder),
		).toBeGreaterThanOrEqual(3);
	});

	// The focus is two-tone: an ink ring (visible on the paper) and an `onDesk` halo (visible
	// on the desk). A single color cannot have 3:1 against both at once; that is why these
	// two contrasts, together with that of `ink`/`paper`, are the ones that guarantee it.
	it('keeps text and the focus halo that sit on the desk at AA contrast (4.5:1)', () => {
		expect(
			contrastRatio(palette.onDesk, palette.desk),
		).toBeGreaterThanOrEqual(4.5);
	});
});

describe('themeCss', () => {
	const css = themeCss();

	it.each(THEMES)('emits a rule for the %s theme', (theme) => {
		expect(css).toContain(`[data-theme='${theme}']`);
	});

	it('declares every token as a custom property in every rule', () => {
		const tokens = Object.keys(PALETTES.day);

		for (const token of tokens) {
			const occurrences = css.split(`--${kebab(token)}:`).length - 1;
			expect(occurrences, token).toBe(THEMES.length);
		}
	});

	it('sets color-scheme so native controls follow the theme', () => {
		expect(css).toMatch(/\[data-theme='day'\] \{\s*color-scheme: light;/);
		expect(css).toMatch(/\[data-theme='night'\] \{\s*color-scheme: dark;/);
	});
});
