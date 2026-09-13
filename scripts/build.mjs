import { mkdir, rm, writeFile, cp } from 'node:fs/promises';
import { loadCatalog } from '../src/catalog.mjs';
import { renderIndex, renderProject, renderNotFound, searchData, origin, base, projectPath, escape } from '../src/render.mjs';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const catalog = await loadCatalog(root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL('public/', root), dist, { recursive: true });
await writeFile(new URL('index.html', dist), renderIndex(catalog));
await writeFile(new URL('404.html', dist), renderNotFound(catalog.reviewed));
await writeFile(new URL('search-index.json', dist), JSON.stringify(searchData(catalog.projects)));
await writeFile(new URL('catalog.json', dist), JSON.stringify(catalog, null, 2));
for (const project of catalog.projects) {
  const directory = new URL(`projects/${project.slug}/`, dist);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), renderProject(project, catalog));
  await writeFile(new URL('cite.bib', directory), `@misc{mathematic_${project.slug.replaceAll('-', '_')},\n  author = {{Mathematic Inc.}},\n  title = {${project.slug}: ${project.title}},\n  year = {${catalog.reviewed.slice(0, 4)}},\n  note = {Research note ${project.order}; reviewed ${catalog.reviewed}},\n  url = {${origin}${projectPath(project.slug)}}\n}\n`);
}
const urls = [base, ...catalog.projects.map(project => projectPath(project.slug))];
await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${escape(origin + path)}</loc><lastmod>${catalog.reviewed}</lastmod></url>`).join('')}</urlset>\n`);
await writeFile(new URL('.nojekyll', dist), '');
console.log(`Built ${catalog.projects.length + 2} HTML pages, ${catalog.projects.length} BibTeX citations, search index, catalog data, and sitemap into dist/.`);
