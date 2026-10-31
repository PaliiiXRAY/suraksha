import React, { useState, useMemo } from 'react';
import {
  getAllArticles,
  getEmergencyArticles,
  getArticleById,
  searchHandbook,
} from '../handbook/loader';
import type { HandbookArticle } from '../handbook/types';

interface HandbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialArticleId?: string | null;
}

const EMERGENCY_BUTTONS = [
  {
    id: 'severe_bleeding',
    label: 'Severe Bleeding',
    icon: '🩸',
    desc: 'Firm direct pressure, wound packing, shock care',
    color: '#ef4444',
  },
  {
    id: 'not_breathing',
    label: 'Not Breathing',
    icon: '🫀',
    desc: 'Hands-only CPR (100–120 bpm), chest compressions',
    color: '#dc2626',
  },
  {
    id: 'burn',
    label: 'Burn & Scald',
    icon: '🔥',
    desc: 'Cool running water 10–20 min, sterile cover',
    color: '#f97316',
  },
  {
    id: 'fracture',
    label: 'Fracture / Bone',
    icon: '🦴',
    desc: 'Immobilize & splint as found, cold compress',
    color: '#eab308',
  },
  {
    id: 'choking',
    label: 'Choking',
    icon: '🗣️',
    desc: '5 sharp back blows + 5 abdominal thrusts',
    color: '#3b82f6',
  },
];

// Clean renderer for basic markdown structure without heavy external libraries
function SimpleMarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="handbook-body-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="hb-h1">
              {trimmed.slice(2)}
            </h1>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="hb-h3">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="hb-h2">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('> [!WARNING]')) {
          return (
            <div key={idx} className="hb-warning-box">
              <span className="hb-warn-icon">⚠️</span>
              <strong>NEEDS MEDICAL REVIEW</strong>
            </div>
          );
        }
        if (trimmed.startsWith('>')) {
          return (
            <blockquote key={idx} className="hb-blockquote">
              {trimmed.slice(1).trim()}
            </blockquote>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s(.*)$/);
          return (
            <div key={idx} className="hb-list-item numbered">
              <span className="hb-num">{match?.[1]}</span>
              <span
                dangerouslySetInnerHTML={{
                  __html: formatInline(match?.[2] || ''),
                }}
              />
            </div>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="hb-list-item bullet">
              <span className="hb-bullet">•</span>
              <span
                dangerouslySetInnerHTML={{
                  __html: formatInline(trimmed.slice(2)),
                }}
              />
            </div>
          );
        }
        if (trimmed === '---') {
          return <hr key={idx} className="hb-hr" />;
        }
        if (trimmed.length === 0) {
          return <div key={idx} style={{ height: '8px' }} />;
        }

        return (
          <p
            key={idx}
            className="hb-p"
            dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
          />
        );
      })}
    </div>
  );
}

function formatInline(text: string): string {
  // Bold **text**
  let s = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return s;
}

export function HandbookModal({
  isOpen,
  onClose,
  initialArticleId,
}: HandbookModalProps) {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    initialArticleId || null
  );

  const selectedArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return getArticleById(selectedArticleId, 'en');
  }, [selectedArticleId]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchHandbook(searchQuery, 'en');
  }, [searchQuery]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handbook-title"
    >
      <div className="handbook-sheet">
        {/* CALL EMERGENCY SERVICES BANNER (Mandatory on every page) */}
        <div className="emergency-call-banner">
          <div className="call-info">
            <span className="call-siren" aria-hidden="true">
              🚨
            </span>
            <div>
              <div className="call-title">CALL EMERGENCY SERVICES IMMEDIATELY</div>
              <div className="call-sub">Dial 112 (India / Unified) or 108 (Disaster Ambulance)</div>
            </div>
          </div>
          <a
            href="tel:112"
            className="call-now-btn"
            aria-label="Call emergency services now (dial 112)"
          >
            📞 Call 112
          </a>
        </div>

        {/* Header with Version & Review Date */}
        <div className="handbook-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedArticle ? (
              <button
                type="button"
                className="icon-button back-btn"
                onClick={() => setSelectedArticleId(null)}
                aria-label="Back to Emergency handbook topics"
              >
                ← Back
              </button>
            ) : (
              <span style={{ fontSize: '22px' }}>📖</span>
            )}
            <div>
              <h2 id="handbook-title" className="hb-title">
                {selectedArticle ? selectedArticle.title : 'Offline First-Aid Handbook'}
              </h2>
              <div className="hb-meta-row">
                <span className="hb-tag">v{selectedArticle?.version || '1.0.0'}</span>
                <span>•</span>
                <span>Reviewed: {selectedArticle?.review_date || '2026-10-30'}</span>
                <span>•</span>
                <span className="hb-warn-tag">NEEDS MEDICAL REVIEW</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Close handbook"
          >
            ✕
          </button>
        </div>

        {/* Content View */}
        {selectedArticle ? (
          /* Article Detail View */
          <div className="handbook-scroll-area">
            <SimpleMarkdownRenderer content={selectedArticle.content} />
          </div>
        ) : (
          /* Emergency Topic Index & Search View */
          <div className="handbook-scroll-area">
            {/* Search Box */}
            <div className="hb-search-box">
              <span className="search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="search"
                className="hb-search-input"
                placeholder="Search first aid (e.g. bleeding, CPR, burns)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search offline first-aid handbook with MiniSearch"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* If user is searching, display MiniSearch results */}
            {searchQuery.trim().length > 0 ? (
              <div className="hb-search-results">
                <div className="section-label">
                  Search Results ({searchResults.length} matching)
                </div>

                {searchResults.length === 0 ? (
                  <div className="no-results-box">
                    No articles found for "{searchQuery}". Try "bleeding", "CPR", "burn", or "choking".
                  </div>
                ) : (
                  <div className="search-results-list" role="list">
                    {searchResults.map(({ article }) => (
                      <button
                        key={article.id}
                        type="button"
                        role="listitem"
                        className="search-result-card"
                        onClick={() => setSelectedArticleId(article.id)}
                      >
                        <div className="res-title-row">
                          <strong className="res-title">{article.title}</strong>
                          <span className="res-cat">{article.category}</span>
                        </div>
                        <p className="res-summary">{article.summary}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Emergency Big Buttons View */
              <div className="emergency-screen-section">
                <div className="section-label">⚡ Critical Emergency First-Aid</div>

                <div className="emergency-buttons-grid" role="group" aria-label="Emergency first-aid topics">
                  {EMERGENCY_BUTTONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="emergency-big-btn"
                      style={{ borderLeftColor: item.color }}
                      onClick={() => setSelectedArticleId(item.id)}
                      aria-label={`Open emergency guide for ${item.label}`}
                    >
                      <span className="em-btn-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="em-btn-content">
                        <strong className="em-btn-label">{item.label}</strong>
                        <span className="em-btn-desc">{item.desc}</span>
                      </div>
                      <span className="em-btn-arrow" aria-hidden="true">
                        ➔
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

