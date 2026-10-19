export interface Oklch {
	readonly l: number;
	readonly c: number;
	readonly h: number;
}

type LinearRgb = readonly [number, number, number];

// `oklch(L C H)` opaco; L en porcentaje o en 0-1, H en grados con `deg` opcional.
const OKLCH =
	/^oklch\(\s*(\d*\.?\d+)(%?)\s+(\d*\.?\d+)\s+(\d*\.?\d+)(?:deg)?\s*\)$/i;

export function parseOklch(css: string): Oklch {
	const match = OKLCH.exec(css.trim());
	if (!match) {
		throw new RangeError(
			`Color no válido (se espera oklch(L C H) opaco): "${css}"`,
		);
	}

	const lightness = Number(match[1]);

	return {
		l: match[2] ? lightness / 100 : lightness,
		c: Number(match[3]),
		h: Number(match[4]),
	};
}

// OKLCH → OKLab → sRGB lineal (matrices de Björn Ottosson).
function toLinearSrgb({ l, c, h }: Oklch): LinearRgb {
	const hue = (h * Math.PI) / 180;
	const a = c * Math.cos(hue);
	const b = c * Math.sin(hue);

	const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

	return [
		4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
		-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
		-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
	];
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Los colores fuera de gamut sRGB se recortan canal a canal. */
function relativeLuminance(color: Oklch): number {
	const [r, g, b] = toLinearSrgb(color);

	return 0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b);
}

const encodeSrgb = (linear: number): number => {
	const value = clamp01(linear);

	return value <= 0.0031308
		? 12.92 * value
		: 1.055 * value ** (1 / 2.4) - 0.055;
};

export function oklchToHex(css: string): string {
	const [r, g, b] = toLinearSrgb(parseOklch(css));
	const channels = [r, g, b].map((channel) =>
		Math.round(encodeSrgb(channel) * 255)
			.toString(16)
			.padStart(2, '0'),
	);

	return `#${channels.join('')}`;
}

export function contrastRatio(foreground: string, background: string): number {
	const first = relativeLuminance(parseOklch(foreground));
	const second = relativeLuminance(parseOklch(background));

	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
