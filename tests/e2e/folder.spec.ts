import { type Page, expect, test } from '@playwright/test';
import {
	VIEWPORT_HEIGHT,
	folderGeometry,
	settle,
	showPosition,
	visiblePages,
} from './support';

const SCREENS = [
	[1366, 650],
	[1440, 900],
	[1920, 1080],
	[3440, 1440],
] as const;

/**
 * Prevents the folder from finishing placing the sheets on its own, to see the half turn that is
 * visible while scrolling. The folder moves the scroll with `window.scrollTo`; the test, with that of
 * the root element, which keeps working.
 */
async function freezeSettling(page: Page): Promise<void> {
	await page.evaluate(() => {
		window.scrollTo = () => undefined;
	});
}

function jumpTo(page: Page, top: number): Promise<void> {
	return page.evaluate(
		(y) =>
			document.documentElement.scrollTo({ top: y, behavior: 'instant' }),
		top,
	);
}

test.describe('the folder', () => {
	test('has no buttons or status text: it is driven by the scroll, the keyboard and the menu', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const buttons = await page.locator('[data-folder] button').all();
		expect(buttons).toHaveLength(2);
		for (const button of buttons) {
			await expect(button).toHaveAttribute('tabindex', '-1');
			const box = await button.boundingBox();
			expect((box?.width ?? 0) * (box?.height ?? 0)).toBeLessThanOrEqual(
				1,
			);
		}
		await expect(page.locator('[data-status]')).toHaveCount(0);
		await expect(page.getByText('Portada: ')).toHaveCount(0);
		await expect(page.getByText('Ver como lista')).toHaveCount(0);
	});

	for (const [width, height] of SCREENS) {
		test(`fills the screen between the menu and the footer at ${width}×${height}`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height });
			await page.goto('/');
			await settle(page);

			const { parallax } = await folderGeometry(page);
			expect(parallax).toBe(true);

			const boxes = await page.evaluate(() => {
				const rect = (selector: string) => {
					const {
						top,
						bottom,
						height: h,
					} = (
						document.querySelector(selector) as Element
					).getBoundingClientRect();

					return { top, bottom, height: h };
				};

				return {
					bar: rect('[data-site-bar]'),
					stage: rect('[data-stage]'),
					footer: rect('body > footer'),
					cover: rect('.page--cover'),
				};
			});

			expect(boxes.bar.top).toBe(0);
			expect(boxes.stage.top).toBeCloseTo(boxes.bar.bottom, 0);
			expect(boxes.footer.bottom).toBeCloseTo(height, 0);
			expect(boxes.stage.bottom).toBeCloseTo(boxes.footer.top, 0);
			expect(boxes.cover.top).toBeGreaterThanOrEqual(boxes.stage.top);
			expect(boxes.cover.bottom).toBeLessThanOrEqual(boxes.stage.bottom);
			expect(boxes.cover.height / boxes.stage.height).toBeGreaterThan(
				0.7,
			);
		});
	}

	test('scrolling turns the sheets continuously and marks the page being read', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const { step, base } = await folderGeometry(page);
		const progress = () =>
			page.evaluate(() =>
				Number.parseFloat(
					document
						.querySelector<HTMLElement>('[data-folder]')
						?.style.getPropertyValue('--progress') ?? 'NaN',
				),
			);

		await freezeSettling(page);

		for (const fraction of [0.25, 0.5, 0.75, 1.5]) {
			await jumpTo(page, base + fraction * step);
			await expect.poll(progress).toBeCloseTo(fraction, 1);
		}

		expect(await visiblePages(page)).toEqual([2, 3]);
	});

	test('with the folder open, the two pages sit at the same height and flush at the spine', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		for (const position of [2, 3, 5]) {
			await showPosition(page, position);

			const [left, right] = await page.evaluate(() =>
				[...document.querySelectorAll<HTMLElement>('[data-page]')]
					.filter((element) => !element.inert)
					.map((element) => {
						const { left, right, top, bottom } =
							element.getBoundingClientRect();

						return { left, right, top, bottom };
					}),
			);
			if (!left || !right) throw new Error('There should be two pages');

			expect(Math.abs(left.top - right.top)).toBeLessThanOrEqual(1);
			expect(Math.abs(left.bottom - right.bottom)).toBeLessThanOrEqual(1);
			expect(Math.abs(left.right - right.left)).toBeLessThanOrEqual(2);
			expect(left.left).toBeLessThan(right.left);
		}
	});

	for (const [width, anchor] of [
		[1440, '#portfolio'],
		[1440, '#resume'],
		[375, '#portfolio'],
		[375, '#resume'],
	] as const) {
		test(`entering through the ${anchor} anchor at ${width}px leaves the folder on that sheet, still and marked in the menu`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
			await page.goto(`/${anchor}`);
			await settle(page);

			await expect(
				page.locator('[data-site-nav] a[aria-current]'),
			).toHaveAttribute('href', anchor);
			await expect(page.locator(anchor)).not.toHaveAttribute(
				'inert',
				/.*/,
			);
			await expect(page).toHaveURL(new RegExp(`${anchor}$`));

			// The browser does its own scroll to the anchor: the folder cannot be left with a
			// half-turned sheet. The progress ends up being an exact reading point.
			const { parallax } = await folderGeometry(page);
			if (parallax) {
				await expect
					.poll(async () => {
						const progress = await page.evaluate(() =>
							Number.parseFloat(
								document
									.querySelector<HTMLElement>('[data-folder]')
									?.style.getPropertyValue('--progress') ??
									'NaN',
							),
						);

						return Math.abs(progress - Math.round(progress));
					})
					.toBeLessThan(0.02);
			}
		});
	}

	test('on a narrow screen it turns by itself, one page at a time, and is driven by the menu', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 700 });
		await page.goto('/');
		await settle(page);

		const { parallax } = await folderGeometry(page);
		expect(parallax).toBe(false);

		await page.locator('[data-site-nav] a[href="#portfolio"]').click();

		await expect(
			page.locator('[data-site-nav] a[aria-current]'),
		).toHaveAttribute('href', '#portfolio');
		expect(await visiblePages(page)).toHaveLength(1);
	});
});

test.describe('the cover', () => {
	test('on a tall screen the folder has the proportions of a sheet of paper, taller than wide, and leaves room above and below', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('/');
		await settle(page);

		const { cover, stage } = await page.evaluate(() => {
			const box = (selector: string) => {
				const { top, bottom, width, height } = (
					document.querySelector(selector) as Element
				).getBoundingClientRect();

				return { top, bottom, width, height };
			};

			return { cover: box('.page--cover'), stage: box('[data-stage]') };
		});

		expect(cover.height / cover.width).toBeGreaterThan(1.25);
		expect(cover.top - stage.top).toBeGreaterThan(30);
		expect(stage.bottom - cover.bottom).toBeGreaterThan(30);
	});

	test('invites scrolling when scrolling turns the sheets, and not when it does not', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);
		await expect(page.locator('.cover-scroll')).toBeVisible();
		await expect(page.locator('.cover-scroll')).toContainText('Haz scroll');

		await page.setViewportSize({ width: 375, height: 700 });
		await expect(page.locator('[data-folder]')).toHaveAttribute(
			'data-scroll',
			'off',
		);
		await expect(page.locator('.cover-scroll')).toBeHidden();
	});
});

test.describe('the folder without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('shows all the pages one after another, with its menu, and no controls that would not work', async ({
		page,
	}) => {
		await page.goto('/');

		const pages = page.locator('[data-page]');
		expect(await pages.count()).toBeGreaterThan(6);
		for (const element of await pages.all()) {
			await expect(element).toBeVisible();
		}
		await expect(page.locator('.page--blank').first()).toBeHidden();

		for (const href of ['#about-me', '#resume', '#portfolio', '#contact']) {
			await expect(
				page.locator(`[data-site-nav] a[href="${href}"]`),
			).toBeVisible();
			await expect(page.locator(href)).toHaveCount(1);
		}
		for (const button of await page.locator('[data-folder] button').all()) {
			await expect(button).toBeHidden();
		}
	});
});

test.describe('the folder keeps its place', () => {
	const currentPage = (page: Page) =>
		page.evaluate(() =>
			Number(
				document
					.querySelector<HTMLElement>(
						'[data-page][data-state="current"]',
					)
					?.style.getPropertyValue('--i'),
			),
		);
	const progress = (page: Page) =>
		page.evaluate(() =>
			Number.parseFloat(
				document
					.querySelector<HTMLElement>('[data-folder]')
					?.style.getPropertyValue('--progress') ?? 'NaN',
			),
		);

	test('when the width changes, from an open folder to one page and back, it stays on the same page', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/#portfolio');
		await settle(page);
		const reading = await currentPage(page);
		expect(reading).toBeGreaterThan(0);

		for (const [width, wide] of [
			[900, false],
			[1440, true],
		] as const) {
			await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
			// Waits for the folder to have changed layout and for the scroll to settle: a
			// poll would accept the reading from before the change.
			await page.waitForFunction(
				(open) => matchMedia('(min-width: 60rem)').matches === open,
				wide,
			);
			await page.waitForTimeout(400);

			expect(await currentPage(page)).toBe(reading);
		}
		await expect(page).toHaveURL(/#portfolio$/);
	});

	test('"Back" to the address without an anchor returns to the cover', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		await page.locator('[data-site-nav] a[href="#portfolio"]').click();
		await expect.poll(() => currentPage(page)).toBeGreaterThan(0);

		await page.goBack();
		await expect.poll(() => currentPage(page)).toBe(0);
		await expect(
			page.locator('[data-site-nav] a[aria-current]'),
		).toHaveCount(0);
	});

	test('the arrows keep turning sheets after jumping with a tab', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		await page.locator('[data-site-nav] a[href="#resume"]').click();
		await expect(page.locator('#resume')).toBeFocused();
		const before = await currentPage(page);
		await page.keyboard.press('ArrowRight');
		await expect.poll(() => currentPage(page)).toBeGreaterThan(before);
	});

	test('when the scroll is released between two sheets, the folder finishes turning the one that was passing', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const { step, base } = await folderGeometry(page);
		await page.evaluate(
			(top) => window.scrollTo({ top, behavior: 'instant' }),
			base + 2.3 * step,
		);

		await expect
			.poll(async () => {
				const value = await progress(page);

				return Math.abs(value - Math.round(value));
			})
			.toBeLessThan(0.02);
	});

	test('with reduced motion there are no half-turned sheets: they jump whole', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);
		await freezeSettling(page);

		const { step, base } = await folderGeometry(page);
		await jumpTo(page, base + 1.3 * step);

		await expect.poll(() => progress(page)).toBe(1);
	});

	test('one wheel tick turns a whole sheet and scrolling up turns it back: there is no need to "charge" the scroll', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);
		await page.mouse.move(720, 450);

		// A hundred pixels is what a tick of a normal wheel moves: a small fraction of the sheet,
		// which with a "nearest" snap stop went back.
		for (const [delta, expected] of [
			[100, 1],
			[100, 2],
			[-100, 1],
			[-100, 0],
		] as const) {
			await page.mouse.wheel(0, delta);
			await expect.poll(() => progress(page)).toBe(expected);
		}
	});

	test('a keyboard arrow, with the focus outside the folder, also turns a sheet', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		await page.keyboard.press('ArrowDown');
		await expect.poll(() => progress(page)).toBe(1);
		await page.keyboard.press('ArrowUp');
		await expect.poll(() => progress(page)).toBe(0);
	});

	test('the footer is always visible and the run ends right on the last sheet, with no extra stretch of scroll', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		const { positions, step, base } = await folderGeometry(page);
		const footer = page.locator('body > footer');
		const bottom = () =>
			footer.evaluate(
				(element) => element.getBoundingClientRect().bottom,
			);

		for (const top of [0, base + 3 * step, 1e6]) {
			await jumpTo(page, top);
			await expect.poll(bottom).toBeCloseTo(VIEWPORT_HEIGHT, 0);
		}

		const end = await page.evaluate(
			() => document.documentElement.scrollHeight - innerHeight,
		);
		expect(
			Math.abs(end - (base + (positions - 1) * step)),
		).toBeLessThanOrEqual(1);
		await expect.poll(() => progress(page)).toBe(positions - 1);

		await page.mouse.move(720, 450);
		await page.mouse.wheel(0, 400);
		await page.waitForTimeout(400);
		expect(await page.evaluate(() => Math.round(scrollY))).toBe(
			Math.round(end),
		);
		expect(await progress(page)).toBe(positions - 1);
	});

	test('the footer is always visible also when the folder is not pinned', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');
		await settle(page);

		const { parallax } = await folderGeometry(page);
		expect(parallax).toBe(false);

		const bottom = () =>
			page
				.locator('body > footer')
				.evaluate((element) => element.getBoundingClientRect().bottom);
		await expect.poll(bottom).toBeCloseTo(844, 0);
		await jumpTo(page, 300);
		await expect.poll(bottom).toBeCloseTo(844, 0);
	});

	test('the buttons for screen readers turn the sheet forward and back', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: VIEWPORT_HEIGHT });
		await page.goto('/');
		await settle(page);

		// A screen reader activates them even if they are not visible: here, with a programmatic click.
		await page.locator('[data-turn="next"]').dispatchEvent('click');
		await expect.poll(() => currentPage(page)).toBe(1);
		await page.locator('[data-turn="prev"]').dispatchEvent('click');
		await expect.poll(() => currentPage(page)).toBe(0);
	});
});

test.describe('the folder with a finger', () => {
	test.use({ hasTouch: true, viewport: { width: 375, height: 700 } });

	test('a tap on the right edge turns the sheet and one on the left edge turns it back', async ({
		page,
	}) => {
		await page.goto('/');
		await settle(page);

		const box = await page.locator('[data-viewport]').boundingBox();
		if (!box) throw new Error('The folder is not visible');
		const middle = box.y + Math.min(box.height, 600) / 2;
		const current = () =>
			page.evaluate(() =>
				Number(
					document
						.querySelector<HTMLElement>(
							'[data-page][data-state="current"]',
						)
						?.style.getPropertyValue('--i'),
				),
			);

		await page.touchscreen.tap(box.x + box.width - 12, middle);
		await expect.poll(current).toBe(1);
		await page.touchscreen.tap(box.x + 12, middle);
		await expect.poll(current).toBe(0);
	});
});
