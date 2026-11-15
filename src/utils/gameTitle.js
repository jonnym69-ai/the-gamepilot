/**
 * displayGameTitle — reader-facing form of a stored game name.
 *
 * Library/ROM scans keep sort-name conventions such as "Witcher 3, The" or
 * "Matrix, The Path of Neo" (No-Intro: the leading article moved behind a
 * comma, the rest is the subtitle). Prose should read "The Witcher 3" and
 * "The Matrix: Path of Neo". Display-only — matching, storage and lookups
 * keep the raw name.
 */
const SORT_ARTICLE = /^(.*?),\s+(the|a|an)\b(.*)$/i;
const LEADING_SEPARATORS = /^[\s:;,.–—-]+/;

export const displayGameTitle = (name) => {
  const text = String(name || '').trim();
  const match = text.match(SORT_ARTICLE);
  if (!match) return text;

  const base = match[1].trim();
  const article = match[2].toLowerCase();
  const rest = match[3].replace(LEADING_SEPARATORS, '').trim();
  if (!base) return text;

  // "The Lord of the Rings, The Two Towers" already leads with the article —
  // the comma is a subtitle separator, so keep the article inside the subtitle
  // rather than doubling it onto the base ("The The Lord of the Rings…").
  if (base.toLowerCase().startsWith(`${article} `)) {
    const Sub = article === 'a' ? 'A' : article === 'an' ? 'An' : 'The';
    return rest ? `${base}: ${Sub} ${rest}` : base;
  }

  const Article = article.charAt(0).toUpperCase() + article.slice(1);
  return rest ? `${Article} ${base}: ${rest}` : `${Article} ${base}`;
};

export default displayGameTitle;
