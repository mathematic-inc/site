import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadCatalog } from '../src/catalog.mjs';

const catalog = await loadCatalog(new URL('../', import.meta.url));
const visibleRows = page => page.locator('[data-repository]:visible');

test('index, category navigation, shareable filters, and browser history', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(visibleRows(page)).toHaveCount(21);
  await page.getByRole('button', { name: 'Agents 4', exact: true }).click();
  await expect(visibleRows(page)).toHaveCount(4);
  await expect(page).toHaveURL(/area=agents/);
  await page.getByRole('button', { name: 'Telemetry 2', exact: true }).click();
  await expect(visibleRows(page)).toHaveCount(2);
  await page.goBack();
  await expect(visibleRows(page)).toHaveCount(4);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Agents 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(visibleRows(page)).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('full-text search finds alternative discussion and recovers from no results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('unsalted SHA-256');
  await expect(visibleRows(page)).toHaveCount(1);
  await expect(visibleRows(page)).toHaveAttribute('data-repository', 'alyt');
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue('unsalted SHA-256');
  await expect(visibleRows(page)).toHaveCount(1);
  await page.getByRole('searchbox').fill('zzq-unmatched-271828');
  await expect(page.getByText('Try a different line of inquiry.')).toBeVisible();
  await expect(page.locator('#result-count')).toHaveText('0 repositories / 21');
  await page.getByRole('button', { name: /Clear search and filters/ }).click();
  await expect(visibleRows(page)).toHaveCount(21);
  await expect(page.getByRole('searchbox')).toBeFocused();
});

test('every article supports direct entry, references, and narrow screens without overflow', async ({ page }) => {
  for (const project of catalog.projects) {
    const response = await page.goto(`/projects/${project.slug}/`);
    expect(response.status(), project.slug).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.slug);
    await expect(page.locator('.references li')).toHaveCount(project.sources.length);
    await expect(page.getByRole('link', { name: /Source repository/ })).toHaveAttribute('href', `https://github.com/mathematic-inc/${project.slug}`);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), project.slug).toBe(true);
  }
});

test('footnotes, print control, and downloadable citation work', async ({ page }) => {
  await page.goto('/projects/earl/');
  await page.locator('.citation a').first().click();
  await expect(page).toHaveURL(/#ref-1$/);
  await expect(page.locator('#ref-1')).toBeInViewport();
  const bib = await page.request.get('/projects/earl/cite.bib');
  expect(bib.ok()).toBe(true);
  expect(await bib.text()).toContain('https://mathematic.io/projects/earl/');
  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printInvoked = 'true'; }; });
  await page.getByRole('button', { name: 'Print / save PDF' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-print-invoked', 'true');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.paper-margin')).toBeHidden();
  await expect(page.locator('#comparisons')).toBeVisible();
});

test('keyboard shortcut, invalid query state, and unknown pages have useful outcomes', async ({ page }) => {
  await page.goto('/?area=unknown');
  await expect(visibleRows(page)).toHaveCount(21);
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
  const response = await page.goto('/projects/unknown/');
  expect(response.status()).toBe(404);
  await expect(page.getByRole('link', { name: /Return to the repository index/ })).toBeVisible();
});

test('all content and reference navigation remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${process.env.SITE_TEST_URL ?? 'http://127.0.0.1:4183'}/`);
  await expect(visibleRows(page)).toHaveCount(21);
  await expect(page.getByRole('searchbox')).toBeHidden();
  await page.getByRole('heading', { name: 'earl', exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('earl');
  await page.locator('.citation a').first().click();
  await expect(page.locator('#ref-1')).toBeInViewport();
  await context.close();
});

test('a failed full-text index preserves summary search and browsing', async ({ page }) => {
  await page.route('**/search-index.json', route => route.abort());
  await page.goto('/');
  await expect(page.getByText('Full-text search could not load.', { exact: false })).toBeVisible();
  await page.getByRole('searchbox').fill('earl');
  await expect(visibleRows(page)).toHaveCount(1);
  await expect(visibleRows(page)).toHaveAttribute('data-repository', 'earl');
});

test('copy citation uses the clipboard and explains a denied clipboard permission', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/projects/earl/');
  await page.getByRole('button', { name: 'Copy citation', exact: true }).click();
  await expect(page.getByText('Citation copied.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('https://mathematic.io/projects/earl/');
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }; });
  await page.getByRole('button', { name: 'Copy citation', exact: true }).click();
  await expect(page.getByText('Select the citation below to copy it.', { exact: true })).toBeAttached();
  await expect(page.locator('.cite-note')).toBeInViewport();
});

test('index and representative paper layouts pass automated accessibility checks', async ({ page }) => {
  for (const path of ['/', '/projects/earl/', '/projects/tauri-plugin-ui-inspector/', '/projects/bucket-cache-action/', '/projects/confset/']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, path).toEqual([]);
  }
});
