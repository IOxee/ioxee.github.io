import { describe, expect, it } from 'vitest';
import { opensInViewer, pdfFrameUrl } from './viewer';

const plain = {
	button: 0,
	ctrlKey: false,
	metaKey: false,
	shiftKey: false,
	altKey: false,
};

describe('opensInViewer', () => {
	it('opens a photo in the viewer with a plain click', () => {
		expect(opensInViewer('image', plain, undefined)).toBe(true);
		expect(opensInViewer('image', plain, false)).toBe(true);
	});

	it('opens a PDF in the viewer only when the browser can show a PDF inside a page', () => {
		expect(opensInViewer('pdf', plain, true)).toBe(true);
		// Sin visor (un móvil) el marco se quedaría en blanco o descargaría: el enlace hace su trabajo.
		expect(opensInViewer('pdf', plain, false)).toBe(false);
	});

	it('does not assume a viewer exists when the browser does not say', () => {
		expect(opensInViewer('pdf', plain, undefined)).toBe(false);
	});

	it.each([
		['ctrl', { ctrlKey: true }],
		['cmd', { metaKey: true }],
		['shift', { shiftKey: true }],
		['alt', { altKey: true }],
	])(
		'leaves the link alone with %s held: the person asked for a new tab or window',
		(_, held) => {
			expect(opensInViewer('image', { ...plain, ...held }, true)).toBe(
				false,
			);
			expect(opensInViewer('pdf', { ...plain, ...held }, true)).toBe(
				false,
			);
		},
	);

	it.each([1, 2])(
		'leaves the link alone for mouse button %i (middle or right click)',
		(button) => {
			expect(opensInViewer('image', { ...plain, button }, true)).toBe(
				false,
			);
		},
	);
});

describe('pdfFrameUrl', () => {
	it('asks the built-in viewer for the page width and no side panel', () => {
		expect(pdfFrameUrl('/_astro/curso.abc123.pdf')).toBe(
			'/_astro/curso.abc123.pdf#navpanes=0&view=FitH',
		);
	});

	it('replaces a fragment the address already has', () => {
		expect(pdfFrameUrl('/curso.pdf#page=2')).toBe(
			'/curso.pdf#navpanes=0&view=FitH',
		);
	});
});
