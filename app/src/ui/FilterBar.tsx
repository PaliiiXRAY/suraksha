import React, { useState } from 'react';

export type TimeFilter = '6h' | '24h' | 'all';
export type TypeFilter = 'all' | 'hazards' | 'resources';

export interface FilterState {
  type: TypeFilter;
  minSeverity: number; // 0 = all, 1 = 1+, 2 = 2+, 3 = 3 only
  timeWindow: TimeFilter;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalFeaturesCount: number;
  filteredCount: number;
}

export function FilterBar({
  filters,
  onChange,
  totalFeaturesCount,
  filteredCount,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleTypeChange = (type: TypeFilter) => {
    onChange({ ...filters, type });
  };

  const handleSeverityChange = (minSeverity: number) => {
    onChange({ ...filters, minSeverity });
  };

  const handleTimeChange = (timeWindow: TimeFilter) => {
    onChange({ ...filters, timeWindow });
  };

  const isFiltered =
    filters.type !== 'all' || filters.minSeverity > 0 || filters.timeWindow !== 'all';

  return (
    <div className="filter-wrapper">
      {/* Top Toggle Button */}
      <div className="filter-toggle-row">
        <button
          type="button"
          className={`filter-toggle-btn ${isFiltered ? 'has-active-filters' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label="Toggle map filters"
        >
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span>Filters</span>
          <span className="filter-counter">
            {filteredCount}/{totalFeaturesCount}
          </span>
          <span className="filter-arrow">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {isFiltered && (
          <button
            type="button"
            className="filter-reset-btn"
            onClick={() =>
              onChange({
                type: 'all',
                minSeverity: 0,
                timeWindow: 'all',
              })
            }
            aria-label="Reset all filters"
          >
            Reset
          </button>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="filter-panel" role="region" aria-label="Incident and resource filters">
          {/* 1. Category / Type */}
          <div className="filter-group">
            <span className="filter-title" id="filter-type-title">
              Category
            </span>
            <div className="filter-chip-row" role="radiogroup" aria-labelledby="filter-type-title">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'hazards', label: '⚠️ Hazards Only' },
                { id: 'resources', label: 'ℹ️ Resources Only' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={filters.type === opt.id}
                  className={`filter-chip ${filters.type === opt.id ? 'active' : ''}`}
                  onClick={() => handleTypeChange(opt.id as TypeFilter)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Severity */}
          <div className="filter-group">
            <span className="filter-title" id="filter-sev-title">
              Min Severity
            </span>
            <div className="filter-chip-row" role="radiogroup" aria-labelledby="filter-sev-title">
              {[
                { val: 0, label: 'All Levels' },
                { val: 2, label: 'Sev 2+ (Medium)' },
                { val: 3, label: 'Sev 3 (Critical Only)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  role="radio"
                  aria-checked={filters.minSeverity === opt.val}
                  className={`filter-chip ${filters.minSeverity === opt.val ? 'active' : ''}`}
                  onClick={() => handleSeverityChange(opt.val)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Time Window */}
          <div className="filter-group">
            <span className="filter-title" id="filter-time-title">
              Time Window
            </span>
            <div className="filter-chip-row" role="radiogroup" aria-labelledby="filter-time-title">
              {[
                { id: '6h', label: 'Last 6 Hours' },
                { id: '24h', label: 'Last 24 Hours' },
                { id: 'all', label: 'All History' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={filters.timeWindow === opt.id}
                  className={`filter-chip ${filters.timeWindow === opt.id ? 'active' : ''}`}
                  onClick={() => handleTimeChange(opt.id as TimeFilter)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

