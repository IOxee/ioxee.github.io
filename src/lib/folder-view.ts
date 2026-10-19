/**
 * Las decisiones del script de la carpeta que no dependen del navegador: qué página toca, qué se
 * anuncia, qué hace un gesto. Están aquí para poder probarlas sin pintar nada.
 */
import {
	type Layout,
	pageAtPosition,
	pagesAtPosition,
	positionOfPage,
} from './book';
import {
	type AnchoredPage,
	type PagerAction,
	indexForHash,
	swipeAction,
} from './pager';
import { fill } from './text';

export interface StatusTemplates {
	cover: string;
	one: string;
	two: string;
}

export function readingStatus(
	page: number,
	total: number,
	layout: Layout,
	title: string,
	templates: StatusTemplates,
): string {
	if (page === 0) return fill(templates.cover, { title });

	const content = String(total - 1);
	const { left, right } = pagesAtPosition(
		positionOfPage(page, layout),
		total,
		layout,
	);
	if (left !== null && right !== null) {
		return fill(templates.two, {
			left: String(left),
			right: String(right),
			total: content,
			title,
		});
	}

	return fill(templates.one, { page: String(page), total: content, title });
}

/** La página que se pidió (con una pestaña o un ancla), si se ve ahí aunque sea la de la izquierda; si no, la de la derecha. */
export function pageForPosition(
	position: number,
	preferred: number | null,
	total: number,
	layout: Layout,
): number {
	if (preferred !== null && positionOfPage(preferred, layout) === position) {
		return preferred;
	}

	return pageAtPosition(position, total, layout);
}

/**
 * El progreso que se pinta. Con movimiento reducido no hay giros a medias: la hoja salta entera a
 * mitad de camino, igual que cambia la página que se lee.
 */
export const shownProgress = (progress: number, reduced: boolean): number =>
	reduced ? Math.round(progress) : progress;

/**
 * A qué página lleva la dirección. Sin ancla es la portada (así «Atrás» hasta el inicio vuelve a
 * ella); con un ancla que no es una sección de la carpeta, a ninguna.
 */
export const pageForHash = (
	hash: string,
	plan: readonly AnchoredPage[],
): number | null => (hash === '' ? 0 : indexForHash(hash, plan));

const TAP_EDGE = 0.25;

export function tapAction(
	x: number,
	width: number,
	edge = TAP_EDGE,
): PagerAction | null {
	if (!(width > 0)) return null;
	if (x < width * edge) return 'prev';
	if (x > width * (1 - edge)) return 'next';

	return null;
}

const TAP_SLOP = 10;

export function gestureAction(
	dx: number,
	dy: number,
	x: number,
	width: number,
): PagerAction | null {
	const swipe = swipeAction(dx, dy);
	if (swipe) return swipe;
	if (Math.abs(dx) >= TAP_SLOP || Math.abs(dy) >= TAP_SLOP) return null;

	return tapAction(x, width);
}
