import type { SheetPlan } from './folder';
import type { SectionId } from './sections';

export type PagerAction = 'prev' | 'next' | 'first' | 'last';

export type SheetState = 'past' | 'current' | 'future';

export function clampIndex(index: number, total: number): number {
	if (total <= 0 || Number.isNaN(index)) return 0;

	return Math.min(Math.max(Math.floor(index), 0), total - 1);
}

export function turn(
	index: number,
	action: PagerAction,
	total: number,
): number {
	switch (action) {
		case 'next':
			return clampIndex(index + 1, total);
		case 'prev':
			return clampIndex(index - 1, total);
		case 'first':
			return 0;
		case 'last':
			return clampIndex(total - 1, total);
	}
}

const KEY_ACTIONS: Readonly<Record<string, PagerAction>> = {
	ArrowRight: 'next',
	PageDown: 'next',
	ArrowLeft: 'prev',
	PageUp: 'prev',
	Home: 'first',
	End: 'last',
};

/** Qué hace una tecla, o `null` si no es de la carpeta (así no se le quita el uso normal). */
export const keyAction = (key: string): PagerAction | null =>
	Object.hasOwn(KEY_ACTIONS, key) ? (KEY_ACTIONS[key] ?? null) : null;

export const DEFAULT_SWIPE_DISTANCE = 48;

export function swipeAction(
	dx: number,
	dy: number,
	distance = DEFAULT_SWIPE_DISTANCE,
): PagerAction | null {
	if (Math.abs(dx) < distance || Math.abs(dx) <= Math.abs(dy)) return null;

	return dx < 0 ? 'next' : 'prev';
}

export function sheetStates(index: number, total: number): SheetState[] {
	return Array.from({ length: Math.max(total, 0) }, (_, position) => {
		if (position < index) return 'past';
		return position === index ? 'current' : 'future';
	});
}

export const isNear = (position: number, index: number): boolean =>
	Math.abs(position - index) <= 1;

/** Lo mínimo que se desplaza por hoja: sin esto, un toque de la rueda pasaría varias de golpe. */
const MIN_SCROLL_STEP = 320;

export const scrollStep = (viewportHeight: number): number =>
	Math.max(MIN_SCROLL_STEP, Math.round(viewportHeight / 2));

/**
 * Cuántos pasos se ha desplazado la página desde que la carpeta quedó fija, con fracciones: es lo
 * que decide cuánto ha girado la hoja que está pasando. Va de la primera posición a la última.
 */
export function scrollProgress(
	offset: number,
	step: number,
	total: number,
): number {
	if (!(step > 0) || !Number.isFinite(offset) || !(total > 0)) return 0;

	return Math.min(Math.max(offset / step, 0), total - 1);
}

export const scrollOffsetFor = (index: number, step: number): number =>
	Math.max(0, index) * step;

/**
 * Cuánto hay que haberse movido hacia otra hoja (en pasos) para que termine de pasar sola. Es poco
 * a propósito: un toque de la rueda mueve unos 100 px y una flecha del teclado 40, una fracción
 * pequeña de la hoja, y con «la parada más cercana» volverían atrás en vez de pasarla. Un roce
 * del trackpad, de unos pocos píxeles, queda por debajo.
 */
export const SETTLE_THRESHOLD = 0.04;

/**
 * A qué punto de lectura termina de colocarse la carpeta cuando el scroll se detiene entre dos.
 * Sigue la dirección del movimiento: parte de `origin` (donde estaba antes de moverse) y, si se ha
 * pasado de `threshold` pasos hacia un lado, sigue hasta la hoja de ese lado. Un punto ya exacto
 * se queda donde está. `null` si el scroll está fuera de la pista (encima de la carpeta, o más
 * allá de la última hoja): ahí no hay nada que colocar.
 */
export function settleTarget(
	position: number,
	origin: number,
	count: number,
	threshold: number = SETTLE_THRESHOLD,
): number | null {
	if (!Number.isFinite(position) || !Number.isFinite(origin) || !(count > 0))
		return null;

	const last = count - 1;
	if (position < 0 || position > last) return null;

	const from = Math.min(Math.max(Math.round(origin), 0), last);
	const moved = position - from;
	const hops = Math.max(Math.ceil(Math.abs(moved) - threshold), 0);

	return Math.min(Math.max(from + Math.sign(moved) * hops, 0), last);
}

/**
 * La carpeta no se encoge por debajo de esto: más pequeña, el texto dejaría de poder leerse. Con el
 * menú y el pie siempre a la vista, un portátil de 768 de alto (unos 650 px de página) deja a la
 * carpeta poco más de 540 px: hace falta bajar hasta aquí para que siga fija.
 */
export const MIN_FIT_SCALE = 0.65;
/**
 * Ni se amplía por encima de esto: en una pantalla enorme (4K, ultraancha) la carpeta llena el alto
 * o el ancho que tenga, pero más allá el papel y las capturas se verían pixelados.
 */
export const MAX_FIT_SCALE = 2.4;

/**
 * Cuánto hay que escalar la carpeta para que llene el hueco que deja la ventana: se encoge si no
 * cabe y, si sobra sitio, se amplía hasta `maximum` (1 por defecto: no se amplía). Si habría que
 * encogerla más que `minimum` no se fija (`null`): se vería cortada o ilegible.
 */
export function fitScale(
	available: number,
	natural: number,
	minimum = MIN_FIT_SCALE,
	maximum = 1,
): number | null {
	if (!(available > 0) || !(natural > 0)) return null;

	const scale = Math.min(maximum, available / natural);

	return scale >= minimum ? scale : null;
}

export type AnchoredPage = Pick<SheetPlan, 'section' | 'anchor'>;

export function indexForHash(
	hash: string,
	plan: readonly AnchoredPage[],
): number | null {
	const id = hash.startsWith('#') ? hash.slice(1) : hash;
	const index = plan.findIndex(
		(sheet) => sheet.anchor && sheet.section === id,
	);

	return index === -1 ? null : index;
}

export function sectionAt(
	index: number,
	plan: readonly AnchoredPage[],
): SectionId {
	const sheet = plan[clampIndex(index, plan.length)];
	if (!sheet) throw new RangeError('La carpeta no tiene hojas');

	return sheet.section;
}
