const baseName = (path: string): string | undefined =>
	path
		.split('/')
		.at(-1)
		?.replace(/\.[^.]+$/, '');

/**
 * Elige, de un `import.meta.glob`, la imagen que se llama como el proyecto (`<id>.png`,
 * `<id>.webp`…). Falla con un mensaje claro si no existe, en vez de pintar una tarjeta sin imagen.
 */
export function pickImage<T>(
	images: Readonly<Record<string, T>>,
	id: string,
): T {
	const match = Object.entries(images).find(
		([path]) => baseName(path) === id,
	);
	if (!match) {
		throw new Error(
			`Falta la imagen de "${id}": debe llamarse ${id}.png, ${id}.jpg o ${id}.webp y estar en src/assets/projects/`,
		);
	}

	return match[1];
}
