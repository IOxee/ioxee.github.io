/**
 * La carpeta como un libro de hojas de doble cara.
 *
 * Una página es una cara de una hoja. La portada (página 0) es la cara de delante de la primera
 * hoja; su reverso es el interior de la tapa y no lleva nada. Después, cada hoja lleva dos páginas:
 * la de delante (la que se lee a la derecha al abrir la carpeta) y la de detrás (la de la izquierda
 * una vez pasada la hoja).
 *
 * Con espacio para dos páginas se ve un «par» (`spread`): el reverso de la hoja pasada a la
 * izquierda y el anverso de la siguiente a la derecha, así que cada giro enseña dos páginas
 * nuevas. En pantallas estrechas se ve una sola página cada vez (`single`).
 *
 * Una «posición» es un punto de lectura: un par o una página, según la maqueta.
 */

export type Layout = 'spread' | 'single';

export interface LeafPages<T> {
	front: T;
	back: T | null;
}

export interface VisiblePages {
	left: number | null;
	right: number | null;
}

export const isBackPage = (page: number): boolean => page > 0 && page % 2 === 0;

export function leafPages<T>(pages: readonly T[]): LeafPages<T>[] {
	const [cover, ...rest] = pages;
	if (cover === undefined) return [];

	const leaves: LeafPages<T>[] = [{ front: cover, back: null }];
	for (let start = 0; start < rest.length; start += 2) {
		leaves.push({
			front: rest[start] as T,
			back: rest[start + 1] ?? null,
		});
	}

	return leaves;
}

const lastPage = (pages: number): number => Math.max(pages - 1, 0);

/** Cuántos puntos de lectura hay. Con pares, uno más si la última hoja lleva algo por detrás. */
export function positionCount(pages: number, layout: Layout): number {
	if (pages <= 1) return Math.max(pages, 0);

	return layout === 'single' ? pages : Math.floor(lastPage(pages) / 2) + 2;
}

const clampPosition = (position: number, pages: number, layout: Layout) =>
	Math.min(
		Math.max(Math.floor(position), 0),
		Math.max(positionCount(pages, layout) - 1, 0),
	);

export function positionOfPage(page: number, layout: Layout): number {
	const clamped = Math.max(Math.floor(page), 0);
	if (layout === 'single' || clamped === 0) return clamped;

	return clamped % 2 === 1 ? (clamped + 1) / 2 : clamped / 2 + 1;
}

export function pagesAtPosition(
	position: number,
	pages: number,
	layout: Layout,
): VisiblePages {
	const at = clampPosition(position, pages, layout);
	if (layout === 'single' || at === 0) return { left: null, right: at };

	const inside = (page: number) => (page <= lastPage(pages) ? page : null);

	return {
		// El reverso de la portada es el interior de la tapa: no es una página.
		left: at >= 2 ? inside(2 * at - 2) : null,
		right: inside(2 * at - 1),
	};
}

export function pageAtPosition(
	position: number,
	pages: number,
	layout: Layout,
): number {
	const { left, right } = pagesAtPosition(position, pages, layout);

	return right ?? left ?? 0;
}
