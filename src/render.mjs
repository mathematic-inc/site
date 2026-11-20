import { categories, textForSearch } from "./catalog.mjs";

export const base = "/";
export const origin = "https://mathematic.io";
export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
export const projectPath = (slug) => `${base}projects/${slug}/`;
export const number = (value) => String(value).padStart(2, "0");
export const dateLabel = (date) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

function prose(value, project) {
  return escape(value).replace(
    /\[(\d+)\]/g,
    (_, index) =>
      `<sup class="citation"><a href="#ref-${index}" aria-label="Reference ${index}: ${escape(project.sources[Number(index) - 1].label)}">[${index}]</a></sup>`,
  );
}

function paragraphs(values, project) {
  return values.map((value) => `<p>${prose(value, project)}</p>`).join("\n");
}

function shell({ title, description, path, body, reviewed, article = false }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f8f7f3">
  <meta name="description" content="${escape(description)}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${escape(title)} · Mathematic Inc.</title>
  <link rel="canonical" href="${origin}${path}">
  <meta property="og:type" content="${article ? "article" : "website"}">
  <meta property="og:title" content="${escape(title)} · Mathematic Inc.">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${origin}${path}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:,">
  <link rel="preload" href="${base}fonts/stix-regular.ttf" as="font" type="font/ttf" crossorigin>
  <link rel="stylesheet" href="${base}site.css">
  <script type="module" src="${base}site.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="masthead wrapper">
    <a class="brand" href="${base}" aria-label="Mathematic Inc. home">Mathematic <span>Inc.</span></a>
    <nav aria-label="Main navigation">
      <a href="${base}#catalog" ${!article && path === base ? 'aria-current="page"' : ""}>Repository index</a>
      <a href="${base}#approach">Our approach</a>
      <a href="https://github.com/mathematic-inc">GitHub <span aria-hidden="true">↗</span></a>
    </nav>
  </header>
  ${body}
  <footer class="footer wrapper">
    <div><a class="footer-name" href="${base}">Mathematic Inc.</a><p>Mathematically motivated. Socially driven.</p></div>
    <div><p>Engineering notes · ${dateLabel(reviewed)}</p><a href="https://github.com/mathematic-inc/site">Publication source <span aria-hidden="true">↗</span></a><span class="footer-separator">/</span><a href="${base}catalog.json">Catalog data</a></div>
  </footer>
</body>
</html>`;
}

function row(project) {
  return `<article class="repository-row" data-repository="${project.slug}" data-category="${project.category}">
    <span class="row-number" aria-hidden="true">${number(project.order)}</span>
    <div class="row-content"><div class="row-heading"><h3><a href="${projectPath(project.slug)}">${escape(project.slug)}</a></h3>${project.kind === "Repository record" ? '<span class="record-label">Record</span>' : ""}</div><p>${escape(project.summary)}</p><span class="row-topic">${escape(project.categoryInfo.label)}</span></div>
    <div class="row-meta"><span>${escape(project.tags[0])}</span><a class="read-link" href="${projectPath(project.slug)}" aria-label="Read the ${escape(project.slug)} ${project.kind.toLowerCase()}">Read note <span aria-hidden="true">↗</span></a></div>
  </article>`;
}

export function renderIndex(catalog) {
  const { projects, reviewed } = catalog;
  const notes = projects.filter((project) => project.kind === "Implementation note").length;
  const body = `<main id="main" class="wrapper">
    <section class="cover" aria-labelledby="cover-title">
      <div class="edition-line"><span>Open-source software / Research notes</span><span>Vol. 01 · September 2026</span></div>
      <div class="cover-grid">
        <div class="cover-main"><h1 id="cover-title">Tools, and the reasons<br class="desktop-break"> we built them.</h1><p class="cover-subtitle">An annotated catalog of software by Mathematic Inc.</p>
          <div class="abstract"><span class="section-label">Abstract</span><p>Useful software starts with a specific problem. We publish tools for working with agents, carrying schemas through a system, and making development less error-prone. These notes explain the decisions behind each repository: the constraint we encountered, the mechanism we chose, and the tradeoffs that remain.</p></div>
          <a class="text-link cover-link" href="#catalog">Explore the repository index <span aria-hidden="true">↓</span></a>
        </div>
        <aside class="volume-contents" aria-label="In this volume"><span class="section-label">In this volume</span>
          <nav aria-label="Research areas">${categories.map((category, index) => `<a href="${base}?area=${category.id}#catalog"><span class="contents-number">${number(index + 1)}</span><span>${escape(category.label)}</span><span class="contents-count">${projects.filter((project) => project.category === category.id).length}</span></a>`).join("")}</nav>
          <div class="volume-total"><span>${number(projects.length)}</span><p>public repositories<br>${notes} notes · ${projects.length - notes} records</p></div>
          <p class="volume-date">Reviewed<br><time datetime="${reviewed}">${dateLabel(reviewed)}</time></p>
        </aside>
      </div>
      <div class="reading-line"><span class="section-label">A note on the format</span><p>Problem → mechanism → comparison → tradeoff.<br> Every argument comes with its sources.</p><span class="figure-number">Fig. 1</span></div>
    </section>
    <section id="catalog" class="catalog-section" aria-labelledby="catalog-title">
      <div class="section-heading"><div><span class="section-label">01 / The work</span><h2 id="catalog-title">Repository index</h2></div><span class="section-note">${number(projects.length)} entries / five areas</span></div>
      <p class="catalog-intro">Browse a subject, or search for a tool, a problem, or an alternative.</p>
      <div class="catalog-controls" hidden data-enhancement>
        <form class="search-form" role="search" aria-label="Search the repository catalog"><label for="repository-search">Search the catalog</label><div class="search-field"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg><input id="repository-search" type="search" name="q" autocomplete="off" placeholder="Search repositories, problems, alternatives…"><kbd aria-hidden="true">/</kbd></div></form>
        <div class="filter-bar" role="group" aria-label="Filter by research area"><button type="button" data-filter="all" aria-pressed="true">All <span>${projects.length}</span></button>${categories.map((category) => `<button type="button" data-filter="${category.id}" aria-pressed="false">${category.short} <span>${projects.filter((project) => project.category === category.id).length}</span></button>`).join("")}</div>
      </div>
      <div class="index-table-head"><span>Repository / research question</span><span id="result-count" role="status" aria-live="polite">${projects.length} repositories</span></div>
      <div id="repository-list">${projects.map(row).join("\n")}</div>
      <div class="empty-state" id="empty-state" hidden><span class="section-label">No matching entries</span><h3>Try a different line of inquiry.</h3><p>Search by repository name, technology, or a problem the tool addresses.</p><button type="button" class="text-button" id="reset-search">Clear search and filters <span aria-hidden="true">↗</span></button></div>
      <p class="catalog-footnote"><span>†</span> Records include this publication and the no-operation repository. Their notes state the available evidence.</p>
      <noscript><p class="notice">All repositories are listed above. Search and area filters become available when JavaScript is enabled.</p></noscript>
    </section>
    <section id="approach" class="approach" aria-labelledby="approach-title">
      <div class="section-heading"><div><span class="section-label">02 / Method</span><h2 id="approach-title">An argument you can inspect.</h2></div></div>
      <div class="approach-grid"><div class="approach-lead"><p>We start with the part of a system that makes an ordinary task harder than it needs to be. Then we ask how much software that problem actually requires.</p><a class="text-link" href="https://github.com/mathematic-inc">Explore the source <span aria-hidden="true">↗</span></a></div><div class="method-notes">
      <section><h3><span>01.</span> Name the constraint.</h3><p>Each note describes a concrete workflow and what makes it difficult. A documented origin is labelled as such; an engineering interpretation is labelled separately.</p></section>
      <section><h3><span>02.</span> Compare the mechanism.</h3><p>Alternatives are evaluated for a particular requirement. We state what they already do, where our design differs, and when the other approach is the better fit.</p></section>
      <section><h3><span>03.</span> Keep the evidence attached.</h3><p>Repository sources point to reviewed commits. Upstream documentation supports comparisons. Reported benchmarks retain their context; an unmeasured advantage stays unclaimed.</p></section>
      </div></div>
      <p class="edition-note">This is a reviewed edition of the public repository catalog. These are engineering notes, not peer-reviewed papers. <a href="${projectPath("site")}">Read about this publication.</a></p>
    </section>
  </main>`;
  return shell({
    title: "Tools, and the reasons we built them",
    description:
      "A complete, annotated catalog of Mathematic Inc. open-source software: the problems, implementation choices, alternatives, and evidence.",
    path: base,
    body,
    reviewed,
  });
}

export function citationText(project, reviewed) {
  return `Mathematic Inc. (${reviewed}). ${project.slug}: ${project.title}. Mathematic research notes, ${number(project.order)}. ${origin}${projectPath(project.slug)}`;
}

export function renderProject(project, catalog) {
  const { reviewed } = catalog;
  const readingMinutes = Math.max(
    1,
    Math.ceil(
      JSON.stringify([
        project.abstract,
        project.problem,
        project.design,
        project.comparisons,
        project.boundaries,
      ]).split(/\s+/).length / 220,
    ),
  );
  const body = `<main id="main" class="wrapper paper">
    <div class="paper-topline"><a href="${base}#catalog">← Repository index</a><span>Research note ${number(project.order)} / ${number(catalog.projects.length)}</span></div>
    <header class="paper-header"><div class="paper-eyebrow"><span>${escape(project.categoryInfo.label)}</span><span>${escape(project.kind)}</span></div><h1>${escape(project.slug)}</h1><p class="paper-title">${escape(project.title)}</p><div class="paper-byline"><span>Mathematic Inc.</span><span>${dateLabel(reviewed)}</span><span>${readingMinutes} min read</span></div></header>
    <div class="paper-layout">
      <aside class="paper-margin"><nav aria-label="On this page"><span class="section-label">Contents</span><a href="#abstract">Abstract</a><a href="#problem"><span>1.</span> The problem</a><a href="#design"><span>2.</span> The design</a><a href="#comparisons"><span>3.</span> Alternatives</a><a href="#boundaries"><span>4.</span> Boundaries</a><a href="#references"><span>5.</span> References</a></nav><div class="margin-meta"><span class="section-label">Basis</span><p>${escape(project.rationale)}</p><span class="section-label">Source revision</span><a href="https://github.com/mathematic-inc/${project.slug}/tree/${project.repository.sha}"><code>${project.repository.sha === "main" ? "Living edition" : project.repository.sha.slice(0, 8)}</code> ↗</a><span class="section-label">Technology</span><p>${project.tags.map(escape).join("<br>")}</p></div></aside>
      <article class="paper-body" aria-label="${escape(project.slug)} research note">
        <section id="abstract" class="paper-abstract"><h2>Abstract</h2><p>${prose(project.abstract, project)}</p></section>
        <div class="paper-actions"><a href="https://github.com/mathematic-inc/${project.slug}">Source repository <span aria-hidden="true">↗</span></a><button type="button" data-print data-enhancement hidden>Print / save PDF</button><button type="button" data-copy-citation="${escape(citationText(project, reviewed))}" data-enhancement hidden>Copy citation</button><span class="copy-status" role="status" aria-live="polite"></span></div>
        <section id="problem"><h2><span class="section-index">1.</span> The problem</h2>${paragraphs(project.problem, project)}</section>
        <section id="design"><h2><span class="section-index">2.</span> The design</h2>${paragraphs(project.design, project)}</section>
        <section id="comparisons"><h2><span class="section-index">3.</span> Alternatives</h2><p class="comparison-intro">The relevant distinction is the requirement each approach serves.</p>${project.comparisons.map((comparison, index) => `<section class="comparison"><h3><span>3.${index + 1}</span> ${escape(comparison.alternative)}</h3><dl><div><dt>The constraint</dt><dd>${prose(comparison.constraint, project)}</dd></div><div><dt>Our approach</dt><dd>${prose(comparison.response, project)}</dd></div><div><dt>The tradeoff</dt><dd>${prose(comparison.tradeoff, project)}</dd></div></dl></section>`).join("")}</section>
        <section id="boundaries"><h2><span class="section-index">4.</span> Boundaries & adoption</h2>${paragraphs(project.boundaries, project)}</section>
        <section id="references" class="references"><h2><span class="section-index">5.</span> References</h2><p class="references-note">Sources reviewed ${dateLabel(reviewed)}. Mathematic source links retain the reviewed revision${project.slug === "site" ? "; this publication links to its current source" : ""}.</p><ol>${project.sources.map((source, index) => `<li id="ref-${index + 1}" tabindex="-1"><span class="reference-number">[${index + 1}]</span><div><a href="${escape(source.url)}">${escape(source.label)} <span aria-hidden="true">↗</span></a><span class="reference-origin">${source.path || source.tree ? `Mathematic Inc. · ${project.repository.sha === "main" ? "living edition" : project.repository.sha.slice(0, 8)}` : escape(new URL(source.url).hostname)}</span></div></li>`).join("")}</ol></section>
        <aside class="cite-note" aria-label="Citation"><span class="section-label">Cite this note</span><p>${escape(citationText(project, reviewed))}</p><a href="${projectPath(project.slug)}cite.bib" download>Download BibTeX <span aria-hidden="true">↓</span></a></aside>
        <nav class="related-notes" aria-label="Related research notes"><span class="section-label">Continue reading</span>${project.related
          .map((slug) => {
            const related = catalog.projects.find((item) => item.slug === slug);
            return `<a href="${projectPath(slug)}"><span><strong>${escape(slug)}</strong><small>${escape(related.title)}</small></span><span aria-hidden="true">↗</span></a>`;
          })
          .join("")}</nav>
      </article>
    </div>
  </main>`;
  return shell({
    title: `${project.slug}: ${project.title}`,
    description: project.summary,
    path: projectPath(project.slug),
    body,
    reviewed,
    article: true,
  });
}

export function renderNotFound(reviewed) {
  return shell({
    title: "Page not found",
    description: "Return to the Mathematic repository index.",
    path: `${base}404.html`,
    reviewed,
    body: `<main id="main" class="wrapper not-found"><span class="section-label">404 / Page not found</span><h1>This page is outside<br>the current edition.</h1><p>The note may have moved, or the address may be incomplete.</p><a class="text-link" href="${base}#catalog">Return to the repository index <span aria-hidden="true">↗</span></a></main>`,
  });
}

export function searchData(projects) {
  return projects.map((project) => ({
    slug: project.slug,
    category: project.category,
    text: textForSearch(project),
  }));
}
