import { describe, expect, it } from 'vitest';
import { planSheets } from './folder';
import {
	gestureAction,
	pageForHash,
	pageForPosition,
	pagerCount,
	readingStatus,
	shownProgress,
	tapAction,
} from './folder-view';

const TOTAL = 12;

const templates = {
	cover: 'Portada: {title}',
	one: 'Página {page} de {total}: {title}',
	two: 'Páginas {left} y {right} de {total}: {title}',
};

describe('readingStatus', () => {
	it('names the cover on its own, without page numbers', () => {
		expect(readingStatus(0, TOTAL, 'spread', 'Isidro', templates)).toBe(
			'Portada: Isidro',
		);
	});

	it('names both pages of an open spread, counting only the pages of content', () => {
		expect(
			readingStatus(3, TOTAL, 'spread', 'Experiencia', templates),
		).toBe('Páginas 2 y 3 de 11: Experiencia');
	});

	it('names a single page when only one shows, or when the other side has no page', () => {
		expect(
			readingStatus(3, TOTAL, 'single', 'Experiencia', templates),
		).toBe('Página 3 de 11: Experiencia');
		expect(readingStatus(1, TOTAL, 'spread', 'Sobre mí', templates)).toBe(
			'Página 1 de 11: Sobre mí',
		);
	});
});

describe('pageForPosition', () => {
	it('reads on from the right-hand page of a spread', () => {
		expect(pageForPosition(2, null, TOTAL, 'spread')).toBe(3);
	});

	it('keeps the page that was asked for when that spread shows it, even on the left', () => {
		expect(pageForPosition(2, 2, TOTAL, 'spread')).toBe(2);
	});

	it('forgets the page asked for at any other spread', () => {
		expect(pageForPosition(3, 2, TOTAL, 'spread')).toBe(5);
	});

	it('is the position itself when only one page shows', () => {
		expect(pageForPosition(4, 2, TOTAL, 'single')).toBe(4);
	});
});

describe('shownProgress', () => {
	it('follows the scroll exactly, fractions included', () => {
		expect(shownProgress(2.3, false)).toBe(2.3);
	});

	it('jumps whole sheets with reduced motion, so nothing turns while scrolling', () => {
		expect(shownProgress(2.3, true)).toBe(2);
		expect(shownProgress(2.5, true)).toBe(3);
	});
});

describe('pageForHash', () => {
	const plan = planSheets({
		experience: 5,
		education: 3,
		skillGroups: 2,
		languages: 3,
		certifications: 2,
		projects: 3,
	});

	it('goes to the first page of the section an anchor names', () => {
		expect(pageForHash('#portfolio', plan)).toBe(7);
	});

	it('goes back to the cover when the address has no anchor, as when going Back to the start', () => {
		expect(pageForHash('', plan)).toBe(0);
	});

	it('ignores an anchor that is not a section of the folder', () => {
		expect(pageForHash('#contenido', plan)).toBeNull();
	});
});

describe('tapAction', () => {
	it('turns back on the left quarter and forward on the right quarter', () => {
		expect(tapAction(20, 400)).toBe('prev');
		expect(tapAction(380, 400)).toBe('next');
	});

	it('does nothing in the middle, where the text is read and selected', () => {
		expect(tapAction(200, 400)).toBeNull();
		expect(tapAction(101, 400)).toBeNull();
	});

	it('takes how wide the edges are', () => {
		expect(tapAction(150, 400, 0.4)).toBe('prev');
	});

	it('does nothing for a box with no width', () => {
		expect(tapAction(0, 0)).toBeNull();
	});
});

describe('gestureAction', () => {
	it('turns with a swipe to either side', () => {
		expect(gestureAction(-120, 5, 200, 400)).toBe('next');
		expect(gestureAction(120, -5, 200, 400)).toBe('prev');
	});

	it('turns with a tap on an edge, which is the alternative to swiping', () => {
		expect(gestureAction(2, 1, 380, 400)).toBe('next');
		expect(gestureAction(0, 0, 10, 400)).toBe('prev');
	});

	it('does nothing for a tap in the middle or for a drag that is neither a tap nor a swipe', () => {
		expect(gestureAction(1, 1, 200, 400)).toBeNull();
		expect(gestureAction(-30, 2, 380, 400)).toBeNull();
		expect(gestureAction(-40, 300, 380, 400)).toBeNull();
	});
});

describe('pagerCount', () => {
	it('counts from the cover, which is the first one, to the last page', () => {
		expect(pagerCount(0, TOTAL)).toBe('1 / 12');
		expect(pagerCount(11, TOTAL)).toBe('12 / 12');
	});

	it('never shows a folder with no pages', () => {
		expect(pagerCount(0, 0)).toBe('1 / 1');
	});
});
