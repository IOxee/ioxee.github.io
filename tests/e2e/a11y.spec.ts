import AxeBuilder from '@axe-core/playwright';
import { pagesAtPosition, positionCount } from '../../src/lib/book';
import { type Page, expect, test } from '@playwright/test';
import {
	SCHEMES,
	VIEWPORT_HEIGHT,
	settle,
	showPosition,
	visiblePages,
} from './support';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violationsOf(page: Page): Promise<string[]> {
	const { violations } = await new AxeBuilder({ page })
		.withTags(TAGS)
		.analyze();

	return violations.map(
		(violation) =>
			`${violation.id}: ${violation.nodes
				.map((node) => node.target.join(' '))
				.join(' | ')}`,
	);
}

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
	for (const scheme of SCHEMES) {
		for (const width of [375, 1440]) {
			test(`the main page has no violations: ${scheme}, ${width}px`, async ({
				page,
			}) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
				await page.goto('/');
				await settle(page);

				expect(await violationsOf(page)).toEqual([]);
			});
		}
	}

	for (const scheme of SCHEMES) {
		test(`the open folder, sheet by sheet, has no violations: ${scheme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.setViewportSize({
				width: 1440,
				height: VIEWPORT_HEIGHT,
			});
			await page.goto('/');
			await settle(page);

			const found: string[] = [];
			for (const position of [1, 2, 3, 4, 5, 6]) {
				await showPosition(page, position);
				await settle(page);

				for (const violation of await violationsOf(page)) {
					found.push(`position ${position}: ${violation}`);
				}
			}

			expect(found).toEqual([]);
		});
	}

	test('the 404 page has no violations and responds with 404', async ({
		page,
	}) => {
		const response = await page.goto('/esta-pagina-no-existe');
		await settle(page);

		expect(response?.status()).toBe(404);
		expect(await violationsOf(page)).toEqual([]);
	});

	test('has a structure of headings and regions that a screen reader can follow', async ({
		page,
	}) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByRole('navigation')).toHaveCount(1);
		await expect(page.getByRole('contentinfo')).toHaveCount(1);
		// Every page with a title announces it: no "mute" sheets in the accessibility tree. This is
		// checked in the HTML, where all of them are visible: if one loses its `aria-labelledby` it stops being a
		// region and the loop below would not see it.
		const pages = await page.locator('main [data-page]').count();
		expect(pages).toBeGreaterThan(5);
		const named = await page.evaluate(
			() =>
				[...document.querySelectorAll('main [data-page]')].filter(
					(element) => {
						const id = element.getAttribute('aria-labelledby');

						return (
							id !== null &&
							(
								document.getElementById(id)?.textContent ?? ''
							).trim() !== ''
						);
					},
				).length,
		);
		expect(named).toBe(pages);
	});

	test('the accessibility tree only has the pages that are read: one when closed, two with the folder open', async ({
		page,
		browserName,
	}) => {
		// The tree the browser builds is read: Playwright's selectors do not treat `inert`
		// as hidden, but a screen reader does leave it out.
		test.skip(
			browserName !== 'chromium',
			'The tree is requested over CDP.',
		);

		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);
		const session = await page.context().newCDPSession(page);

		const regionNames = async (): Promise<string[]> => {
			const { nodes } = (await session.send(
				'Accessibility.getFullAXTree',
			)) as {
				nodes: {
					ignored?: boolean;
					role?: { value?: string };
					name?: { value?: string };
				}[];
			};

			return nodes
				.filter(
					(node) => !node.ignored && node.role?.value === 'region',
				)
				.map((node) => node.name?.value ?? '');
		};

		// Closed, only the cover; open, the back of the turned sheet and the front of the next one.
		// Which pages those are is given by the same calculation the folder uses, so as not to depend on the data.
		const total = await page.locator('[data-page]').count();
		for (const position of [0, 2, positionCount(total, 'spread') - 2]) {
			const { left, right } = pagesAtPosition(position, total, 'spread');
			const expected = [left, right].filter((page) => page !== null);
			await showPosition(page, position);

			expect(await visiblePages(page)).toEqual(expected);
			const names = await regionNames();
			expect(names).toHaveLength(expected.length);
			for (const name of names) expect(name).toMatch(/\S/);
		}
	});
});
