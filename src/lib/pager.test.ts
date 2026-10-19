import { describe, expect, it } from 'vitest';
import { type FolderCounts, planSheets } from './folder';
import {
	MIN_FIT_SCALE,
	SETTLE_THRESHOLD,
	clampIndex,
	fitScale,
	indexForHash,
	isNear,
	keyAction,
	scrollOffsetFor,
	scrollProgress,
	scrollStep,
	sectionAt,
	settleTarget,
	sheetStates,
	swipeAction,
	turn,
} from './pager';

const counts: FolderCounts = {
	experience: 5,
	education: 3,
	skillGroups: 2,
	languages: 3,
	certifications: 2,
	projects: 3,
};
const plan = planSheets(counts);

describe('clampIndex', () => {
	it('keeps an index inside the folder', () => {
		expect(clampIndex(3, 11)).toBe(3);
		expect(clampIndex(-4, 11)).toBe(0);
		expect(clampIndex(99, 11)).toBe(10);
	});

	it('rounds down and treats anything that is not a number as the cover', () => {
		expect(clampIndex(2.9, 11)).toBe(2);
		expect(clampIndex(Number.NaN, 11)).toBe(0);
	});

	it('is 0 for an empty folder', () => {
		expect(clampIndex(5, 0)).toBe(0);
	});
});

describe('turn', () => {
	it('goes to the next and the previous sheet', () => {
		expect(turn(3, 'next', 11)).toBe(4);
		expect(turn(3, 'prev', 11)).toBe(2);
	});

	it('does not wrap: a folder has a first and a last sheet', () => {
		expect(turn(0, 'prev', 11)).toBe(0);
		expect(turn(10, 'next', 11)).toBe(10);
	});

	it('jumps to the ends', () => {
		expect(turn(4, 'first', 11)).toBe(0);
		expect(turn(4, 'last', 11)).toBe(10);
	});
});

describe('keyAction', () => {
	it.each([
		['ArrowRight', 'next'],
		['ArrowDown', null],
		['ArrowLeft', 'prev'],
		['PageDown', 'next'],
		['PageUp', 'prev'],
		['Home', 'first'],
		['End', 'last'],
		['Enter', null],
		[' ', null],
		['a', null],
	])('maps %j to %j', (key, action) => {
		expect(keyAction(key)).toBe(action);
	});

	it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
		'ignores %j, which only an object prototype would know',
		(key) => {
			expect(keyAction(key)).toBeNull();
		},
	);
});

describe('swipeAction', () => {
	it('turns to the next sheet when the finger moves left, to the previous when it moves right', () => {
		expect(swipeAction(-120, 5)).toBe('next');
		expect(swipeAction(120, -5)).toBe('prev');
	});

	it('ignores a short move', () => {
		expect(swipeAction(-20, 0)).toBeNull();
	});

	it('ignores a mostly vertical move, which is the page being scrolled', () => {
		expect(swipeAction(-80, 200)).toBeNull();
		expect(swipeAction(80, -80)).toBeNull();
	});

	it('takes the distance that counts as a swipe', () => {
		expect(swipeAction(-30, 0, 20)).toBe('next');
		expect(swipeAction(-30, 0, 40)).toBeNull();
	});
});

describe('sheetStates', () => {
	it('says which sheets are already turned, which is showing and which are still to come', () => {
		expect(sheetStates(2, 5)).toEqual([
			'past',
			'past',
			'current',
			'future',
			'future',
		]);
	});

	it('has no past sheets on the cover and no future ones on the last sheet', () => {
		expect(sheetStates(0, 3)).toEqual(['current', 'future', 'future']);
		expect(sheetStates(2, 3)).toEqual(['past', 'past', 'current']);
	});

	it('is empty for an empty folder', () => {
		expect(sheetStates(0, 0)).toEqual([]);
	});
});

describe('isNear', () => {
	it('is true for the current sheet and its neighbours, the only ones that need to be drawn while turning', () => {
		expect([0, 1, 2, 3, 4].map((i) => isNear(i, 2))).toEqual([
			false,
			true,
			true,
			true,
			false,
		]);
	});
});

describe('indexForHash', () => {
	it('finds the first sheet of the section an anchor names', () => {
		expect(indexForHash('#about-me', plan)).toBe(1);
		expect(indexForHash('#resume', plan)).toBe(2);
		expect(indexForHash('#certifications', plan)).toBe(6);
		expect(indexForHash('#portfolio', plan)).toBe(7);
		expect(indexForHash('#contact', plan)).toBe(10);
	});

	it('takes the anchor with or without the #, and the cover as the start', () => {
		expect(indexForHash('portfolio', plan)).toBe(7);
		expect(indexForHash('#home', plan)).toBe(0);
	});

	it.each(['', '#', '#nope', '#contenido', '#resume-extra'])(
		'is null for %j, which is not a section',
		(hash) => {
			expect(indexForHash(hash, plan)).toBeNull();
		},
	);

	it('does not find a section that was left out', () => {
		const without = planSheets({ ...counts, certifications: 0 });

		expect(indexForHash('#certifications', without)).toBeNull();
	});
});

describe('scrollStep', () => {
	it('is half the window height, so a sheet turns every half screen of scrolling', () => {
		expect(scrollStep(900)).toBe(450);
		expect(scrollStep(1081)).toBe(541);
	});

	it('never gets so small that a flick of the wheel would turn several sheets', () => {
		expect(scrollStep(400)).toBe(320);
		expect(scrollStep(0)).toBe(320);
	});
});

describe('scrollOffsetFor', () => {
	it('is the scroll at which a sheet is the one showing, the inverse of scrollProgress', () => {
		for (const index of [0, 1, 4, 10]) {
			expect(scrollProgress(scrollOffsetFor(index, 450), 450, 11)).toBe(
				index,
			);
		}
	});

	it('is 0 for the cover and never negative', () => {
		expect(scrollOffsetFor(0, 500)).toBe(0);
		expect(scrollOffsetFor(-3, 500)).toBe(0);
	});
});

describe('scrollProgress', () => {
	it('is how many steps the folder has been scrolled, fractions included', () => {
		expect(scrollProgress(0, 500, 11)).toBe(0);
		expect(scrollProgress(250, 500, 11)).toBe(0.5);
		expect(scrollProgress(1250, 500, 11)).toBe(2.5);
	});

	it('stays between the first position and the last', () => {
		expect(scrollProgress(-300, 500, 11)).toBe(0);
		expect(scrollProgress(999_999, 500, 11)).toBe(10);
	});

	it('is 0 for a step, a scroll or a count that is not usable', () => {
		expect(scrollProgress(900, 0, 11)).toBe(0);
		expect(scrollProgress(Number.NaN, 500, 11)).toBe(0);
		expect(scrollProgress(900, 500, 0)).toBe(0);
	});

	it('turns to the next sheet at half a step when rounded, not at the end of the step', () => {
		expect(Math.round(scrollProgress(249, 500, 11))).toBe(0);
		expect(Math.round(scrollProgress(250, 500, 11))).toBe(1);
		expect(Math.round(scrollProgress(740, 500, 11))).toBe(1);
		expect(Math.round(scrollProgress(750, 500, 11))).toBe(2);
	});
});

describe('settleTarget', () => {
	it('lets one wheel notch pass a sheet instead of springing back', () => {
		// Un toque de la rueda (100 px) en una pantalla de 1080 (paso de 540): menos de la quinta parte.
		const notch = 100 / 540;

		expect(settleTarget(notch, 0, 11)).toBe(1);
		expect(settleTarget(3 + notch, 3, 11)).toBe(4);
	});

	it('lets one arrow key press (40 px) pass a sheet too', () => {
		for (const step of [320, 540, 720]) {
			expect(settleTarget(40 / step, 0, 11)).toBe(1);
		}
	});

	it('goes back a sheet when the scroll went up, however little', () => {
		expect(settleTarget(3 - 100 / 540, 3, 11)).toBe(2);
		expect(settleTarget(1 - 0.2, 1, 11)).toBe(0);
	});

	it('stays put for a nudge smaller than the threshold', () => {
		expect(settleTarget(3 + SETTLE_THRESHOLD / 2, 3, 11)).toBe(3);
		expect(settleTarget(3 - SETTLE_THRESHOLD / 2, 3, 11)).toBe(3);
		expect(settleTarget(3, 3, 11)).toBe(3);
	});

	it('keeps going when the scroll crossed several sheets, and stops on the one it is into', () => {
		expect(settleTarget(5, 0, 11)).toBe(5);
		expect(settleTarget(2.3, 0, 11)).toBe(3);
		expect(settleTarget(2.03, 0, 11)).toBe(2);
		expect(settleTarget(6.7, 9, 11)).toBe(6);
	});

	it('leaves a position that is already exact where it is, whatever the origin', () => {
		for (const origin of [0, 2, 7, 10]) {
			for (let position = 0; position < 11; position += 1) {
				expect(settleTarget(position, origin, 11)).toBe(position);
			}
		}
	});

	it('never goes past the first or the last sheet', () => {
		expect(settleTarget(9.95, 9, 11)).toBe(10);
		expect(settleTarget(SETTLE_THRESHOLD / 2, 0, 11)).toBe(0);
		expect(settleTarget(0.1, 1, 11)).toBe(0);
		expect(settleTarget(10, 20, 11)).toBe(10);
		expect(settleTarget(1, -5, 11)).toBe(1);
	});

	it('does nothing outside the track', () => {
		expect(settleTarget(-0.03, 0, 11)).toBeNull();
		expect(settleTarget(10.4, 10, 11)).toBeNull();
	});

	it('rounds a fractional origin to its nearest sheet', () => {
		expect(settleTarget(3.4, 2.6, 11)).toBe(4);
	});

	it('ignores values that make no sense', () => {
		expect(settleTarget(Number.NaN, 0, 11)).toBeNull();
		expect(settleTarget(1, Number.NaN, 11)).toBeNull();
		expect(settleTarget(0, 0, 0)).toBeNull();
		expect(settleTarget(0, 0, 1)).toBe(0);
	});

	it('takes a threshold of its own', () => {
		expect(settleTarget(3.3, 3, 11, 0.5)).toBe(3);
		expect(settleTarget(3.3, 3, 11, 0.1)).toBe(4);
	});
});

describe('fitScale', () => {
	it('is 1 when the folder already fits in the room there is', () => {
		expect(fitScale(700, 600)).toBe(1);
		expect(fitScale(600, 600)).toBe(1);
	});

	it('shrinks the folder just enough to fit when the room is short', () => {
		expect(fitScale(480, 600)).toBe(0.8);
	});

	it('gives up when it would have to be shrunk too much to be read', () => {
		expect(fitScale(300, 600)).toBeNull();
		expect(fitScale(389, 600)).toBeNull();
		expect(fitScale(390, 600)).toBe(MIN_FIT_SCALE);
	});

	it('can also grow the folder to fill a big screen, up to the largest scale it is given', () => {
		expect(fitScale(1000, 600, MIN_FIT_SCALE, 1.3)).toBe(1.3);
		expect(fitScale(720, 600, MIN_FIT_SCALE, 1.3)).toBe(1.2);
		expect(fitScale(1000, 600)).toBe(1);
	});

	it('gives up when the largest scale it is given is already too small to be read', () => {
		expect(fitScale(1000, 600, MIN_FIT_SCALE, 0.5)).toBeNull();
	});

	it('takes the smallest scale that still counts as readable', () => {
		expect(fitScale(300, 600, 0.5)).toBe(0.5);
		expect(fitScale(299, 600, 0.5)).toBeNull();
	});

	it('gives up for no room or a folder with no height yet, so nothing is pinned before it is measured', () => {
		expect(fitScale(0, 600)).toBeNull();
		expect(fitScale(-40, 600)).toBeNull();
		expect(fitScale(500, 0)).toBeNull();
		expect(fitScale(Number.NaN, 600)).toBeNull();
		expect(fitScale(500, Number.NaN)).toBeNull();
	});
});

describe('sectionAt', () => {
	it('names the section a sheet belongs to', () => {
		expect(sectionAt(0, plan)).toBe('home');
		expect(sectionAt(3, plan)).toBe('resume');
		expect(sectionAt(8, plan)).toBe('portfolio');
	});

	it('clamps an index outside the folder instead of answering with nothing', () => {
		expect(sectionAt(99, plan)).toBe('contact');
		expect(sectionAt(-1, plan)).toBe('home');
	});

	it('fails for a folder with no sheets, which has no section to name', () => {
		expect(() => sectionAt(0, [])).toThrow(RangeError);
	});
});
