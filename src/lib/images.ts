const baseName = (path: string): string | undefined =>
	path
		.split('/')
		.at(-1)
		?.replace(/\.[^.]+$/, '');

const extensionOf = (path: string): string => {
	const name = path.split('/').at(-1) ?? '';
	const dot = name.lastIndexOf('.');

	return dot === -1 ? '' : name.slice(dot + 1);
};

/**
 * Lo mismo que `pickImage`, pero el archivo es opcional: `undefined` si no existe. Dos archivos
 * para el mismo id (`curso.jpg` y `curso.png`) es un error, no una elección al azar.
 */
export function pickOptionalAsset<T>(
	files: Readonly<Record<string, T>>,
	id: string,
): T | undefined {
	const matches = Object.entries(files).filter(
		([path]) => baseName(path) === id,
	);
	if (matches.length > 1) {
		throw new Error(
			`Hay más de un archivo para "${id}": ${matches.map(([path]) => path).join(', ')}. Deja como mucho una foto y un PDF por cada id.`,
		);
	}

	return matches[0]?.[1];
}

/**
 * Los archivos de una carpeta de adjuntos que no se van a usar nunca: no se llaman como ninguno de
 * los `ids`, o su extensión no es de las que se muestran (en minúsculas: el build las busca así).
 * Sin este aviso, un nombre mal escrito dejaría la foto sin salir y sin decir por qué.
 */
export function unusableAssets(
	paths: readonly string[],
	ids: readonly string[],
	extensions: readonly string[],
): string[] {
	return paths.filter((path) => {
		const name = baseName(path);

		return (
			name === undefined ||
			!ids.includes(name) ||
			!extensions.includes(extensionOf(path))
		);
	});
}

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
