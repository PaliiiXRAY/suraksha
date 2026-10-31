import React, { useState, useRef, useEffect } from 'react';
import { sosService } from '../data/sosService';
import type { SosOutboxEntry, SosStatus } from '../data/indexedDbOutbox';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords: { lat: number; lon: number };
}

const STEPS: { status: SosStatus; label: string; desc: string; icon: string }[] = [
  {
    status: 'created',
    label: 'Created',
    desc: 'Saved in offline outbox (IndexedDB)',
    icon: '📝',
  },
  {
    status: 'relayed',
    label: 'Relayed',
    desc: 'Shared via mesh / gateway',
    icon: '📡',
  },
  {
    status: 'received',
    label: 'Received',
    desc: 'Accepted by Government Dispatch (202)',
    icon: '📥',
  },
  {
    status: 'acknowledged',
    label: 'Acknowledged',
    desc: 'Verified by Gov Authority (Signed ACK)',
    icon: '✅',
  },
];

export function SosModal({ isOpen, onClose, userCoords }: SosModalProps) {
  if (!isOpen) return null;

  // Hold-to-send state
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form states
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [injuryType, setInjuryType] = useState<string>('trapped');
  const [text, setText] = useState<string>('Immediate rescue and medical evacuation needed.');
  const [contact, setContact] = useState<string>('');
  const [medical, setMedical] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Outbox entries
  const [activeSosList, setActiveSosList] = useState<SosOutboxEntry[]>([]);

  useEffect(() => {
    const unsub = sosService.subscribe((list) => {
      setActiveSosList(list);
    });
    return unsub;
  }, []);

  const latestSos = activeSosList.length > 0 ? activeSosList[activeSosList.length - 1] : null;

  // Handle 3-second hold
  const startHold = () => {
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const DURATION = 3000; // 3 seconds

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / DURATION) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setIsHolding(false);
        triggerInstantSos();
      }
    }, 50);
  };

  const cancelHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const triggerInstantSos = async () => {
    setIsSubmitting(true);
    try {
      await sosService.createAndQueueSos({
        lat: userCoords.lat,
        lon: userCoords.lon,
        text,
        peopleCount,
        injuryType,
        contactInfo: contact,
        medicalNotes: medical,
      });
    } catch (err) {
      console.error('[SosModal] Error dispatching SOS:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIndex = (status: SosStatus): number => {
    switch (status) {
      case 'created':
        return 0;
      case 'relayed':
        return 1;
      case 'received':
        return 2;
      case 'acknowledged':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
    >
      <div className="modal-sheet sos-modal-sheet">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🆘</span>
            <div>
              <h2 id="sos-modal-title" className="modal-title" style={{ color: '#ef4444' }}>
                Emergency SOS Dispatch
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Encrypted to Government Public Key · Direct & Mesh Relay
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Close SOS screen"
          >
            ✕
          </button>
        </div>

        {/* If user already sent an active SOS, show the Stepper Progress */}
        {latestSos ? (
          <div className="active-sos-status-card">
            <div className="sos-status-header">
              <span className="pulsing-red-badge">LIVE SOS #{latestSos.sos_id.slice(-6)}</span>
              <span className="sos-coords">
                {latestSos.bundle.sos_event.lat.toFixed(4)}°N,{' '}
                {latestSos.bundle.sos_event.lon.toFixed(4)}°E
              </span>
            </div>

            {/* Stepper Display */}
            <div className="sos-stepper-container" role="list">
              {STEPS.map((step, idx) => {
                const currentStepIdx = getStepIndex(latestSos.status);
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div
                    key={step.status}
                    className={`stepper-step ${isPassed ? 'completed' : ''} ${
                      isCurrent ? 'active' : ''
                    }`}
                    role="listitem"
                  >
                    <div className="step-marker-col">
                      <div className="step-circle">{step.icon}</div>
                      {idx < STEPS.length - 1 && <div className="step-connector" />}
                    </div>
                    <div className="step-body">
                      <div className="step-title-row">
                        <strong className="step-label">{step.label}</strong>
                        {isCurrent && <span className="step-pulse-tag">Current Status</span>}
                      </div>
                      <span className="step-desc">{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {latestSos.status === 'acknowledged' && latestSos.ack_event && (
              <div className="sos-ack-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🛡️</span>
                  <strong>Official Government Dispatch ACK Verified</strong>
                </div>
                <p style={{ marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>
                  "{latestSos.ack_event.text}"
                </p>
                <div style={{ fontSize: '10px', color: '#6ee7b7', marginTop: '4px' }}>
                  Signed by Gov Key: {latestSos.ack_event.author.slice(0, 16)}...
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => sosService.triggerUpload()}
                aria-label="Retry upload now"
              >
                🔄 Check / Force Sync
              </button>
            </div>
          </div>
        ) : (
          /* SOS Hold to Trigger & Form Screen */
          <div className="sos-create-container">
            {/* 3-Second Hold Button */}
            <div className="hold-button-wrapper">
              <div
                className="sos-hold-ring"
                style={{
                  background: `conic-gradient(#ef4444 ${holdProgress}%, rgba(255,255,255,0.1) 0%)`,
                }}
              >
                <button
                  type="button"
                  className={`sos-hold-btn ${isHolding ? 'holding' : ''}`}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  disabled={isSubmitting}
                  aria-label="Hold button for 3 seconds to trigger emergency SOS"
                >
                  <span className="sos-btn-icon">🆘</span>
                  <strong>{isHolding ? `${Math.ceil((100 - holdProgress) / 33)}s` : 'HOLD SOS'}</strong>
                  <span className="hold-hint">Hold 3 seconds</span>
                </button>
              </div>
              <span className="hold-caption">
                {isHolding ? 'Keep holding to broadcast...' : 'Press and hold circle for 3 seconds'}
              </span>
            </div>

            {/* Optional Details Accordion */}
            <div className="sos-details-box">
              <div className="form-section">
                <label className="form-label">Number of People in Danger</label>
                <div className="qty-selector">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`qty-btn ${peopleCount === num ? 'active' : ''}`}
                      onClick={() => setPeopleCount(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Urgency / Situation</label>
                <div className="segmented-control">
                  {[
                    { id: 'trapped', label: 'Trapped' },
                    { id: 'injured', label: 'Severe Injury' },
                    { id: 'flooded', label: 'Rising Flood' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`segmented-btn ${injuryType === cat.id ? 'active hazard' : ''}`}
                      onClick={() => setInjuryType(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Short Emergency Note</label>
                <input
                  type="text"
                  className="text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. 2 adults trapped on roof with infant"
                  maxLength={280}
                />
              </div>

              <div className="form-section">
                <label className="form-label">
                  Private Contact & Medical Info (Encrypted to Gov Key)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Contact phone"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Medical alerts (e.g. diabetic)"
                    value={medical}
                    onChange={(e) => setMedical(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="action-btn primary"
              style={{ background: '#ef4444', color: '#fff', minHeight: '52px' }}
              onClick={triggerInstantSos}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing & Encrypting...' : '🚨 Send SOS Immediately (1-Tap)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

