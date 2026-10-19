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
	/** `true` if the folder is pinned and the scroll turns the sheets; otherwise it turns on its own. */
	parallax: boolean;
	positions: number;
	step: number;
	/** Scroll at which the folder gets pinned (reading point 0). */
	base: number;
}

export function folderGeometry(page: Page): Promise<FolderGeometry> {
	return page.evaluate(() => {
		const folder = document.querySelector<HTMLElement>('[data-folder]');
		const track = document.querySelector<HTMLElement>('[data-track]');
		const stage = document.querySelector<HTMLElement>('[data-stage]');
		if (!folder || !track || !stage) throw new Error('There is no folder');

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
 * Takes the scroll to reading point `position` and waits for the folder to have arrived: for the
 * progress to be exactly that and for the sheets to have come to rest.
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
 * Leaves the page still: fonts loaded and all animations finished (the stamp that drops on
 * load is the only one). Without this, a measurement or a screenshot would catch the stamp halfway down.
 */
export async function settle(page: Page): Promise<void> {
	await page.evaluate(async () => {
		await document.fonts.ready;
		// Those that never end (the arrow inviting you to scroll down) are not waited for: they would never finish.
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
 * Counts the accumulated layout shift (CLS) from before the page starts loading.
 * It has to be called before `page.goto`.
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
 * Records the theme the page already has at the moment its `<body>` is created, that is, before
 * anything is painted. A theme script that arrived late would leave the default value there and the
 * page would flicker, even if in the end the theme was the right one. It has to be called before
 * `page.goto`; the value is left in `window.__themeAtBody`.
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
