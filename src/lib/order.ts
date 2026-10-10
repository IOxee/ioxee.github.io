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
