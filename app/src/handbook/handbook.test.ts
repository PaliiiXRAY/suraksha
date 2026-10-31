import { describe, it, expect } from 'vitest';
import {
  getAllArticles,
  getEmergencyArticles,
  getArticleById,
  searchHandbook,
} from './loader';

describe('Offline Handbook & MiniSearch', () => {
  it('loads all handbook articles from content/handbook/en/', () => {
    const articles = getAllArticles('en');
    expect(articles.length).toBeGreaterThanOrEqual(5);

    for (const art of articles) {
      expect(art.id).toBeDefined();
      expect(art.title).toBeDefined();
      expect(art.version).toBe('1.0.0');
      expect(art.review_date).toBe('2026-10-30');
      expect(art.content).toContain('NEEDS MEDICAL REVIEW');
    }
  });

  it('retrieves emergency articles with exact required topics', () => {
    const emergency = getEmergencyArticles('en');
    const ids = emergency.map((a) => a.id);

    expect(ids).toContain('severe_bleeding');
    expect(ids).toContain('not_breathing');
    expect(ids).toContain('burn');
    expect(ids).toContain('fracture');
    expect(ids).toContain('choking');
  });

  it('retrieves article by ID or slug', () => {
    const bleeding = getArticleById('severe_bleeding', 'en');
    expect(bleeding).toBeDefined();
    expect(bleeding?.title).toBe('Severe Bleeding');

    const cpr = getArticleById('not-breathing', 'en');
    expect(cpr).toBeDefined();
    expect(cpr?.title).toContain('Not Breathing');
  });

  it('performs exact and keyword searches with MiniSearch', () => {
    const r1 = searchHandbook('bleeding', 'en');
    expect(r1.length).toBeGreaterThan(0);
    expect(r1[0].article.id).toBe('severe_bleeding');

    const r2 = searchHandbook('CPR', 'en');
    expect(r2.length).toBeGreaterThan(0);
    expect(r2[0].article.id).toBe('not_breathing');

    const r3 = searchHandbook('heimlich', 'en');
    expect(r3.length).toBeGreaterThan(0);
    expect(r3[0].article.id).toBe('choking');
  });

  it('performs fuzzy search for typos with MiniSearch', () => {
    // "chokng" -> choking
    const r = searchHandbook('chokng', 'en');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((item) => item.article.id === 'choking')).toBe(true);

    // "fractur" -> fracture
    const r2 = searchHandbook('fractur', 'en');
    expect(r2.length).toBeGreaterThan(0);
    expect(r2.some((item) => item.article.id === 'fracture')).toBe(true);
  });
});

