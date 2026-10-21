# ioxee.github.io

Portfolio of [Isidro Rosell](https://ioxee.github.io/), full-stack developer. It is built with [Astro](https://astro.build) and TypeScript, with no jQuery, and published as a static site on GitHub Pages.

The design is a yellow evidence folder on a desk: on the cover, a polaroid with a clip and a stamp with the name; inside, the résumé on double-sided sheets that turn with the scroll, like a parallax. It has a day theme and a night theme.

## Getting started

Node 22.19 or later is required: the scripts (`assets:*`) run TypeScript directly, and Lighthouse asks for that version.

```bash
npm install
npm run dev
```

The development server is at <http://localhost:4321>.

## Commands

| Command                   | What it does                                                                      |
| ------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`             | Development server.                                                               |
| `npm run build`           | Builds the site into `dist/`.                                                     |
| `npm run preview`         | Serves `dist/`. It is the way to try the CSP, which is not applied in `dev`.      |
| `npm run check`           | Type-checks TypeScript and the `.astro` files.                                    |
| `npm test`                | Unit tests and data tests.                                                        |
| `npm run test:coverage`   | The same, requiring 80 % coverage per file in `src/lib/`.                         |
| `npm run test:dist`       | Tests on the compiled HTML (CSP, SEO, links). Needs `npm run build`.              |
| `npm run test:e2e`        | Browser tests (Chromium and Firefox). Needs `npm run build`.                      |
| `npm run test:lighthouse` | Lighthouse on mobile and desktop. Needs `npm run build`.                          |
| `npm run test:visual`     | Compares screenshots with the reference ones. See "Browser tests".                |
| `npm run format`          | Formats with Prettier. `format:check` only checks.                                |
| `npm run assets:brand`    | Regenerates the favicon ("IO") and the Apple icon in `public/`.                   |
| `npm run assets:og`       | Regenerates `public/og.jpg`, the image shown when sharing. Needs `npm run build`. |

## Changing the content

Everything that is read on the page comes from `src/data/*.yaml`. There is no need to touch components to update it. The build validates it against a schema ([`src/lib/schemas.ts`](src/lib/schemas.ts)) and fails with a clear message if something does not fit.

| File                  | Content                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `profile.yaml`        | Name, headline, date of birth, "About me", links.                                             |
| `experience.yaml`     | Work and education. Dates are `'YYYY'` or `'YYYY-MM'`; `end: null` means "ongoing".           |
| `skills.yaml`         | Skills: start year and use (`daily`, `comfortable`, `intermediate`, `basic`).                 |
| `certifications.yaml` | Certifications and courses that are not formal education: issuer, dates, verification link.   |
| `projects.yaml`       | Projects, with `start` and `end` as in the experience: they are listed from newest to oldest. |
| `languages.yaml`      | Languages and level, with `order`.                                                            |

Things worth knowing:

- The years of each skill are computed from `since`. With `provisional: true` the site hides the years and shows only the status, until you confirm the date.
- The "Descargar CV" link ("Download CV" on the English page) only appears if `profile.yaml` declares `cv` (a path under `public/`, e.g. `/assets/documents/curriculum.pdf`). There is no published CV today.
- The copyright year and whether a certification is still valid are computed at build time. That is why the deployment runs again every day.
- `certifications.yaml` is optional: if it has no entries (`[]`), there is no certifications sheet or tab and every build warns "No items found", which is expected. In YAML, indentation uses spaces, never tabs (`.editorconfig` already requires it for `.yaml` files).
- **Photo and document of a certification**: besides the verification link (`url`), put the files in `src/assets/certifications/` named after the certification's `id`: `<id>.png`, `.jpg`, `.jpeg` or `.webp` for the photo and `<id>.pdf` for the document. Nothing has to be declared in the YAML. The photo goes the full width of the sheet, with the information below it (in a 3:2 box with the whole photo inside, so a portrait one does not stretch the sheet, and a certification with a photo takes up almost a whole sheet: `PHOTO_WEIGHT` in [`src/lib/folder.ts`](src/lib/folder.ts)); the document appears as a "Ver documento (PDF)" link ("View document (PDF)" on the English page). Both are shown **inside the site itself**, in a modal viewer ([`DocumentViewer.astro`](src/components/DocumentViewer.astro)) that closes with Esc, with the button or by clicking outside, and downloads nothing: the photo is enlarged and the PDF is shown with the browser's own viewer in an `<iframe>` (which is why the CSP has `frame-src 'self'`). The links remain real links: without JavaScript, with Ctrl/Cmd or middle click, or in a browser that cannot show a PDF inside a page (for example Chrome on Android, which would report `pdfViewerEnabled` as false), they open in another tab. A custom alt text for the photo goes in `imageAlt` (`es:`, `ca:`, `en:`); without it the alt text is "Certificado: name" (in the language of the page). A file whose name matches no `id`, that has another extension or that has the extension in capitals would not be used, so the build fails and says which one. Careful: a certificate usually carries your legal name, sometimes the national ID number and a QR code, and everything in the repository is public; cover whatever you do not want to show.
- Each project has its own folder `src/assets/projects/<id>/` (the YAML `id`). The screenshot is `image.png` (or `.jpg`, `.jpeg`, `.webp`) and its alt text goes in `imageAlt`. A project can also carry a PDF: `document.pdf` in that folder (the Spanish one, and the fallback for every language); with `document.en.pdf` or `document.ca.pdf` each language links to its own translation. It appears as a "Ver documento (PDF)" link next to the repository one, in the same viewer as the certification documents. Lowercase names; a file that does not follow that structure makes the build fail and says which one.
- A project that deserves more can carry `details` (`intro`, `points` and, if you want, `closing`): it will have a second page right behind its own, like Cubezon.
- **Languages**: the site is in three, with Spanish as the main one (`/`) and English (`/en/`) and Catalan (`/ca/`) as secondary ones. The switch (`ES · EN · CA`) is in the bar, to the left of the theme button; they are plain links to the same page in each language, so they work without JavaScript, and when switching, the sheet being read is kept. The interface (menu, sheet titles, buttons…) is translated in [`src/lib/ui.ts`](src/lib/ui.ts), and an untranslated key is a build error. The **content** of the YAML files is translated at its own pace: each text carries `es:` and, if you want, `ca:` and `en:`; whatever is missing is shown in Spanish on the other two pages. Known limitation: that Spanish text ends up inside a page marked as English or Catalan, so a screen reader will read it with the wrong voice until it is translated. Each page declares its `lang`, its canonical, the `hreflang` of the three and the `og:locale`; the sitemap lists the three with their alternates.

## The folder

The page is a single folder ([`src/components/Folder.astro`](src/components/Folder.astro)): the cover and, behind it, one page per section, on double-sided sheets.

- **Which pages exist** is decided by [`src/lib/folder.ts`](src/lib/folder.ts) from the data: "About me", experience (three jobs per page), education (four), skills (two categories per page; the languages go on the last one), certifications (four), one project per page (two if it has `details`) and contact. A section without data has no page or tab. How many fit on a page is changed in `DEFAULT_SHEET_SIZES`.
- **Double-sided**: each sheet carries two pages ([`src/lib/book.ts`](src/lib/book.ts)). With the folder open (from 60rem wide) two are seen at once: the back of the sheet that was turned, on the left, and the front of the next one, on the right, so each turn shows two new pages. Narrower, one page is seen at a time.
- **Parallax** (from 60rem wide): the folder fills the screen between the menu and the footer, which are always visible, and stays pinned while the page scrolls; scrolling turns the sheets on the spine, and the run ends right on the last sheet, with the footer already in view. It is scaled to fill the screen, between 0.65 and 2.4 times its size. If it does not fit even shrunk to 0.65 (a very short window), it is not pinned and the sheets turn by themselves (the footer stays visible). On a tall screen (from 800 px) the sheets have the proportions of a sheet of paper, taller than wide, and the folder leaves room above and below. While scrolling turns the sheets, the cover shows an arrow with "Haz scroll" ("Scroll down" on the English page).
- **On a phone** (narrower than 60rem and at least 28rem tall): the folder fits exactly the gap between the menu and the footer, the page does not scroll, and under the folder there is a bar with "Anterior", the page being read ("4 / 25") and "Siguiente". The sheets also turn by swiping sideways, up or down, or tapping an edge; the cover says "Desliza para pasar hoja". Every sheet is as tall as the screen allows, and **whatever does not fit on a page goes on to new sheets right behind it**, made in the browser by [`src/scripts/paginator.ts`](src/scripts/paginator.ts): it moves whole blocks (an entry, a skills group), cuts lists between items and paragraphs between words, never leaves a title, a dates line or a single line or item alone on either side, and keeps the links with their text (the rules are in [`src/lib/paging.ts`](src/lib/paging.ts)). Each new sheet starts with the name of the page it carries on ("Experiencia (1 de 2) — continuación"). Those sheets are only for the screen: they are cut again when the size or the font changes and undone on a wide screen and when printing. A block taller than a whole sheet, which cannot be cut, scrolls inside its sheet. Lying down (less than 28rem tall) the folder keeps its own height, the page scrolls and the bar stays at the foot of the screen.
- **Scrolling finishes turning the sheet**: when it stops between two sheets, the folder carries on in the direction it was going (moving 4 % of the sheet is enough, about 22 px). One wheel tick or a keyboard arrow turns a whole sheet; scrolling up turns it back. The browser's snap stops (`scroll-snap`) are not used: with them, a short tick bounced back to where it was and the scroll had to be "charged". The logic is [`settleTarget`](src/lib/pager.ts) and it is applied on `scrollend` and, in addition, after a moment without movement, because Firefox does not send it after a wheel.
- **Other ways to turn sheets**: with the focus on the folder, the arrows, Page Up, Page Down, Home and End; swiping sideways; and the menu tabs, which lead to the first page of each section. The v1 anchors (`#about-me`, `#resume`, `#portfolio`, `#contact`) still lead to their sheet. When the tabs do not fit in the menu, it slides sideways and the edge that hides more of them fades out.
- **Without JavaScript** and when printing, the pages come out all in a row, one below the other.

## Browser tests

Besides the unit tests and the compiled-HTML ones, `tests/e2e/` uses [Playwright](https://playwright.dev) on the site already built and served with `astro preview` (the CSP only exists in the build). The first time, the browsers have to be downloaded and the site built:

```bash
npx playwright install chromium firefox
npm run build
npm run test:e2e
```

| File                 | What it watches                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y.spec.ts`       | axe with the WCAG rules up to 2.2 AA, in day and night, on mobile and desktop, with the folder open sheet by sheet and on the 404. The accessibility tree only has the pages that are read.                                                                                                                                           |
| `layout.spec.ts`     | No horizontal overflow from 320 to 1920 px, no shifts on load (CLS; Chromium only, Firefox does not measure it), fonts and images.                                                                                                                                                                                                    |
| `keyboard.spec.ts`   | Visible two-tone focus on everything focusable (also inside the sheets), skip-to-content link, theme button, arrows to turn sheets, menu always visible and marking the section.                                                                                                                                                      |
| `folder.spec.ts`     | The folder: fills the screen under the menu at four sizes, no buttons on a wide screen, scrolling turns the sheets, the two open pages aligned at the spine, entering through an anchor, without JavaScript, and on a phone: it fits the screen, no sheet clips its text, the bar, the sheets cut and undone, lying down and swiping. |
| `theme.spec.ts`      | System theme and saved choice, the page without JavaScript, reduced motion and forced colors.                                                                                                                                                                                                                                         |
| `contrast.spec.ts`   | Real contrast of every line of text over the already painted background (with the grain and the gradients), in day and night, at each position of the folder and in the list without JavaScript.                                                                                                                                      |
| `csp.spec.ts`        | The CSP is not broken while using the site, and it really blocks an inline script and an image from another origin.                                                                                                                                                                                                                   |
| `lighthouse.spec.ts` | Performance of 0.9 or more, and no failing accessibility, best-practices or SEO audit, on mobile and desktop.                                                                                                                                                                                                                         |
| `visual.spec.ts`     | Screenshots of the cover, the experience and the projects at six widths (320 to 1920 px) in day and three in night, compared with the reference ones.                                                                                                                                                                                 |

They run in CI on every pull request, except the screenshots. Lighthouse has one exception, explained in the test itself: it cannot read `robots.txt` because the CSP prevents it (the file is valid and `test:dist` checks it).

### Reference screenshots

The visual comparisons (`npm run test:visual`) are not versioned: they weigh about 12 MB per set and the text smoothing changes from one system to another. They are used like this: before touching the CSS or a component, `npm run test:visual:update` saves how it looks now; after touching it, `npm run test:visual` says which widths have changed and leaves the differences in `test-results/`. If the change is the one you wanted, they are generated again. The grain, the images and the footer are hidden in the screenshots, since they weigh a lot or change on their own.

## Structure

```text
src/
  components/   Pieces of the page (the folder, its sheets and pages, the menu, the stamp).
  data/         Content in YAML.
  layouts/      Base.astro: <head>, metadata, theme.
  lib/          Pure logic with tests (age, colors, order, SEO, schemas…).
  pages/        index, 404 and theme.css (the palettes, generated from src/lib/theme.ts).
  scripts/      theme-init.js: sets the theme before painting. paginator.ts: cuts the sheets on a phone.
  styles/       Tokens and global styles.
tests/
  unit/         Astro config and data.
  build/        The compiled HTML (needs `npm run build`).
  e2e/          Browser tests with Playwright.
scripts/        Favicon and share-image generators.
```

## Security

GitHub Pages does not allow setting HTTP headers, so the content security policy (CSP) goes in a `<meta>` tag that Astro generates with `security.csp` in [`astro.config.mjs`](astro.config.mjs).

- Everything is denied by default (`default-src 'none'`). Only images, fonts, scripts and stylesheets from the site itself are allowed.
- There are no third-party scripts. If you add one, the CSP will block it until you deliberately allow it in that configuration.
- The only executable inline script sets the theme before painting, so that there is no flicker. Its hash is computed by `astro.config.mjs` from `src/scripts/theme-init.js` itself: if you edit it, the hash changes by itself. Line breaks are normalized to LF, as the browser does, so that a checkout with CRLF does not invalidate it.
- Limitation: Astro places the CSP meta at the end of the `<head>` and a meta only governs what comes after it. That script and the rest of what precedes it (metadata, JSON-LD, links to `theme.css` and to the fonts) run before the policy exists, so the hash is today a guarantee in case the order changes. `npm run test:dist` pins down exactly what comes before the meta, so that it does not grow without a decision.
- Inline styles are limited to `style` attributes, which is how each page gets its rotation in the list without JavaScript (`--tilt`). The remaining values of the folder are set by the script through the CSSOM, which the CSP does not restrict.
- `npm run test:dist` checks on the compiled HTML that every inline script has its hash, that nothing is loaded from other origins and that the structured data does not include the email or the date of birth.

The email appears in the contact section, as v1 already did in its `mailto:` link; it is not in the structured data.

## Deployment

It is done by GitHub Actions ([`deploy.yml`](.github/workflows/deploy.yml)) on every push to `main` and once a day. Before publishing, the types, the tests, the build and the compiled-HTML tests must pass. Pull requests pass the same checks, plus the formatting one, in [`ci.yml`](.github/workflows/ci.yml).

For it to work, the repository must be set to **Settings → Pages → Source = GitHub Actions**. If it stays on "Deploy from a branch", the branch will serve source code and not the site.

## Previous version

The v1 site (a template with jQuery) is kept in the tag [`v1.3.0`](../../tree/v1.3.0).

## License

[GPL-3.0](LICENSE).
