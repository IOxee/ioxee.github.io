/**
 * On a narrow screen every sheet is as tall as the screen, and whatever does not fit on a page goes on to new
 * sheets right behind it. Those sheets only exist in the browser: they are made here, from the page itself,
 * and undone (`restore`) when the screen changes, so the HTML, the folder open on a wide screen and the
 * list without JavaScript stay as they were. Where each page is cut is decided by `lib/paging.ts`.
 */
import {
	type BlockBox,
	MAX_CONTINUATIONS,
	MIN_ITEMS,
	largestFitting,
	pageBreak,
	paragraphRoom,
} from '../lib/paging';
import { fill } from '../lib/text';

/** Blocks that are cut between their children: a list by its items, an entry between its lines. */
const CUT_BETWEEN = 'ul, ol, dl, .group, .doc-entry, .doc-cert-text';
/** Blocks with nothing but text, which are cut between two words. */
const CUT_WORDS = 'p, li';
/** They go with what follows them: a title, or the dates line of an entry. */
const HEADING = 'h2, h3, h4, .doc-runhead, .doc-meta';
/** They go with what comes before them: the links of a project or a certificate. */
const GLUED = '.doc-links';
const LIST = 'ul, ol, dl';

const isHeading = (element: Element): boolean => element.matches(HEADING);

const cutsWords = (element: Element): boolean =>
	element.matches(CUT_WORDS) && element.children.length === 0;

const isSplittable = (element: Element): boolean =>
	!isHeading(element) &&
	((element.matches(CUT_BETWEEN) && element.children.length > 1) ||
		cutsWords(element));

/** Where an element is from the top of `root`, without the turn of the sheets (transforms do not count). */
function topWithin(element: HTMLElement, root: HTMLElement): number {
	let top = 0;
	let current: HTMLElement | null = element;
	while (current && current !== root) {
		top += current.offsetTop;
		const parent: Element | null = current.offsetParent;
		current = parent instanceof HTMLElement ? parent : null;
	}

	return top;
}

function boxOf(element: Element, root: HTMLElement): BlockBox {
	const own = element as HTMLElement;
	const top = topWithin(own, root);

	return {
		top,
		bottom: top + own.offsetHeight,
		heading: isHeading(element),
		splittable: isSplittable(element),
		glued: element.matches(GLUED),
	};
}

/** An empty copy of an element, to carry on in the next sheet what does not fit in it. */
function continuationOf<T extends Element>(element: T): T {
	const copy = element.cloneNode(false) as T;
	copy.removeAttribute('id');
	copy.setAttribute('data-continued', '');

	return copy;
}

/** Where the text of a page has to end: above its bottom padding. One pixel of margin absorbs the rounding. */
const limitOf = (page: HTMLElement): number =>
	page.clientHeight -
	Number.parseFloat(getComputedStyle(page).paddingBottom) +
	1;

const blocksOf = (element: Element): Element[] =>
	[...element.children].filter((child) => !child.classList.contains('folio'));

/** Measured block by block: the margin under the last one does not count, as it would with `scrollHeight`. */
const overflows = (page: HTMLElement): boolean => {
	const limit = limitOf(page);

	return blocksOf(page).some((block) => boxOf(block, page).bottom > limit);
};

/** The copies made here are thrown away whole: only the elements of the page itself need putting back. */
const isOwn = (element: Element): boolean =>
	!element.hasAttribute('data-continued');

/** The text that goes at the top of a sheet that carries on another one, with `{title}`. */
export interface PaginatorTexts {
	continued: string;
}

export class Paginator {
	/** What each changed element had inside, to put it back exactly as it was. */
	private readonly saved = new Map<Element, Node[]>();
	/** The sheets made here, each with the page it carries on. */
	private readonly origins = new Map<HTMLElement, HTMLElement>();
	private readonly texts: PaginatorTexts;

	constructor(texts: PaginatorTexts) {
		this.texts = texts;
	}

	/** The page a sheet carries on, or the sheet itself if it is not one made here. */
	originOf(page: HTMLElement): HTMLElement {
		return this.origins.get(page) ?? page;
	}

	/**
	 * Cuts every page that does not fit into as many as needed. A page that cannot be cut (a block taller than the
	 * whole sheet) is left as `data-overflow`, and it scrolls inside.
	 */
	paginate(pages: readonly HTMLElement[]): void {
		for (const page of pages) {
			if (page.dataset.kind === 'cover') continue;

			let current = page;
			for (let part = 1; overflows(current); part++) {
				const next =
					part <= MAX_CONTINUATIONS
						? this.splitPage(current, page, part)
						: null;
				if (!next) {
					current.dataset.overflow = '';
					break;
				}
				current = next;
			}
		}
	}

	/** Undoes everything: each piece goes back to its page and the sheets made here disappear. */
	restore(): void {
		for (const [element, nodes] of this.saved)
			element.replaceChildren(...nodes);
		for (const page of this.origins.keys()) page.remove();
		for (const page of document.querySelectorAll<HTMLElement>(
			'[data-page][data-overflow]',
		)) {
			delete page.dataset.overflow;
		}
		this.saved.clear();
		this.origins.clear();
	}

	private remember(element: Element, nodes = [...element.childNodes]): void {
		if (isOwn(element) && !this.saved.has(element))
			this.saved.set(element, nodes);
	}

	private splitPage(
		page: HTMLElement,
		origin: HTMLElement,
		part: number,
	): HTMLElement | null {
		const sheet = this.cut(page, limitOf(page), page);
		if (!sheet) return null;

		// The new sheet says which page it carries on: it is its name for screen readers and in the announcements.
		const title = fill(this.texts.continued, {
			title: origin.dataset.title ?? '',
		});
		const head = document.createElement('p');
		head.className = 'doc-runhead';
		head.id = `${origin.getAttribute('aria-labelledby') ?? 'page'}-${part}`;
		head.textContent = title;
		const folio = document.createElement('p');
		folio.className = 'folio';
		folio.setAttribute('aria-hidden', 'true');

		sheet.dataset.anchor = 'false';
		sheet.dataset.title = title;
		sheet.setAttribute('aria-labelledby', head.id);
		sheet.prepend(head);
		sheet.append(folio);
		page.after(sheet);
		this.origins.set(sheet, origin);

		return sheet;
	}

	/**
	 * Cuts `element` at `limit` (measured from the top of `root`): what does not fit goes to an empty copy of it,
	 * which is returned. `null` if it cannot be cut.
	 */
	private cut<T extends Element>(
		element: T,
		limit: number,
		root: HTMLElement,
	): T | null {
		const children = blocksOf(element);
		const boxes = children.map((child) => boxOf(child, root));
		const minItems = element.matches(LIST) ? MIN_ITEMS : 1;
		let point = pageBreak(boxes, limit, minItems);
		let carried: Element | null = null;

		if (point?.split != null) {
			const child = children[point.split] as Element;
			carried = cutsWords(child)
				? this.cutWords(child as HTMLElement, limit, root)
				: this.cut(child, limit, root);
			if (!carried) {
				// It could not be cut after all: it goes whole.
				const whole = boxes.map((box, index) =>
					index === point?.split
						? { ...box, splittable: false }
						: box,
				);
				point = pageBreak(whole, limit, minItems);
			}
		}
		if (!point) return null;

		this.remember(element);
		const rest = continuationOf(element);
		if (carried) rest.append(carried);
		rest.append(...children.slice(point.from));

		return rest;
	}

	/** Cuts a paragraph between two words: as many as fit stay, and the rest goes to a copy of it. */
	private cutWords(
		paragraph: HTMLElement,
		limit: number,
		root: HTMLElement,
	): HTMLElement | null {
		const words = (paragraph.textContent ?? '').trim().split(/\s+/);
		if (words.length < 2) return null;

		const original = [...paragraph.childNodes];
		const top = topWithin(paragraph, root);
		const lineHeight = Number.parseFloat(
			getComputedStyle(paragraph).lineHeight,
		);
		const room = paragraphRoom(
			top,
			limit,
			Math.round(paragraph.offsetHeight / lineHeight),
			lineHeight,
		);
		if (room === null) return null;

		const show = (count: number) => {
			paragraph.textContent = words.slice(0, count).join(' ');
		};
		const kept = largestFitting(words.length - 1, (count) => {
			show(count);

			return top + paragraph.offsetHeight <= room + 1;
		});
		if (kept === 0) {
			paragraph.replaceChildren(...original);
			return null;
		}

		this.remember(paragraph, original);
		show(kept);
		const rest = continuationOf(paragraph);
		rest.textContent = words.slice(kept).join(' ');

		return rest;
	}
}
