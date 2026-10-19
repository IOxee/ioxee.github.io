import { type Page, expect } from '@playwright/test';

export const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const;

export const SCHEMES = ['light', 'dark'] as const;
export type Scheme = (typeof SCHEMES)[number];

export const SECTION_LINKS = [
	'#about-me',
	'#resume',
	'#portfolio',
	'#contact',
] as const;

declare global {
	interface Window {
		__cls: number;
		__violations: { directive: string; blocked: string }[];
		__themeAtBody?: string;
	}
}

export const VIEWPORT_HEIGHT = 900;

export interface FolderGeometry {
	/** `true` si la carpeta está fija y el scroll gira las hojas; si no, gira sola. */
	parallax: boolean;
	positions: number;
	step: number;
	/** Scroll al que la carpeta queda fija (el punto de lectura 0). */
	base: number;
}

export function folderGeometry(page: Page): Promise<FolderGeometry> {
	return page.evaluate(() => {
		const folder = document.querySelector<HTMLElement>('[data-folder]');
		const track = document.querySelector<HTMLElement>('[data-track]');
		const stage = document.querySelector<HTMLElement>('[data-stage]');
		if (!folder || !track || !stage) throw new Error('No hay carpeta');

		const pin = Number.parseFloat(getComputedStyle(stage).top) || 0;

		return {
			parallax: folder.dataset.scroll === 'on',
			positions: Number(folder.style.getPropertyValue('--positions')),
			step: Number.parseFloat(folder.style.getPropertyValue('--step')),
			base: track.getBoundingClientRect().top + scrollY - pin,
		};
	});
}

export function visiblePages(page: Page): Promise<number[]> {
	return page.evaluate(() =>
		[...document.querySelectorAll<HTMLElement>('[data-page]')]
			.filter((element) => !element.inert)
			.map((element) => Number(element.style.getPropertyValue('--i'))),
	);
}

/**
 * Lleva el scroll al punto de lectura `position` y espera a que la carpeta haya llegado: a que el
 * progreso sea justo ese y a que las hojas se hayan quedado quietas.
 */
export async function showPosition(
	page: Page,
	position: number,
): Promise<void> {
	const { step, base } = await folderGeometry(page);
	await page.evaluate(
		(top) => window.scrollTo({ top, behavior: 'instant' }),
		base + position * step,
	);

	await expect
		.poll(() =>
			page.evaluate(() =>
				Number.parseFloat(
					document
						.querySelector<HTMLElement>('[data-folder]')
						?.style.getPropertyValue('--progress') ?? 'NaN',
				),
			),
		)
		.toBeCloseTo(position, 1);
}

/**
 * Deja la página quieta: fuentes cargadas y todas las animaciones terminadas (el sello que cae al
 * cargar es la única que hay). Sin esto, una medida o una captura cogerían el sello a medio caer.
 */
export async function settle(page: Page): Promise<void> {
	await page.evaluate(async () => {
		await document.fonts.ready;
		// Las que no acaban nunca (la flecha que invita a bajar) no se esperan: no terminarían.
		await Promise.all(
			document
				.getAnimations()
				.filter(
					(animation) =>
						animation.effect?.getComputedTiming().endTime !==
						Infinity,
				)
				.map((animation) => animation.finished.catch(() => undefined)),
		);
	});
}

/**
 * Cuenta el cambio de maquetación acumulado (CLS) desde antes de que la página empiece a cargar.
 * Hay que llamarlo antes de `page.goto`.
 */
export async function trackLayoutShift(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.__cls = 0;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const shift = entry as PerformanceEntry & {
					value: number;
					hadRecentInput: boolean;
				};
				if (!shift.hadRecentInput) window.__cls += shift.value;
			}
		}).observe({ type: 'layout-shift', buffered: true });
	});
}

/**
 * Anota el tema que ya tiene la página en el instante en que se crea el `<body>`, es decir, antes
 * de que pinte nada. Un script del tema que llegara tarde dejaría ahí el valor por defecto y la
 * página parpadearía, aunque al final del todo el tema fuera el correcto. Hay que llamarlo antes
 * de `page.goto`; el valor queda en `window.__themeAtBody`.
 */
export async function trackThemeAtBody(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const observer = new MutationObserver(() => {
			if (!document.body) return;

			window.__themeAtBody = document.documentElement.dataset.theme;
			observer.disconnect();
		});
		observer.observe(document, { childList: true, subtree: true });
	});
}

export async function trackCspViolations(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.__violations = [];
		document.addEventListener('securitypolicyviolation', (event) => {
			window.__violations.push({
				directive: event.violatedDirective,
				blocked: event.blockedURI,
			});
		});
	});
}
