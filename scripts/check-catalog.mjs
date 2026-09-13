import { loadCatalog } from '../src/catalog.mjs';

const catalog = await loadCatalog(new URL('../', import.meta.url));
const current = [];
for (let page = 1; ; page += 1) {
  const response = await fetch(`https://api.github.com/orgs/mathematic-inc/repos?type=public&per_page=100&page=${page}`, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not read the public inventory: HTTP ${response.status}`);
  const repos = await response.json();
  if (!Array.isArray(repos)) throw new Error('GitHub returned an invalid inventory.');
  current.push(...repos.map(repo => repo.name));
  if (repos.length < 100) break;
}
const recorded = catalog.projects.map(project => project.slug);
const missing = current.filter(name => !recorded.includes(name));
const removed = recorded.filter(name => !current.includes(name));
if (missing.length || removed.length) {
  if (missing.length) console.error(`New public repositories need authored notes: ${missing.join(', ')}`);
  if (removed.length) console.error(`Recorded repositories absent from the public inventory: ${removed.join(', ')}`);
  process.exitCode = 1;
} else console.log(`Catalog covers all ${current.length} public repositories in mathematic-inc.`);
