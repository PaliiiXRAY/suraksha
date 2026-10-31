import React, { useState } from 'react';
import type { FeatureState } from '../domain/statusEngine';
import type { MeshEvent } from '../domain/types';
import { generateUlid } from '../domain/ulid';
import { getDeviceIdentity } from '../data/identity';
import { signEvent } from '../crypto/sign';
import { validateEvent } from '../domain/validate';
import { eventStore } from '../data/eventStore';
import { TypeIcon, StatusBadgeIcon } from './icons';

interface BottomSheetProps {
  feature: FeatureState | null;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const ms = new Date(dateStr).getTime();
    if (isNaN(ms)) return dateStr;
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return dateStr;
  }
}

export function BottomSheet({ feature, onClose }: BottomSheetProps) {
  if (!feature) return null;

  // Two-tap action confirmation states
  const [confirmStage, setConfirmStage] = useState<'idle' | 'pending'>('idle');
  const [resolveStage, setResolveStage] = useState<'idle' | 'pending'>('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isResolved = feature.status === 'resolved';

  const handleConfirmStillThere = async () => {
    if (confirmStage === 'idle') {
      setConfirmStage('pending');
      setResolveStage('idle');
      return;
    }

    // Second tap: execute
    setIsProcessing(true);
    setActionError(null);
    try {
      const identity = await getDeviceIdentity();
      const hlcStr = identity.tickHlc();
      const eventId = generateUlid();

      const unsigned: Omit<MeshEvent, 'sig'> = {
        id: eventId,
        v: 1,
        kind: 'CONFIRM',
        type: feature.type,
        feature_id: feature.feature_id,
        ref: feature.latestEvent.id,
        lat: feature.lat,
        lon: feature.lon,
        severity: feature.severity,
        text: 'Confirmed: incident still present on site.',
        qty: null,
        hlc: hlcStr,
        device_time: new Date().toISOString(),
        author: identity.keyPair.publicKey,
        ttl_hours: 24,
      };

      const signed = await signEvent(unsigned, identity.keyPair.secretKey);
      const val = await validateEvent(signed);
      if (!val.valid) throw new Error(val.reason);

      await eventStore.addEvent(signed);
      setConfirmStage('idle');
    } catch (err: any) {
      console.error('[BottomSheet] Confirm error:', err);
      setActionError(err.message || 'Failed to submit confirmation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkFixed = async () => {
    if (resolveStage === 'idle') {
      setResolveStage('pending');
      setConfirmStage('idle');
      return;
    }

    // Second tap: execute
    setIsProcessing(true);
    setActionError(null);
    try {
      const identity = await getDeviceIdentity();
      const hlcStr = identity.tickHlc();
      const eventId = generateUlid();

      const unsigned: Omit<MeshEvent, 'sig'> = {
        id: eventId,
        v: 1,
        kind: 'RESOLVE',
        type: feature.type,
        feature_id: feature.feature_id,
        ref: feature.latestEvent.id,
        lat: feature.lat,
        lon: feature.lon,
        severity: 1,
        text: 'Hazard verified fixed and cleared.',
        qty: null,
        hlc: hlcStr,
        device_time: new Date().toISOString(),
        author: identity.keyPair.publicKey,
        ttl_hours: 48,
      };

      const signed = await signEvent(unsigned, identity.keyPair.secretKey);
      const val = await validateEvent(signed);
      if (!val.valid) throw new Error(val.reason);

      await eventStore.addEvent(signed);
      setResolveStage('idle');
    } catch (err: any) {
      console.error('[BottomSheet] Resolve error:', err);
      setActionError(err.message || 'Failed to resolve hazard');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="bottom-sheet-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <div className="bottom-sheet-card">
        {/* Grab bar */}
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className={`sheet-icon-bubble status-${feature.color}`}
              aria-hidden="true"
            >
              <TypeIcon type={feature.type} size={26} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 id="sheet-title" className="sheet-title">
                  {feature.type.replace(/_/g, ' ').toUpperCase()}
                </h3>
                <span className={`status-pill pill-${feature.color}`}>
                  <StatusBadgeIcon status={feature.status} size={12} />
                  <span>{feature.statusLabel}</span>
                </span>
              </div>
              <div className="sheet-sub">
                <span className="trust-text">{feature.trustLabel}</span>
                <span>•</span>
                <span>
                  {feature.lat.toFixed(5)}°N, {feature.lon.toFixed(5)}°E
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        {/* Two-Tap Quick Actions */}
        <div className="quick-actions-box">
          <div className="actions-header">Two-Tap Community Verification:</div>
          <div className="action-buttons-grid">
            {/* Still There Button */}
            {confirmStage === 'idle' ? (
              <button
                type="button"
                className="action-btn-large confirm-btn"
                onClick={handleConfirmStillThere}
                disabled={isProcessing}
                aria-label="Tap once to begin confirming hazard is still present"
              >
                <span className="btn-icon">👍</span>
                <div className="btn-text-col">
                  <strong>Still there</strong>
                  <span className="btn-subtext">Tap to confirm issue</span>
                </div>
              </button>
            ) : (
              <div className="two-tap-prompt confirm-prompt">
                <span className="prompt-text">Confirm: Still there?</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="action-btn-confirm"
                    onClick={handleConfirmStillThere}
                    disabled={isProcessing}
                    aria-label="Confirm that this issue is still present"
                  >
                    {isProcessing ? 'Saving...' : 'Yes, Confirm'}
                  </button>
                  <button
                    type="button"
                    className="action-btn-cancel"
                    onClick={() => setConfirmStage('idle')}
                    aria-label="Cancel confirmation"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Fixed / Cleared Button */}
            {resolveStage === 'idle' ? (
              <button
                type="button"
                className={`action-btn-large resolve-btn ${isResolved ? 'disabled-resolve' : ''}`}
                onClick={handleMarkFixed}
                disabled={isProcessing || isResolved}
                aria-label={
                  isResolved
                    ? 'Already marked fixed'
                    : 'Tap once to begin marking hazard as fixed'
                }
              >
                <span className="btn-icon">✅</span>
                <div className="btn-text-col">
                  <strong>{isResolved ? 'Already Fixed' : 'Mark Fixed'}</strong>
                  <span className="btn-subtext">
                    {isResolved ? 'Issue resolved' : 'Tap to mark cleared'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="two-tap-prompt resolve-prompt">
                <span className="prompt-text">Confirm: Mark as Fixed?</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="action-btn-confirm resolve"
                    onClick={handleMarkFixed}
                    disabled={isProcessing}
                    aria-label="Confirm marking this issue as resolved and fixed"
                  >
                    {isProcessing ? 'Saving...' : 'Yes, Mark Fixed'}
                  </button>
                  <button
                    type="button"
                    className="action-btn-cancel"
                    onClick={() => setResolveStage('idle')}
                    aria-label="Cancel marking fixed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {actionError && (
            <div className="error-alert" role="alert">
              ⚠️ {actionError}
            </div>
          )}
        </div>

        {/* Trust & Verification Rationale (SRS §10 & AGENTS.md §5 explainability) */}
        {feature.reasons && feature.reasons.length > 0 && (
          <div style={{ margin: '14px 0', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '12px', color: '#38bdf8' }}>🔍 Trust & Verification Factors</strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Score: {feature.score.toFixed(1)}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              {feature.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline (Newest First) */}
        <div className="timeline-section">
          <div className="timeline-header">
            <h4>Timeline ({feature.events.length} updates · Newest First)</h4>
          </div>

          <div className="timeline-list" role="list">
            {feature.events.map((ev, idx) => {
              const isFirstReport = ev.id === feature.initialReport.id;
              const isResolve = ev.kind === 'RESOLVE';
              const isConfirm = ev.kind === 'CONFIRM';

              let dotColor = '#3b82f6';
              let badgeText: string = ev.kind;
              if (isResolve) {
                dotColor = '#22c55e';
                badgeText = 'RESOLVED / FIXED';
              } else if (isConfirm) {
                dotColor = '#f59e0b';
                badgeText = 'CONFIRMED STILL THERE';
              } else if (isFirstReport) {
                dotColor = feature.kind === 'HAZARD' ? '#ef4444' : '#3b82f6';
                badgeText = 'INITIAL REPORT';
              }

              return (
                <div key={ev.id} className="timeline-item" role="listitem">
                  <div className="timeline-marker-col">
                    <div
                      className="timeline-dot"
                      style={{ backgroundColor: dotColor }}
                      aria-hidden="true"
                    />
                    {idx < feature.events.length - 1 && <div className="timeline-line" />}
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-meta">
                      <span
                        className="timeline-badge"
                        style={{
                          backgroundColor: `${dotColor}25`,
                          color: dotColor,
                          border: `1px solid ${dotColor}60`,
                        }}
                      >
                        {badgeText}
                      </span>
                      <span className="timeline-time">
                        {formatRelativeTime(ev.device_time)}
                      </span>
                    </div>

                    <p className="timeline-text">{ev.text}</p>

                    <div className="timeline-footer">
                      <span className="author-id">
                        👤 Citizen · {ev.author.slice(0, 8)}
                      </span>
                      <span className="hlc-tag" title={ev.hlc}>
                        HLC: {ev.hlc.slice(0, 15)}...
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
