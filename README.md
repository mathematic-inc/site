# Mathematic Inc. research notes

An academic-paper-style catalog of every public repository in [mathematic-inc](https://github.com/mathematic-inc), with explanations of the problem, implementation, alternatives, and tradeoffs.

**Website:** [mathematic.io](https://mathematic.io/)

The publication has a searchable index and a static article for each repository. Every article includes numbered references, related reading, a print layout, and a downloadable BibTeX citation. It works without client-side JavaScript; JavaScript adds full-text search, URL-based category filters, and citation copying. Fonts are self-hosted, and the site loads no analytics or third-party runtime scripts.

## Development

Use Node.js 26.8.2 or later. Install development dependencies, build the publication, and start the preview server:

```sh
npm ci
npm run build
npm run preview
```

Open [localhost:4183/](http://localhost:4183/). Re-run the build after editing content or assets. The preview serves the production domain-root layout, including direct article links and the custom 404 page. `PORT` can override the preview port.

This repository has no production package dependencies. Node's standard library builds the static output in `dist/`; Playwright and axe are development-only verification dependencies. Keep local worktrees, build output, package caches, browser downloads, and temporary files on the development volume selected by your workspace policy.

## Verify

```sh
npx playwright install chromium
npm run check
```

`check` builds the site, runs Node tests, and runs browser tests at desktop and mobile viewport sizes. The tests cover inventory completeness, source revisions, citations, internal links, article rendering, full-text search, filter history, no-results recovery, clipboard success and failure, no-JavaScript use, search-index failure, 404s, print behavior, and automated WCAG accessibility checks. Automated accessibility checks do not replace manual inspection.

Set `PLAYWRIGHT_BROWSERS_PATH` and `TMPDIR` to approved external storage when your local development policy requires it. To run browser checks against the deployed site:

```sh
SITE_TEST_URL=https://mathematic.io npm run test:browser
```

## Maintain the catalog

Each repository owns a document in `content/projects/`. Its record in `content/repositories.json` stores the reviewed commit and inventory metadata. `src/catalog.mjs` validates and joins those records. `src/render.mjs` owns the HTML reading surfaces; `public/` owns the stylesheet, browser behavior, and fonts. `scripts/` owns build, preview, and inventory checks. Generated files belong only in `dist/`.

To check whether the public inventory has changed:

```sh
npm run catalog:check
```

This command reads GitHub's public API and reports missing or removed repositories. It never changes the authored content. GitHub's unauthenticated API rate limits apply.

When adding or reviewing a note:

1. Read the public README, relevant source, and current primary documentation for alternatives. Distinguish documented historical motivation from an engineering interpretation.
2. Record the repository's full reviewed commit SHA and add or update its project document. Use the existing category and schema fields.
3. State the concrete workflow constraint, the project's mechanism, and the alternative's relevant capabilities. Include a tradeoff and adoption boundaries. Do not infer a product from an empty repository.
4. Add numbered sources in the order referenced. A source with `path` resolves to the recorded repository commit; `tree: true` links to that tree; `url` must be an HTTPS primary source. Use `[1]` citations in the prose. Update the edition's `reviewed` date after review.
5. Run `npm run check` and inspect the rendered index, the edited article, and its print layout. Keep related-project links valid.

The validator rejects missing records, duplicate identifiers, incomplete comparisons, missing or unused source references, invalid related links, and unpinned project revisions. The site repository's own record uses `main` because it describes this living publication. Other project sources are pinned. Upstream documentation can change, so recheck it when revising a comparison.

The catalog contains 19 implementation notes and two repository records: `noop` and this site. These notes are engineering analysis, not peer-reviewed papers. Reported conformance numbers remain attributed to their original repository; this site does not claim to have rerun each project's tests or independently measured comparative performance.

## Deployment

The repository uses GitHub Pages with GitHub Actions as its publishing source. `.github/workflows/pages.yml` builds and verifies pushes and pull requests. Successful pushes to `main` deploy `dist/` through the `github-pages` environment. Pull requests run verification without deploying.

The build deliberately targets `https://mathematic.io/`. Change `base` and `origin` in `src/render.mjs`, the URL assertions in the tests together if the publishing address changes. GitHub Pages uses `mathematic.io` as its custom domain. The apex DNS records point to GitHub Pages, and `www` points to `mathematic-inc.github.io`. The site needs no secrets or application server.

## Typography and license

The code and authored content use Apache-2.0. STIX Two Text is distributed under the SIL Open Font License; the complete font notice is in `public/fonts/OFL.txt`. Third-party projects cited by the notes retain their respective licenses.
