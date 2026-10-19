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
 * The same as `pickImage`, but the file is optional: `undefined` if it does not exist. Two files
 * for the same id (`course.jpg` and `course.png`) are an error, not a random choice.
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
 * The files in an attachments folder that will never be used: they are not named like any of
 * the `ids`, or their extension is not one of those that get shown (lowercase: the build looks for them that way).
 * Without this warning, a misspelled name would leave the photo out without saying why.
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

interface AssetFolder {
	/** Where the files live, relative to the repository: it names the folder in the error. */
	folder: string;
	files: readonly string[];
	ids: readonly string[];
	extensions: readonly string[];
	/** What a file has to be named after, as it reads in the error ("un proyecto de projects.yaml"). */
	owner: string;
}

/** Fails the build, naming the files, when a folder holds some that would never be shown. */
export function assertAssetsUsed({
	folder,
	files,
	ids,
	extensions,
	owner,
}: AssetFolder): void {
	const unused = unusableAssets(files, ids, extensions);
	if (unused.length === 0) return;

	throw new Error(
		`En ${folder}/ hay archivos que no se van a usar: ${unused.join(', ')}. ` +
			`Cada uno debe llamarse como el id de ${owner} y acabar en ` +
			`${extensions.map((extension) => `.${extension}`).join(', ')} (en minúsculas).`,
	);
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
