import MiniSearch from 'minisearch';
import type { HandbookArticle, SearchResultItem } from './types';

// Vite eager glob import for markdown files across languages
// Path relative to src/handbook: ../../../content/handbook/**/*.md
const markdownModules = import.meta.glob('../../../content/handbook/**/*.md', {
  query: '?raw',
  eager: true,
}) as Record<string, { default: string } | string>;

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  let body = raw;

  if (raw.startsWith('---')) {
    const endIdx = raw.indexOf('---', 3);
    if (endIdx !== -1) {
      const header = raw.slice(3, endIdx).trim();
      body = raw.slice(endIdx + 3).trim();

      const lines = header.split('\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          meta[key] = val;
        }
      }
    }
  }

  return { meta, body };
}

const articles: HandbookArticle[] = [];
const articleMap = new Map<string, HandbookArticle>();

// Parse all loaded markdown files
for (const [path, mod] of Object.entries(markdownModules)) {
  const rawText = typeof mod === 'string' ? mod : mod.default || '';
  if (!rawText || path.endsWith('README.md')) continue;

  // Path format: ../../../content/handbook/<lang>/<filename>.md
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  const lang = parts.length >= 2 ? parts[parts.length - 2] : 'en';
  const fileBase = filename.replace(/\.md$/, '');

  const { meta, body } = parseFrontmatter(rawText);

  const article: HandbookArticle = {
    id: meta.id || fileBase,
    title: meta.title || fileBase.replace(/_/g, ' '),
    slug: meta.slug || fileBase.replace(/_/g, '-'),
    category: meta.category || 'General',
    language: lang,
    version: meta.version || '1.0.0',
    review_date: meta.review_date || '2026-10-30',
    summary: meta.summary || '',
    keywords: meta.keywords || '',
    content: body,
    raw: rawText,
  };

  articles.push(article);
  articleMap.set(article.id, article);
  articleMap.set(article.slug, article);
}

// Initialize MiniSearch engine with unique _searchId
const indexedArticles = articles.map((a) => ({
  ...a,
  _searchId: `${a.language}_${a.id}`,
}));

const miniSearch = new MiniSearch<HandbookArticle & { _searchId: string }>({
  idField: '_searchId',
  fields: ['title', 'summary', 'keywords', 'content'],
  storeFields: [
    'id',
    'title',
    'slug',
    'category',
    'language',
    'version',
    'review_date',
    'summary',
  ],
  searchOptions: {
    boost: { title: 3, keywords: 2, summary: 1.5 },
    fuzzy: 0.25,
    prefix: true,
  },
});

if (indexedArticles.length > 0) {
  miniSearch.addAll(indexedArticles);
}

export function getAllArticles(language: string = 'en'): HandbookArticle[] {
  return articles.filter((a) => a.language === language);
}

export function getEmergencyArticles(language: string = 'en'): HandbookArticle[] {
  const emergencyIds = ['severe_bleeding', 'not_breathing', 'burn', 'fracture', 'choking'];
  const langArticles = getAllArticles(language);
  const found: HandbookArticle[] = [];

  for (const id of emergencyIds) {
    const art = langArticles.find((a) => a.id === id || a.slug === id);
    if (art) found.push(art);
  }

  // If specific IDs weren't matched, return all with category 'Emergency'
  if (found.length === 0) {
    return langArticles.filter((a) => a.category.toLowerCase() === 'emergency');
  }

  return found;
}

export function getArticleById(idOrSlug: string, language: string = 'en'): HandbookArticle | undefined {
  const exact = articleMap.get(idOrSlug);
  if (exact && exact.language === language) return exact;
  return articles.find(
    (a) => (a.id === idOrSlug || a.slug === idOrSlug) && a.language === language
  );
}

export function searchHandbook(query: string, language: string = 'en'): SearchResultItem[] {
  if (!query || !query.trim()) {
    return getAllArticles(language).map((a) => ({ article: a, score: 1, match: {} }));
  }

  const results = miniSearch.search(query.trim());
  const matched: SearchResultItem[] = [];

  for (const res of results) {
    const art = articles.find((a) => a.id === res.id && a.language === language);
    if (art) {
      matched.push({
        article: art,
        score: res.score,
        match: res.match,
      });
    }
  }

  return matched;
}

export { miniSearch };

