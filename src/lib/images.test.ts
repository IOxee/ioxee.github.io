import { describe, expect, it } from 'vitest';
import {
	assertAssetsUsed,
	assertProjectAssetsUsed,
	pickOptionalAsset,
	pickProjectDocument,
	pickProjectImage,
	unusableAssets,
	unusableProjectAssets,
} from './images';

describe('pickOptionalAsset', () => {
	const files = {
		'../assets/certifications/curso.jpg': 'foto',
		'../assets/certifications/otro.pdf': 'documento',
		'../assets/certifications/curso-2.png': 'foto-2',
	};

	it('finds the file named after the id, whatever its extension', () => {
		expect(pickOptionalAsset(files, 'curso')).toBe('foto');
		expect(pickOptionalAsset(files, 'otro')).toBe('documento');
	});

	it('does not confuse an id with another one that only starts the same way', () => {
		expect(pickOptionalAsset(files, 'curso-2')).toBe('foto-2');
	});

	it('is undefined when there is no file: it is optional', () => {
		expect(pickOptionalAsset(files, 'sin-nada')).toBeUndefined();
		expect(pickOptionalAsset({}, 'curso')).toBeUndefined();
	});

	it('refuses two files for the same id, instead of picking one at random', () => {
		const twice = {
			'../assets/certifications/curso.jpg': 'a',
			'../assets/certifications/curso.png': 'b',
		};

		expect(() => pickOptionalAsset(twice, 'curso')).toThrow(/curso/);
	});
});

describe('unusableAssets', () => {
	const ids = ['curso', 'otro'];
	const extensions = ['png', 'jpg', 'pdf'];

	it('lists nothing when every file is named after a certification and has a known type', () => {
		expect(
			unusableAssets(
				[
					'../assets/certifications/curso.jpg',
					'../assets/certifications/curso.pdf',
					'../assets/certifications/otro.png',
				],
				ids,
				extensions,
			),
		).toEqual([]);
	});

	it('finds a file that matches no certification: a typo that would otherwise show nothing', () => {
		expect(
			unusableAssets(
				['../assets/certifications/cruso.jpg'],
				ids,
				extensions,
			),
		).toEqual(['../assets/certifications/cruso.jpg']);
	});

	it('finds a file of a type that is not shown, even when the name is right', () => {
		expect(
			unusableAssets(
				[
					'../assets/certifications/curso.heic',
					'../assets/certifications/curso.docx',
				],
				ids,
				extensions,
			),
		).toEqual([
			'../assets/certifications/curso.heic',
			'../assets/certifications/curso.docx',
		]);
	});

	it('flags an extension in capitals: the build looks files up in lowercase, so it would be ignored on Linux', () => {
		expect(
			unusableAssets(
				['../assets/certifications/curso.JPG'],
				ids,
				extensions,
			),
		).toEqual(['../assets/certifications/curso.JPG']);
	});

	it('finds a file with no extension', () => {
		expect(
			unusableAssets(['../assets/certifications/curso'], ids, extensions),
		).toEqual(['../assets/certifications/curso']);
	});
});

describe('assertAssetsUsed', () => {
	const options = {
		folder: 'src/assets/projects',
		ids: ['demo', 'other'],
		extensions: ['png', 'pdf'],
		owner: 'un proyecto de projects.yaml',
	};

	it('accepts a folder where every file is named after an id and has a shown type', () => {
		expect(() =>
			assertAssetsUsed({
				...options,
				files: ['demo.png', 'demo.pdf', 'other.png'],
			}),
		).not.toThrow();
	});

	it('accepts an empty folder', () => {
		expect(() => assertAssetsUsed({ ...options, files: [] })).not.toThrow();
	});

	it('names the folder, the useless files and what they should be called after', () => {
		expect(() =>
			assertAssetsUsed({
				...options,
				files: ['demo.png', 'dmeo.pdf', 'other.docx'],
			}),
		).toThrow(
			/src\/assets\/projects\/.*dmeo\.pdf, other\.docx.*un proyecto de projects\.yaml/,
		);
	});

	it('lists the accepted extensions, in lowercase, so the fix is obvious', () => {
		expect(() =>
			assertAssetsUsed({ ...options, files: ['demo.PDF'] }),
		).toThrow(/\.png, \.pdf/);
	});
});

describe('pickProjectImage', () => {
	const images = {
		'../assets/projects/demo/image.png': 'demo',
		'../assets/projects/other/image.webp': 'other',
		'../assets/projects/demo-2/image.jpg': 'demo-2',
	};

	it('finds the image in the id folder, whatever its extension', () => {
		expect(pickProjectImage(images, 'demo')).toBe('demo');
		expect(pickProjectImage(images, 'other')).toBe('other');
	});

	it('does not confuse an id with another one that only starts the same way', () => {
		expect(pickProjectImage(images, 'demo-2')).toBe('demo-2');
	});

	it('fails with a message that names the missing image', () => {
		expect(() => pickProjectImage(images, 'missing')).toThrow(/missing/);
	});

	it('fails when a project has two images', () => {
		expect(() =>
			pickProjectImage(
				{
					'../assets/projects/demo/image.png': 'a',
					'../assets/projects/demo/image.jpg': 'b',
				},
				'demo',
			),
		).toThrow(/más de una imagen/);
	});
});

describe('pickProjectDocument', () => {
	const documents = {
		'../assets/projects/demo/document.pdf': 'es',
		'../assets/projects/demo/document.en.pdf': 'en',
		'../assets/projects/other/document.pdf': 'other-es',
	};

	it('prefers the translation in the requested language', () => {
		expect(pickProjectDocument(documents, 'demo', 'en')).toBe('en');
	});

	it('falls back to the default document when that language has no translation', () => {
		expect(pickProjectDocument(documents, 'demo', 'ca')).toBe('es');
		expect(pickProjectDocument(documents, 'demo', 'es')).toBe('es');
	});

	it('is undefined when the project has no document', () => {
		expect(pickProjectDocument(documents, 'missing', 'es')).toBeUndefined();
	});

	it('never takes the document of another project', () => {
		expect(pickProjectDocument(documents, 'other', 'en')).toBe('other-es');
	});
});

describe('unusableProjectAssets', () => {
	const ids = ['demo'];
	const locales = ['ca', 'en'];

	it('accepts the layout <id>/image.<ext> and <id>/document[.<locale>].pdf', () => {
		expect(
			unusableProjectAssets(
				[
					'demo/image.png',
					'demo/image.webp',
					'demo/document.pdf',
					'demo/document.en.pdf',
				],
				ids,
				locales,
			),
		).toEqual([]);
	});

	it('flags files outside a project folder, misnamed or of an unknown project', () => {
		const bad = [
			'demo.png',
			'demo/cover.png',
			'demo/image.PNG',
			'demo/document.docx',
			'demo/document.fr.pdf',
			'demo/document.es.pdf',
			'demo/image.en.png',
			'ghost/image.png',
		];

		expect(unusableProjectAssets(bad, ids, locales)).toEqual(bad);
	});
});

describe('assertProjectAssetsUsed', () => {
	it('names the useless files and the expected layout', () => {
		expect(() =>
			assertProjectAssetsUsed(
				['demo/image.png', 'demo.pdf'],
				['demo'],
				['en'],
			),
		).toThrow(/demo\.pdf.*image\.png.*document\.pdf, document\.en\.pdf/);
	});

	it('accepts a tidy folder', () => {
		expect(() =>
			assertProjectAssetsUsed(['demo/image.png'], ['demo'], ['en']),
		).not.toThrow();
	});
});
