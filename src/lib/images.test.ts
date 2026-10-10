import { describe, expect, it } from 'vitest';
import { pickImage } from './images';

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
