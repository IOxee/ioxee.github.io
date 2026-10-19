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

export const PROJECT_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

interface ProjectAsset {
	id: string;
	kind: 'image' | 'document';
	/** Only on a translated document (`document.en.pdf`); `undefined` for the default one. */
	locale: string | undefined;
}

/**
 * Reads a project file by its place: `<id>/image.<ext>`, `<id>/document.pdf` or `<id>/document.<locale>.pdf`.
 * Only the last two segments count, so it works with a glob key (`../assets/projects/demo/image.png`) and with a
 * path relative to the folder. `undefined` for anything that does not follow that layout.
 */
function parseProjectAsset(path: string): ProjectAsset | undefined {
	const [id, name] = path.split('/').slice(-2);
	const match = /^(image|document)(?:\.([a-z]{2}))?\.([a-z]+)$/.exec(
		name ?? '',
	);
	if (id === undefined || match === null) return undefined;

	const [, kind, locale, extension] = match;
	if (kind === 'image') {
		const shown = PROJECT_IMAGE_EXTENSIONS.some((ext) => ext === extension);

		return shown && locale === undefined
			? { id, kind, locale: undefined }
			: undefined;
	}

	return extension === 'pdf' ? { id, kind: 'document', locale } : undefined;
}

/**
 * The files in the projects folder that will never be used: they are not inside a folder named after a project,
 * are not called `image.<ext>`, `document.pdf` or `document.<locale>.pdf`, or are translated into a language
 * that is not in `translatedLocales` (the default language has no suffix: it is `document.pdf`).
 */
export function unusableProjectAssets(
	paths: readonly string[],
	ids: readonly string[],
	translatedLocales: readonly string[],
): string[] {
	return paths.filter((path) => {
		const asset = parseProjectAsset(path);

		return (
			asset === undefined ||
			!ids.includes(asset.id) ||
			(asset.locale !== undefined &&
				!translatedLocales.includes(asset.locale))
		);
	});
}

/** Fails the build, naming the files, when the projects folder holds some that would never be shown. */
export function assertProjectAssetsUsed(
	paths: readonly string[],
	ids: readonly string[],
	translatedLocales: readonly string[],
): void {
	const unused = unusableProjectAssets(paths, ids, translatedLocales);
	if (unused.length === 0) return;

	const documents = [
		'document.pdf',
		...translatedLocales.map((locale) => `document.${locale}.pdf`),
	].join(', ');
	throw new Error(
		`En src/assets/projects/ hay archivos que no se van a usar: ${unused.join(', ')}. ` +
			`Cada proyecto tiene su carpeta con el id de projects.yaml, y dentro solo van ` +
			`image.png (o .jpg, .jpeg, .webp) y ${documents} (en minúsculas).`,
	);
}

const assetsOf = <T>(
	files: Readonly<Record<string, T>>,
	id: string,
	kind: ProjectAsset['kind'],
): [string, T, string | undefined][] =>
	Object.entries(files).flatMap(([path, file]) => {
		const asset = parseProjectAsset(path);

		return asset?.id === id && asset.kind === kind
			? [[path, file, asset.locale] as [string, T, string | undefined]]
			: [];
	});

/** The screenshot of a project: `<id>/image.<ext>`. It is required, and two with different extensions are an error. */
export function pickProjectImage<T>(
	files: Readonly<Record<string, T>>,
	id: string,
): T {
	const matches = assetsOf(files, id, 'image');
	if (matches.length > 1) {
		throw new Error(
			`Hay más de una imagen para "${id}": ${matches.map(([path]) => path).join(', ')}. Deja solo una.`,
		);
	}
	const [match] = matches;
	if (!match) {
		throw new Error(
			`Falta la imagen de "${id}": debe llamarse image.png, image.jpg o image.webp y estar en src/assets/projects/${id}/`,
		);
	}

	return match[1];
}

/** The document of a project in `locale`, or the default one (`document.pdf`) if it has no translation. */
export function pickProjectDocument<T>(
	files: Readonly<Record<string, T>>,
	id: string,
	locale: string,
): T | undefined {
	const documents = assetsOf(files, id, 'document');
	const translated = documents.find(
		([, , assetLocale]) => assetLocale === locale,
	);
	const fallback = documents.find(
		([, , assetLocale]) => assetLocale === undefined,
	);

	return (translated ?? fallback)?.[1];
}
