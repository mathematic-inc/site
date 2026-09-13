import { readdir, readFile } from 'node:fs/promises';

export const categories = [
  { id: 'agents', label: 'Agents & interfaces', short: 'Agents', description: 'Control the operations an agent can perform and the context it can inspect.' },
  { id: 'schemas', label: 'Schemas & protocols', short: 'Schemas', description: 'Carry a contract through serialization, validation, and client generation.' },
  { id: 'tools', label: 'Developer tools', short: 'Tools', description: 'Make a small, recurring part of the editing and development workflow explicit.' },
  { id: 'telemetry', label: 'Telemetry', short: 'Telemetry', description: 'Preserve the meaning of events and errors across application boundaries.' },
  { id: 'infrastructure', label: 'Infrastructure & records', short: 'Infrastructure', description: 'The publication itself, repository infrastructure, and work at its earliest public stage.' },
];

export async function loadCatalog(root) {
  const snapshot = JSON.parse(await readFile(new URL('content/repositories.json', root), 'utf8'));
  const directory = new URL('content/projects/', root);
  const files = (await readdir(directory)).filter(file => file.endsWith('.json')).sort();
  const projects = await Promise.all(files.map(async file => JSON.parse(await readFile(new URL(file, directory), 'utf8'))));
  validateCatalog(projects, snapshot);
  return {
    ...snapshot,
    projects: projects.sort((a, b) => a.order - b.order).map(project => {
      const repository = snapshot.repositories.find(repo => repo.name === project.slug);
      return {
        ...project,
        repository,
        categoryInfo: categories.find(category => category.id === project.category),
        sources: project.sources.map(source => ({
          ...source,
          url: source.url ?? `https://github.com/${snapshot.organization}/${project.slug}/${source.tree ? 'tree' : 'blob'}/${repository.sha}${source.path ? `/${source.path}` : ''}`,
        })),
      };
    }),
  };
}

export function validateCatalog(projects, snapshot) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.reviewed) || snapshot.organization !== 'mathematic-inc') {
    throw new Error('The catalog requires a reviewed date and the mathematic-inc organization.');
  }
  const names = snapshot.repositories.map(repo => repo.name);
  if (new Set(names).size !== names.length) throw new Error('Duplicate repository in inventory.');
  const slugs = new Set();
  const orders = new Set();
  for (const project of projects) {
    const fail = message => { throw new Error(`${project.slug || 'Unknown project'}: ${message}`); };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) fail('Invalid slug.');
    if (slugs.has(project.slug) || orders.has(project.order)) fail('Duplicate slug or note number.');
    slugs.add(project.slug);
    orders.add(project.order);
    if (!Number.isInteger(project.order) || project.order < 1) fail('Invalid note number.');
    if (!categories.some(category => category.id === project.category)) fail('Unknown category.');
    if (!names.includes(project.slug)) fail('Project missing from the repository inventory.');
    for (const key of ['title', 'summary', 'abstract', 'rationale', 'kind']) {
      if (typeof project[key] !== 'string' || !project[key].trim()) fail(`Missing ${key}.`);
    }
    if (!['Implementation note', 'Repository record'].includes(project.kind)) fail('Unknown record kind.');
    for (const key of ['problem', 'design', 'boundaries', 'tags', 'related', 'sources', 'comparisons']) {
      if (!Array.isArray(project[key]) || !project[key].length) fail(`Empty ${key}.`);
    }
    for (const key of ['problem', 'design', 'boundaries', 'tags']) {
      if (project[key].some(value => typeof value !== 'string' || !value.trim())) fail(`Invalid ${key}.`);
    }
    for (const comparison of project.comparisons) {
      for (const key of ['alternative', 'constraint', 'response', 'tradeoff']) {
        if (typeof comparison[key] !== 'string' || !comparison[key].trim()) fail(`Incomplete comparison ${key}.`);
      }
    }
    for (const source of project.sources) {
      if (!source.label || [Boolean(source.url), Boolean(source.path), Boolean(source.tree)].filter(Boolean).length !== 1) fail('A source must have one URL, path, or tree.');
      if (source.url && new URL(source.url).protocol !== 'https:') fail('Source URLs must use HTTPS.');
      if (source.path && (source.path.includes('..') || source.path.startsWith('/'))) fail('Invalid source path.');
    }
    const body = JSON.stringify([project.abstract, project.problem, project.design, project.comparisons, project.boundaries]);
    const citations = [...body.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
    if (citations.some(number => number < 1 || number > project.sources.length)) fail('Citation references a missing source.');
    for (let number = 1; number <= project.sources.length; number += 1) {
      if (!citations.includes(number)) fail(`Source ${number} is never cited.`);
    }
    const repository = snapshot.repositories.find(repo => repo.name === project.slug);
    if (!/^[a-f0-9]{40}$/.test(repository.sha) && !(project.slug === 'site' && repository.sha === 'main')) fail('Source revision must be a full commit SHA.');
  }
  if (projects.length !== names.length || names.some(name => !slugs.has(name))) throw new Error('Catalog does not cover the complete repository inventory.');
  for (const project of projects) {
    if (new Set(project.related).size !== project.related.length || project.related.some(slug => slug === project.slug || !slugs.has(slug))) throw new Error(`${project.slug}: invalid related-project link.`);
  }
}

export function textForSearch(project) {
  return [project.slug, project.title, project.summary, project.categoryInfo.label, ...project.tags, project.abstract, ...project.problem, ...project.design, ...project.boundaries, ...project.comparisons.flatMap(comparison => Object.values(comparison))].join(' ').toLowerCase();
}
