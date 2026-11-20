import { readdir, readFile } from "node:fs/promises";

/**
 * @typedef {Readonly<{ id: string, label: string, short: string, description: string }>} Category
 * @typedef {Readonly<{ label: string, url?: string, path?: string, tree?: boolean }>} Source
 * @typedef {Readonly<{ label: string, url: string, path?: string, tree?: boolean }>} LinkedSource
 * @typedef {Readonly<{ alternative: string, constraint: string, response: string, tradeoff: string }>} Comparison
 * @typedef {Readonly<{
 *   name: string,
 *   sha: string,
 *   language: string | null,
 *   description: string | null,
 *   license: string | null,
 * }>} Repository
 * @typedef {Readonly<{ reviewed: string, organization: string, repositories: readonly Repository[] }>} Snapshot
 * @typedef {Readonly<{
 *   slug: string,
 *   order: number,
 *   category: string,
 *   title: string,
 *   summary: string,
 *   kind: string,
 *   rationale: string,
 *   tags: readonly string[],
 *   abstract: string,
 *   problem: readonly string[],
 *   design: readonly string[],
 *   comparisons: readonly Comparison[],
 *   boundaries: readonly string[],
 *   related: readonly string[],
 *   sources: readonly Source[],
 * }>} ProjectRecord
 * @typedef {Readonly<Omit<ProjectRecord, "sources"> & {
 *   repository: Repository,
 *   categoryInfo: Category,
 *   sources: readonly LinkedSource[],
 * }>} Project
 * @typedef {Readonly<Snapshot & { projects: readonly Project[] }>} Catalog
 */

/** @type {readonly Category[]} */
export const categories = [
  {
    id: "agents",
    label: "Agents & interfaces",
    short: "Agents",
    description: "Control the operations an agent can perform and the context it can inspect.",
  },
  {
    id: "schemas",
    label: "Schemas & protocols",
    short: "Schemas",
    description: "Carry a contract through serialization, validation, and client generation.",
  },
  {
    id: "tools",
    label: "Developer tools",
    short: "Tools",
    description: "Make a small, recurring part of the editing and development workflow explicit.",
  },
  {
    id: "telemetry",
    label: "Telemetry",
    short: "Telemetry",
    description: "Preserve the meaning of events and errors across application boundaries.",
  },
  {
    id: "infrastructure",
    label: "Infrastructure & records",
    short: "Infrastructure",
    description:
      "The publication itself, repository infrastructure, and work at its earliest public stage.",
  },
];

/**
 * @param {unknown} value
 * @returns {value is Readonly<Record<string, unknown>>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is readonly string[]}
 */
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * @param {unknown} value
 * @returns {value is string | null}
 */
function isNullableString(value) {
  return value === null || typeof value === "string";
}

/**
 * @param {unknown} value
 * @returns {value is Source}
 */
function isSource(value) {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    (value.url === undefined || typeof value.url === "string") &&
    (value.path === undefined || typeof value.path === "string") &&
    (value.tree === undefined || typeof value.tree === "boolean")
  );
}

/**
 * @param {unknown} value
 * @returns {value is Comparison}
 */
function isComparison(value) {
  return (
    isRecord(value) &&
    typeof value.alternative === "string" &&
    typeof value.constraint === "string" &&
    typeof value.response === "string" &&
    typeof value.tradeoff === "string"
  );
}

/**
 * @param {unknown} value
 * @returns {value is Repository}
 */
function isRepository(value) {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.sha === "string" &&
    isNullableString(value.language) &&
    isNullableString(value.description) &&
    isNullableString(value.license)
  );
}

/**
 * @param {unknown} value
 * @returns {value is Snapshot}
 */
export function isSnapshot(value) {
  return (
    isRecord(value) &&
    typeof value.reviewed === "string" &&
    typeof value.organization === "string" &&
    Array.isArray(value.repositories) &&
    value.repositories.every(isRepository)
  );
}

/**
 * @param {unknown} value
 * @returns {value is ProjectRecord}
 */
export function isProjectRecord(value) {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.order === "number" &&
    typeof value.category === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.kind === "string" &&
    typeof value.rationale === "string" &&
    typeof value.abstract === "string" &&
    isStringArray(value.tags) &&
    isStringArray(value.problem) &&
    isStringArray(value.design) &&
    isStringArray(value.boundaries) &&
    isStringArray(value.related) &&
    Array.isArray(value.comparisons) &&
    value.comparisons.every(isComparison) &&
    Array.isArray(value.sources) &&
    value.sources.every(isSource)
  );
}

/**
 * @template T
 * @param {URL} url
 * @param {(value: unknown) => value is T} isExpected
 * @returns {Promise<T>}
 */
export async function readJson(url, isExpected) {
  /** @type {unknown} */
  const value = JSON.parse(await readFile(url, "utf8"));
  if (!isExpected(value)) {
    throw new TypeError(`${url.pathname} does not have the expected structure.`);
  }
  return value;
}

/**
 * @param {URL} root
 * @returns {Promise<Catalog>}
 */
export async function loadCatalog(root) {
  const snapshot = await readJson(new URL("content/repositories.json", root), isSnapshot);
  const directory = new URL("content/projects/", root);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).toSorted();
  const projects = await Promise.all(
    files.map((file) => readJson(new URL(file, directory), isProjectRecord)),
  );
  validateCatalog(projects, snapshot);
  return {
    ...snapshot,
    projects: projects
      .toSorted((a, b) => a.order - b.order)
      .map((project) => {
        const repository = snapshot.repositories.find((repo) => repo.name === project.slug);
        const categoryInfo = categories.find((category) => category.id === project.category);
        if (repository === undefined || categoryInfo === undefined) {
          throw new Error(`${project.slug}: missing repository or category.`);
        }
        return {
          ...project,
          repository,
          categoryInfo,
          sources: project.sources.map((source) => ({
            ...source,
            url:
              source.url ??
              `https://github.com/${snapshot.organization}/${project.slug}/${source.tree === true ? "tree" : "blob"}/${repository.sha}${source.path === undefined || source.path === "" ? "" : `/${source.path}`}`,
          })),
        };
      }),
  };
}

/**
 * @param {readonly ProjectRecord[]} projects
 * @param {Snapshot} snapshot
 */
export function validateCatalog(projects, snapshot) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/v.test(snapshot.reviewed) ||
    snapshot.organization !== "mathematic-inc"
  ) {
    throw new Error("The catalog requires a reviewed date and the mathematic-inc organization.");
  }
  const names = snapshot.repositories.map((repo) => repo.name);
  if (new Set(names).size !== names.length) {
    throw new Error("Duplicate repository in inventory.");
  }
  /** @type {Set<string>} */
  const slugs = new Set();
  /** @type {Set<number>} */
  const orders = new Set();
  for (const project of projects) {
    /** @type {(message: string) => never} */
    const fail = (message) => {
      throw new Error(`${project.slug === "" ? "Unknown project" : project.slug}: ${message}`);
    };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/v.test(project.slug)) {
      fail("Invalid slug.");
    }
    if (slugs.has(project.slug) || orders.has(project.order)) {
      fail("Duplicate slug or note number.");
    }
    slugs.add(project.slug);
    orders.add(project.order);
    if (!Number.isInteger(project.order) || project.order < 1) {
      fail("Invalid note number.");
    }
    if (!categories.some((category) => category.id === project.category)) {
      fail("Unknown category.");
    }
    const repository = snapshot.repositories.find((repo) => repo.name === project.slug);
    if (repository === undefined) {
      fail("Project missing from the repository inventory.");
    }
    for (const key of /** @type {const} */ ([
      "title",
      "summary",
      "abstract",
      "rationale",
      "kind",
    ])) {
      if (project[key].trim() === "") {
        fail(`Missing ${key}.`);
      }
    }
    if (!["Implementation note", "Repository record"].includes(project.kind)) {
      fail("Unknown record kind.");
    }
    for (const key of /** @type {const} */ ([
      "problem",
      "design",
      "boundaries",
      "tags",
      "related",
      "sources",
      "comparisons",
    ])) {
      if (project[key].length === 0) {
        fail(`Empty ${key}.`);
      }
    }
    for (const key of /** @type {const} */ (["problem", "design", "boundaries", "tags"])) {
      if (project[key].some((value) => value.trim() === "")) {
        fail(`Invalid ${key}.`);
      }
    }
    for (const comparison of project.comparisons) {
      for (const key of /** @type {const} */ ([
        "alternative",
        "constraint",
        "response",
        "tradeoff",
      ])) {
        if (comparison[key].trim() === "") {
          fail(`Incomplete comparison ${key}.`);
        }
      }
    }
    for (const { label, url = "", path = "", tree = false } of project.sources) {
      if (label === "" || [url !== "", path !== "", tree].filter(Boolean).length !== 1) {
        fail("A source must have one URL, path, or tree.");
      }
      if (url !== "" && new URL(url).protocol !== "https:") {
        fail("Source URLs must use HTTPS.");
      }
      if (path !== "" && (path.includes("..") || path.startsWith("/"))) {
        fail("Invalid source path.");
      }
    }
    const body = JSON.stringify([
      project.abstract,
      project.problem,
      project.design,
      project.comparisons,
      project.boundaries,
    ]);
    const citations = [...body.matchAll(/\[(\d+)\]/gv)].map((match) => Number(match[1]));
    if (citations.some((number) => number < 1 || number > project.sources.length)) {
      fail("Citation references a missing source.");
    }
    for (let number = 1; number <= project.sources.length; number += 1) {
      if (!citations.includes(number)) {
        fail(`Source ${number} is never cited.`);
      }
    }
    if (
      !/^[a-f0-9]{40}$/v.test(repository.sha) &&
      !(project.slug === "site" && repository.sha === "main")
    ) {
      fail("Source revision must be a full commit SHA.");
    }
  }
  if (projects.length !== names.length || names.some((name) => !slugs.has(name))) {
    throw new Error("Catalog does not cover the complete repository inventory.");
  }
  for (const project of projects) {
    if (
      new Set(project.related).size !== project.related.length ||
      project.related.some((slug) => slug === project.slug || !slugs.has(slug))
    ) {
      throw new Error(`${project.slug}: invalid related-project link.`);
    }
  }
}

/** @param {Project} project */
export function textForSearch(project) {
  return [
    project.slug,
    project.title,
    project.summary,
    project.categoryInfo.label,
    ...project.tags,
    project.abstract,
    ...project.problem,
    ...project.design,
    ...project.boundaries,
    ...project.comparisons.flatMap((comparison) => Object.values(comparison)),
  ]
    .join(" ")
    .toLowerCase();
}
