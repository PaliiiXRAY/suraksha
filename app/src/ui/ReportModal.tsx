import React, { useState } from 'react';
import type { EventKind, EventType, MeshEvent } from '../domain/types';
import { MAX_TEXT_LENGTH } from '../domain/types';
import { encodeGeohash } from '../domain/geohash';
import { generateUlid } from '../domain/ulid';
import { getDeviceIdentity } from '../data/identity';
import { signEvent } from '../crypto/sign';
import { validateEvent } from '../domain/validate';
import { eventStore } from '../data/eventStore';
import { TypeIcon } from './icons';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  onCreated: (event: MeshEvent) => void;
}

const HAZARD_TYPES: { type: EventType; label: string }[] = [
  { type: 'flooding', label: 'Flooding' },
  { type: 'tree_fallen', label: 'Tree Fallen' },
  { type: 'road_blocked', label: 'Road Blocked' },
  { type: 'power_line_down', label: 'Power Line Down' },
  { type: 'bridge_damaged', label: 'Bridge Damaged' },
  { type: 'fire', label: 'Fire Outbreak' },
  { type: 'landslide', label: 'Landslide' },
  { type: 'building_collapse', label: 'Building Collapse' },
  { type: 'gas_leak', label: 'Gas Leak' },
];

const RESOURCE_TYPES: { type: EventType; label: string }[] = [
  { type: 'shelter', label: 'Shelter' },
  { type: 'water', label: 'Clean Water' },
  { type: 'food', label: 'Food Distribution' },
  { type: 'medical_aid', label: 'Medical Aid' },
  { type: 'charging_point', label: 'Power / Charging' },
  { type: 'fuel', label: 'Fuel Depot' },
];

export function ReportModal({
  isOpen,
  onClose,
  lat,
  lon,
  onCreated,
}: ReportModalProps) {
  if (!isOpen) return null;

  const [category, setCategory] = useState<'HAZARD' | 'RESOURCE'>('HAZARD');
  const [selectedType, setSelectedType] = useState<EventType>('flooding');
  const [severity, setSeverity] = useState<number>(2);
  const [text, setText] = useState<string>('');
  const [qty, setQty] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentTypes = category === 'HAZARD' ? HAZARD_TYPES : RESOURCE_TYPES;

  const handleCategorySwitch = (cat: 'HAZARD' | 'RESOURCE') => {
    setCategory(cat);
    setSelectedType(cat === 'HAZARD' ? 'flooding' : 'shelter');
    setSeverity(cat === 'HAZARD' ? 2 : 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMessage('Please enter a short description');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const identity = await getDeviceIdentity();
      const hlcStr = identity.tickHlc();
      const featureId = encodeGeohash(lat, lon, 9);
      const eventId = generateUlid();

      const unsigned: Omit<MeshEvent, 'sig'> = {
        id: eventId,
        v: 1,
        kind: category as EventKind,
        type: selectedType,
        feature_id: featureId,
        ref: null,
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
        severity,
        text: text.trim(),
        qty: qty.trim() ? parseInt(qty.trim(), 10) : null,
        hlc: hlcStr,
        device_time: new Date().toISOString(),
        author: identity.keyPair.publicKey,
        ttl_hours: category === 'HAZARD' ? 48 : 72,
      };

      const signed = await signEvent(unsigned, identity.keyPair.secretKey);
      const validation = await validateEvent(signed);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Event validation failed');
      }

      await eventStore.addEvent(signed);
      onCreated(signed);
      onClose();
    } catch (err: any) {
      console.error('[ReportModal] Submit error:', err);
      setErrorMessage(err.message || 'Failed to sign and save report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="modal-sheet">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <h2 id="report-modal-title" className="modal-title">
              Report Incident / Resource
            </h2>
          </div>
          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Close report dialog"
          >
            ✕
          </button>
        </div>

        <div className="location-pill">
          <span>Coordinates:</span>
          <strong>
            {lat.toFixed(5)}°N, {lon.toFixed(5)}°E
          </strong>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          {/* Category Toggle */}
          <div className="segmented-control" role="group" aria-label="Report category">
            <button
              type="button"
              className={`segmented-btn ${category === 'HAZARD' ? 'active hazard' : ''}`}
              onClick={() => handleCategorySwitch('HAZARD')}
              aria-pressed={category === 'HAZARD'}
            >
              ⚠️ Hazard / Obstacle
            </button>
            <button
              type="button"
              className={`segmented-btn ${category === 'RESOURCE' ? 'active resource' : ''}`}
              onClick={() => handleCategorySwitch('RESOURCE')}
              aria-pressed={category === 'RESOURCE'}
            >
              ℹ️ Available Resource
            </button>
          </div>

          {/* Type Selector Grid */}
          <div className="form-section">
            <label className="form-label">
              Select {category === 'HAZARD' ? 'Hazard' : 'Resource'} Type
            </label>
            <div className="type-grid" role="radiogroup" aria-label="Incident type">
              {currentTypes.map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`type-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedType(item.type)}
                  >
                    <div className="type-icon-wrapper">
                      <TypeIcon
                        type={item.type}
                        size={22}
                        color={isSelected ? '#38bdf8' : '#cbd5e1'}
                      />
                    </div>
                    <span className="type-name">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Selector */}
          <div className="form-section">
            <label className="form-label" id="severity-label">
              Severity Level
            </label>
            <div className="severity-row" role="radiogroup" aria-labelledby="severity-label">
              {[
                { val: 1, label: 'Low', desc: 'Minor issue / passable', color: '#22c55e' },
                { val: 2, label: 'Medium', desc: 'Urgent / impassable', color: '#f59e0b' },
                { val: 3, label: 'Critical', desc: 'Life threat / severe danger', color: '#ef4444' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  role="radio"
                  aria-checked={severity === s.val}
                  className={`severity-btn ${severity === s.val ? 'active' : ''}`}
                  onClick={() => setSeverity(s.val)}
                  style={{
                    borderColor: severity === s.val ? s.color : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="sev-dot" style={{ backgroundColor: s.color }} />
                  <strong>
                    Sev {s.val}: {s.label}
                  </strong>
                  <span className="sev-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="report-desc" className="form-label">
                Description (max 280 chars)
              </label>
              <span
                className="char-count"
                style={{ color: text.length > 250 ? '#f87171' : '#94a3b8' }}
              >
                {text.length}/{MAX_TEXT_LENGTH}
              </span>
            </div>
            <textarea
              id="report-desc"
              className="text-input"
              rows={3}
              maxLength={MAX_TEXT_LENGTH}
              placeholder={
                category === 'HAZARD'
                  ? 'e.g. Fallen banyan tree completely blocking 2 lanes near hospital'
                  : 'e.g. Free drinking water and 50 charging ports available in hall'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>

          {/* Optional Quantity */}
          {category === 'RESOURCE' && (
            <div className="form-section">
              <label htmlFor="report-qty" className="form-label">
                Estimated Capacity / Quantity (optional)
              </label>
              <input
                id="report-qty"
                type="number"
                min="0"
                className="text-input"
                placeholder="e.g. 150 beds or meals"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          )}

          {errorMessage && (
            <div className="error-alert" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Submit Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="action-btn secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="action-btn primary"
              disabled={isSubmitting || !text.trim()}
              aria-label="Sign and publish report"
            >
              {isSubmitting ? 'Signing & Saving...' : '✍️ Sign & Publish Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

