import type { Page } from '@playwright/test';

/** Los anchos en los que se comprueba la maquetación: de un móvil pequeño a una pantalla grande. */
export const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const;

export const SCHEMES = ['light', 'dark'] as const;
export type Scheme = (typeof SCHEMES)[number];

/** Los enlaces del menú y la sección a la que llevan. */
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

/** Altura de las capturas y de las pruebas de scroll: la de un portátil. */
export const VIEWPORT_HEIGHT = 900;

/**
 * Deja la página quieta: fuentes cargadas y todas las animaciones terminadas (el sello que cae al
 * cargar es la única que hay). Sin esto, una medida o una captura cogerían el sello a medio caer.
 */
export async function settle(page: Page): Promise<void> {
	await page.evaluate(async () => {
		await document.fonts.ready;
		await Promise.all(
			document
				.getAnimations()
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

/**
 * Anota cada violación de la CSP que ocurra en la página. Hay que llamarlo antes de `page.goto`.
 * La lista queda en `window.__violations`.
 */
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
