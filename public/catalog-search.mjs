export function matchesQuery(text, query) {
  const terms = query.toLocaleLowerCase("en").trim().split(/\s+/u).filter(Boolean);
  const normalized = text.toLocaleLowerCase("en");
  return terms.every((term) => normalized.includes(term));
}
