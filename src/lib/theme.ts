export const THEMES = ['day', 'night'] as const;

export type ThemeId = (typeof THEMES)[number];

/** Todos los colores son `oklch()` opacos: `color.ts` mide su contraste y los tests lo exigen. */
export interface PaletteTokens {
	readonly desk: string;
	readonly paper: string;
	readonly paperShade: string;
	readonly ink: string;
	readonly inkMuted: string;
	/** Líneas decorativas (pautas, puntos guía). No lleva texto, así que no exige contraste. */
	readonly rule: string;
	readonly stamp: string;
	readonly accent: string;
	readonly tape: string;
	/** Texto y halo de foco que quedan directamente sobre la mesa. */
	readonly onDesk: string;
	readonly folder: string;
	readonly folderShade: string;
	readonly sheet: string;
	/** Cantos y sombras de la pila de hojas. Decorativo: no lleva texto, no exige contraste. */
	readonly sheetEdge: string;
}

/**
 * Multicopista: papel kraft, tinta violeta de copia (el morado de la ilustración) y cinta
 * amarilla. De día el papel está a plena luz; de noche, bajo una lámpara y sobre una mesa oscura.
 */
export const PALETTES: Record<ThemeId, PaletteTokens> = {
	day: {
		desk: 'oklch(30% 0.045 305)',
		paper: 'oklch(78% 0.08 75)',
		paperShade: 'oklch(70% 0.085 72)',
		ink: 'oklch(25% 0.1 300)',
		inkMuted: 'oklch(33% 0.1 300)',
		rule: 'oklch(48% 0.08 300)',
		stamp: 'oklch(38% 0.18 305)',
		accent: 'oklch(36% 0.15 300)',
		tape: 'oklch(86% 0.16 95)',
		onDesk: 'oklch(90% 0.04 300)',
		folder: 'oklch(84% 0.14 88)',
		folderShade: 'oklch(77% 0.135 85)',
		sheet: 'oklch(96% 0.02 92)',
		sheetEdge: 'oklch(86% 0.03 88)',
	},
	night: {
		desk: 'oklch(15% 0.035 305)',
		paper: 'oklch(70% 0.075 72)',
		paperShade: 'oklch(65% 0.08 70)',
		ink: 'oklch(19% 0.1 300)',
		inkMuted: 'oklch(25% 0.1 300)',
		rule: 'oklch(40% 0.08 300)',
		stamp: 'oklch(30% 0.17 305)',
		accent: 'oklch(28% 0.15 300)',
		tape: 'oklch(75% 0.15 92)',
		onDesk: 'oklch(80% 0.05 300)',
		folder: 'oklch(72% 0.12 85)',
		folderShade: 'oklch(65% 0.115 82)',
		sheet: 'oklch(88% 0.025 90)',
		sheetEdge: 'oklch(76% 0.03 86)',
	},
};

const kebab = (token: string): string =>
	token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Se selecciona con `data-theme` en `<html>`, que un script del `<head>` fija antes de pintar. */
export function themeCss(): string {
	return THEMES.map((theme) => {
		const tokens = Object.entries(PALETTES[theme])
			.map(([name, value]) => `\t--${kebab(name)}: ${value};`)
			.join('\n');

		return `[data-theme='${theme}'] {\n\tcolor-scheme: ${theme === 'day' ? 'light' : 'dark'};\n${tokens}\n}`;
	}).join('\n');
}
