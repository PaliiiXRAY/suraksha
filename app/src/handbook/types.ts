export interface HandbookArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  language: string;
  version: string;
  review_date: string;
  summary: string;
  keywords: string;
  content: string;
  raw: string;
}

export interface SearchResultItem {
  article: HandbookArticle;
  score: number;
  match: Record<string, string[]>;
}

