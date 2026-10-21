import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SECTION_IDS } from '../../src/lib/sections';
import { PAGES, distHas, isExternal, parsePage, readDist } from './support';

/** V1 site services that must not come back: map, icon fonts, jQuery and third-party analytics. */
const LEGACY = [
	'maps.googleapis',
	'kit.fontawesome',
	'fontawesome',
	'jquery',
	'googletagmanager',
	'google-analytics',
];

describe.each(PAGES)('content of %s', (path) => {
	const page = parsePage(path);

	it('carries nothing over from the v1 site', () => {
		const html = readDist(path).toLowerCase();

		for (const marker of LEGACY) {
			expect(html).not.toContain(marker);
		}
	});

	it('has a single h1', () => {
		expect(page.querySelectorAll('h1')).toHaveLength(1);
	});

	it('gives every image alt text and dimensions, so the page does not shift while loading', () => {
		for (const image of page.querySelectorAll('img')) {
			expect(image.getAttribute('alt')).toMatch(/\S/);
			expect(image.getAttribute('width')).toMatch(/^\d+$/);
			expect(image.getAttribute('height')).toMatch(/^\d+$/);
		}
	});

	it('only links through https, mailto, an anchor or a path on the site itself', () => {
		for (const link of page.querySelectorAll('a[href]')) {
			const href = link.getAttribute('href') ?? '';

			expect(href).toMatch(/^(?:https:\/\/|mailto:|#|\/(?!\/))/);
		}
	});

	it('when there are links to the document viewer, the page ships the viewer and the links work without it', () => {
		const links = page.querySelectorAll('a[data-viewer]');
		if (links.length === 0) {
			expect(
				page.querySelectorAll('dialog[data-viewer-dialog]'),
			).toHaveLength(0);

			return;
		}

		expect(
			page.querySelectorAll('dialog[data-viewer-dialog]'),
		).toHaveLength(1);
		// Closed, the dialog contains no link: one without `href` would look like a broken link (Lighthouse and search engines).
		expect(
			page.querySelectorAll('dialog[data-viewer-dialog] a'),
		).toHaveLength(0);
		for (const link of links) {
			expect(link.getAttribute('href')).toMatch(
				/^\/_astro\/.+\.(webp|pdf)$/,
			);
			expect(link.getAttribute('target')).toBe('_blank');
			expect(link.getAttribute('data-viewer-title')).toMatch(/\S/);
		}
	});

	it('opens links in a new tab only with noopener', () => {
		for (const link of page.querySelectorAll('a[target="_blank"]')) {
			expect(link.getAttribute('rel')).toContain('noopener');
		}
	});

	it('every internal link leads to something that exists', () => {
		const ids = new Set(page.querySelectorAll('[id]').map((el) => el.id));

		for (const link of page.querySelectorAll('a[href]')) {
			const href = link.getAttribute('href') ?? '';
			if (isExternal(href)) continue;

			if (href.startsWith('#')) {
				expect(ids, `anchor ${href}`).toContain(href.slice(1));
			} else {
				const file = href.replace(/^\//, '');
				const exists =
					file === '' ||
					distHas(file) ||
					distHas(`${file}/index.html`);

				expect(exists, `link ${href}`).toBe(true);
			}
		}
	});
});

describe('main page', () => {
	const page = parsePage('index.html');

	it('keeps the v1 anchors so that old links keep working', () => {
		const ids = new Set(page.querySelectorAll('[id]').map((el) => el.id));

		for (const anchor of [
			'home',
			'about-me',
			'resume',
			'portfolio',
			'contact',
		]) {
			expect(ids).toContain(anchor);
		}
	});

	it('shows the CV download link only if the profile declares a CV, and then the file exists', () => {
		const [profile] = parse(
			readFileSync(
				new URL('../../src/data/profile.yaml', import.meta.url),
				'utf8',
			),
		);
		const links = page.querySelectorAll('a.cv');

		expect(links).toHaveLength(profile.cv ? 1 : 0);
		for (const link of links) {
			expect(distHas(link.getAttribute('href') ?? '')).toBe(true);
		}
	});

	it('has the link to skip to the content', () => {
		const skip = page.querySelector('a.skip-link');

		expect(skip?.getAttribute('href')).toBe('#contenido');
		expect(page.querySelector('#contenido')).not.toBeNull();
	});
});

describe("the main page's folder", () => {
	const page = parsePage('index.html');
	const folder = page.querySelector('[data-folder]');
	const pages = page.querySelectorAll('[data-page]');
	const leaves = page.querySelectorAll('[data-leaf]');
	const order = Object.values(SECTION_IDS) as string[];

	it('is a single folder, driven on a wide screen by the scroll, the keyboard and the menu: its turn buttons are only for screen readers', () => {
		expect(page.querySelectorAll('[data-folder]')).toHaveLength(1);
		const buttons = folder?.querySelectorAll('.viewport > button') ?? [];
		expect(
			buttons.map((button) => button.getAttribute('data-turn')),
		).toEqual(['prev', 'next']);
		for (const button of buttons) {
			expect(button.classList.contains('visually-hidden')).toBe(true);
			expect(button.getAttribute('tabindex')).toBe('-1');
		}
		expect(page.querySelector('[data-status]')).toBeNull();
	});

	it('carries the bar that turns the sheets on a narrow screen, with real buttons and a counter that is not read twice', () => {
		const pager = folder?.querySelector('.pager');
		const buttons = pager?.querySelectorAll('button') ?? [];

		expect(pager?.getAttribute('role')).toBe('group');
		expect(pager?.getAttribute('aria-label')).toBeTruthy();
		expect(
			buttons.map((button) => button.getAttribute('data-turn')),
		).toEqual(['prev', 'next']);
		for (const button of buttons) {
			expect(button.getAttribute('type')).toBe('button');
			expect(button.hasAttribute('tabindex')).toBe(false);
			expect(button.textContent?.trim()).not.toBe('');
		}
		// The page being read is announced by the live region: the counter is only for the eyes.
		expect(
			pager
				?.querySelector('[data-pager-count]')
				?.getAttribute('aria-hidden'),
		).toBe('true');
	});

	it('starts with the cover, which is the start (#home) and is named by the single h1', () => {
		const [cover] = pages;

		expect(cover?.getAttribute('data-kind')).toBe('cover');
		expect(cover?.id).toBe('home');
		// The h1 lives outside the sheets so the page has a title whichever sheet is in view.
		expect(
			page.getElementById(cover?.getAttribute('aria-labelledby') ?? '')
				?.tagName,
		).toBe('H1');
		expect(cover?.querySelectorAll('h1')).toHaveLength(0);
	});

	it('puts the pages in the order of the sections, never going back', () => {
		const positions = pages.map((element) =>
			order.indexOf(element.getAttribute('data-section') ?? ''),
		);

		expect(positions.every((position) => position >= 0)).toBe(true);
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	it('splits the pages into double-sided sheets: the cover alone, then two by two', () => {
		// The cover alone and, after it, one sheet for every two pages: no page is left out or repeated.
		expect(leaves).toHaveLength(1 + Math.ceil((pages.length - 1) / 2));
		expect(
			leaves.reduce(
				(sum, leaf) =>
					sum + leaf.querySelectorAll('[data-page]').length,
				0,
			),
		).toBe(pages.length);

		leaves.forEach((leaf, index) => {
			const faces = leaf.querySelectorAll('[data-page]');
			const blank = leaf.querySelectorAll('.page--blank');

			expect(faces.length + blank.length).toBe(2);
			expect(faces[0]?.classList.contains('page--front')).toBe(true);
			if (faces[1])
				expect(faces[1].classList.contains('page--back')).toBe(true);
			if (index === 0) expect(faces).toHaveLength(1);
		});
	});

	it('names every page with a heading that exists and says something', () => {
		for (const element of pages) {
			const id = element.getAttribute('aria-labelledby') ?? '';
			const heading = page.getElementById(id);

			expect(
				heading,
				`page ${element.getAttribute('data-title')}`,
			).not.toBeNull();
			expect(heading?.textContent.trim()).not.toBe('');
		}
	});

	it('has one tab per section with pages, leading to the first page of that section', () => {
		const tabs = page.querySelectorAll('[data-site-nav] a');
		const sections = new Set(
			pages
				.map((element) => element.getAttribute('data-section') ?? '')
				.filter((section) => section !== 'home'),
		);

		expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual(
			[...sections].map((section) => `#${section}`),
		);
		for (const section of sections) {
			const first = pages.find(
				(element) => element.getAttribute('data-section') === section,
			);

			expect(first?.id).toBe(section);
		}
	});
});
