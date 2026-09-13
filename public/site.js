import { matchesQuery } from './catalog-search.mjs';

for (const element of document.querySelectorAll('[data-enhancement]')) element.hidden = false;

const searchInput = document.querySelector('#repository-search');
if (searchInput) {
  const rows = [...document.querySelectorAll('[data-repository]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-state');
  const reset = document.querySelector('#reset-search');
  let area = 'all';
  let searchIndex = new Map(rows.map(row => [row.dataset.repository, row.textContent]));

  function render() {
    let visible = 0;
    for (const row of rows) {
      row.hidden = !((area === 'all' || row.dataset.category === area) && matchesQuery(searchIndex.get(row.dataset.repository) ?? '', searchInput.value));
      if (!row.hidden) visible += 1;
    }
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.filter === area));
    count.textContent = `${visible} ${visible === 1 ? 'repository' : 'repositories'}${visible !== rows.length ? ` / ${rows.length}` : ''}`;
    empty.hidden = visible !== 0;
  }

  function readState() {
    const params = new URLSearchParams(location.search);
    searchInput.value = params.get('q') ?? '';
    const requestedArea = params.get('area');
    area = filters.some(filter => filter.dataset.filter === requestedArea) ? requestedArea : 'all';
    render();
  }

  function writeState(push = false) {
    const url = new URL(location.href);
    if (searchInput.value.trim()) url.searchParams.set('q', searchInput.value.trim());
    else url.searchParams.delete('q');
    if (area === 'all') url.searchParams.delete('area');
    else url.searchParams.set('area', area);
    if (url.href !== location.href) history[push ? 'pushState' : 'replaceState']({}, '', url);
    render();
  }

  searchInput.addEventListener('input', () => writeState());
  document.querySelector('.search-form').addEventListener('submit', event => { event.preventDefault(); writeState(); });
  for (const filter of filters) filter.addEventListener('click', () => { area = filter.dataset.filter; writeState(true); });
  reset.addEventListener('click', () => { area = 'all'; searchInput.value = ''; writeState(true); searchInput.focus(); });
  addEventListener('popstate', readState);
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.closest('input, textarea, select, [contenteditable="true"]')) {
      event.preventDefault();
      searchInput.focus();
    }
  });
  readState();
  try {
    const response = await fetch(new URL('./search-index.json', import.meta.url));
    if (!response.ok) throw new Error(`Search index returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== rows.length || data.some(item => typeof item.slug !== 'string' || typeof item.text !== 'string')) throw new Error('Search index is incomplete.');
    searchIndex = new Map(data.map(item => [item.slug, item.text]));
    render();
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'notice';
    message.textContent = 'Full-text search could not load. You can still search repository names and summaries, or browse all notes below.';
    document.querySelector('.catalog-controls').append(message);
    console.warn('Catalog search is using the visible repository summaries.', error);
  }
}

for (const button of document.querySelectorAll('[data-print]')) button.addEventListener('click', () => window.print());
for (const button of document.querySelectorAll('[data-copy-citation]')) {
  button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copyCitation);
      status.textContent = 'Citation copied.';
    } catch {
      status.textContent = 'Select the citation below to copy it.';
      document.querySelector('.cite-note').scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  });
}
