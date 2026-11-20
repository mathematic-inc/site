import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { matchesQuery } from "../public/catalog-search.mjs";
import { loadCatalog, validateCatalog } from "../src/catalog.mjs";
import { renderProject, searchData, base, origin, projectPath } from "../src/render.mjs";

const root = new URL("../", import.meta.url);
const catalog = await loadCatalog(root);
const snapshot = JSON.parse(await readFile(new URL("content/repositories.json", root), "utf8"));
const rawProjects = await Promise.all(
  catalog.projects.map((project) =>
    readFile(new URL(`content/projects/${project.slug}.json`, root), "utf8").then(JSON.parse),
  ),
);

test("every recorded repository has an authored note with a pinned source revision", () => {
  assert.equal(catalog.projects.length, 21);
  assert.deepEqual(
    catalog.projects.map((project) => project.slug).sort(),
    snapshot.repositories.map((repo) => repo.name).sort(),
  );
  assert.equal(
    catalog.projects.filter((project) => project.kind === "Implementation note").length,
    19,
  );
  for (const project of catalog.projects.filter((project) => project.slug !== "site")) {
    assert.match(project.repository.sha, /^[a-f0-9]{40}$/);
    assert.ok(project.sources.some((source) => source.url.includes(project.repository.sha)));
  }
});

test("missing repositories and dangling citations stop publication", () => {
  assert.throws(
    () => validateCatalog(rawProjects.slice(1), snapshot),
    /complete repository inventory/,
  );
  const projects = structuredClone(rawProjects);
  projects[0].abstract += " Unsupported claim. [99]";
  assert.throws(() => validateCatalog(projects, snapshot), /missing source/);
});

test("duplicate identifiers, incomplete comparisons, and invalid related notes stop publication", () => {
  const duplicate = structuredClone(rawProjects);
  duplicate[1].order = duplicate[0].order;
  assert.throws(() => validateCatalog(duplicate, snapshot), /Duplicate/);
  const incomplete = structuredClone(rawProjects);
  incomplete[0].comparisons[0].tradeoff = "";
  assert.throws(() => validateCatalog(incomplete, snapshot), /Incomplete comparison/);
  const unrelated = structuredClone(rawProjects);
  unrelated[0].related.push("absent");
  assert.throws(() => validateCatalog(unrelated, snapshot), /related-project/);
});

test("search uses full note content, literal case-insensitive terms, and AND matching", () => {
  const data = searchData(catalog.projects);
  assert.ok(
    data.filter((item) => matchesQuery(item.text, "CURL")).some((item) => item.slug === "earl"),
  );
  assert.deepEqual(
    data.filter((item) => matchesQuery(item.text, "unsalted sha-256")).map((item) => item.slug),
    ["alyt"],
  );
  assert.equal(matchesQuery("a sample", "   "), true);
  assert.equal(matchesQuery("a sample", "[.*]"), false);
  assert.equal(matchesQuery("one only", "one two"), false);
});

test("rendering escapes text and produces ordinary local reference links", () => {
  const project = structuredClone(catalog.projects[0]);
  project.title = '<script>alert("x")</script> & text';
  const html = renderProject(project, catalog);
  assert.ok(!html.includes("<script>alert("));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; text"));
  assert.ok(html.includes('href="#ref-1"'));
  assert.ok(html.includes('id="ref-1"'));
});

test("every generated internal asset, page, and fragment link resolves under the custom domain root", async () => {
  const paths = [
    base,
    ...catalog.projects.map((project) => projectPath(project.slug)),
    `${base}404.html`,
  ];
  let checked = 0;
  for (const path of paths) {
    const source = new URL(
      `dist/${path.slice(base.length)}${path.endsWith("/") ? "index.html" : ""}`,
      root,
    );
    const html = await readFile(source, "utf8");
    assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, path);
    assert.ok(html.includes('<html lang="en">'));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicate HTML id on ${path}`);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(match[1].replaceAll("&amp;", "&"), origin + path);
      if (url.origin !== origin) continue;
      assert.ok(url.pathname.startsWith(base), `Unprefixed project-site link: ${url}`);
      const local = new URL(
        `dist/${url.pathname.slice(base.length)}${url.pathname.endsWith("/") ? "index.html" : ""}`,
        root,
      );
      assert.ok((await stat(local)).isFile(), String(local));
      if (url.hash) {
        const target = await readFile(local, "utf8");
        assert.ok(
          target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),
          `Missing fragment: ${url}`,
        );
      }
      checked += 1;
    }
  }
  console.log(`Verified ${checked} generated internal links across ${paths.length} pages.`);
});

test("all citations and machine-readable exports contain the intended public URLs", async () => {
  for (const project of catalog.projects) {
    const bib = await readFile(new URL(`dist/projects/${project.slug}/cite.bib`, root), "utf8");
    assert.ok(bib.includes(origin + projectPath(project.slug)));
    assert.ok(bib.includes(project.title));
  }
  const sitemap = await readFile(new URL("dist/sitemap.xml", root), "utf8");
  assert.equal([...sitemap.matchAll(/<url>/g)].length, 22);
  const exported = JSON.parse(await readFile(new URL("dist/catalog.json", root), "utf8"));
  assert.equal(exported.projects.length, catalog.projects.length);
});
