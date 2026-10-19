import { partialDateKey } from './partial-date';

/**
 * Orden de visualización explícito (`order`, de menor a mayor). El almacén de contenido de
 * Astro no conserva el orden del archivo YAML, así que no se puede depender de él.
 */
export function sortByOrder<T extends { id: string; order: number }>(
	items: readonly T[],
): T[] {
	return [...items].sort(
		(a, b) => a.order - b.order || a.id.localeCompare(b.id),
	);
}

/**
 * Del más reciente al más antiguo, como en un currículum: lo que sigue en marcha primero; luego,
 * lo que acabó más tarde; a igual fin, lo que empezó más tarde; y, por último, el id, para que el
 * orden no dependa de cómo se cargaron los datos.
 */
export function sortNewestFirst<
	T extends { id: string; start: string; end: string | null },
>(items: readonly T[]): T[] {
	const endKey = (end: string | null): number =>
		end === null ? Number.POSITIVE_INFINITY : partialDateKey(end, 'end');

	return [...items].sort(
		(a, b) =>
			// Dos en marcha dan `Infinity - Infinity`, que es `NaN`: cuenta como empate.
			endKey(b.end) - endKey(a.end) ||
			0 ||
			partialDateKey(b.start, 'start') -
				partialDateKey(a.start, 'start') ||
			a.id.localeCompare(b.id),
	);
}
