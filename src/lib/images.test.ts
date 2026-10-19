import { describe, expect, it } from 'vitest';
import {
	assertAssetsUsed,
	pickImage,
	pickOptionalAsset,
	unusableAssets,
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

describe('pickImage', () => {
	const images = {
		'../assets/projects/demo.png': 'demo',
		'../assets/projects/other.webp': 'other',
		'../assets/projects/demo-2.jpg': 'demo-2',
	};

	it('finds the image named after the id, whatever its extension', () => {
		expect(pickImage(images, 'demo')).toBe('demo');
		expect(pickImage(images, 'other')).toBe('other');
	});

	it('does not confuse an id with another one that only starts the same way', () => {
		expect(pickImage(images, 'demo-2')).toBe('demo-2');
	});

	it('fails with a message that names the missing image', () => {
		expect(() => pickImage(images, 'missing')).toThrow(/missing/);
	});
});
