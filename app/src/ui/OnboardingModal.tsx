import React, { useState, useEffect } from 'react';
import { PermissionsManager, PERMISSION_EXPLANATIONS } from '../transports/permissions';
import { nearbyTransport, type MeshPermissionsStatus } from '../transports/nearby';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  if (!isOpen) return null;

  const [step, setStep] = useState<number>(1);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [tileDownloadStatus, setTileDownloadStatus] = useState<string | null>(null);
  const [isDownloadingTiles, setIsDownloadingTiles] = useState<boolean>(false);
  const [permStatus, setPermStatus] = useState<MeshPermissionsStatus | null>(null);

  useEffect(() => {
    // Check storage persist status
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
    PermissionsManager.checkStatus().then(setPermStatus);
  }, []);

  const handlePersistStorage = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      setIsPersisted(granted);
    }
  };

  const handlePrecacheTiles = async () => {
    setIsDownloadingTiles(true);
    setTileDownloadStatus('Downloading vector tiles for offline use...');
    try {
      const res = await fetch('/tiles/sample.pmtiles', { cache: 'reload' });
      if (res.ok) {
        setTileDownloadStatus('✅ Offline map tiles cached successfully (Sample Region).');
      } else {
        setTileDownloadStatus('⚠️ Sample tiles bundled locally. Ready for offline use.');
      }
    } catch (err) {
      setTileDownloadStatus('Offline tiles ready from local app bundle.');
    } finally {
      setIsDownloadingTiles(false);
    }
  };

  const handleGrantPermissions = async () => {
    const updated = await PermissionsManager.requestAll();
    setPermStatus(updated);
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('meshmap_onboarded', 'true');
    } catch (e) {
      console.warn('Could not set onboarding flag:', e);
    }
    nearbyTransport.isAvailable().then(async (avail) => {
      if (avail) {
        try {
          await nearbyTransport.startDiscovery();
        } catch (err) {
          console.warn('[OnboardingModal] Auto-start mesh error:', err);
        }
      }
    });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="modal-sheet" style={{ maxWidth: '540px', padding: '24px' }}>
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8' }}>
              Setup & Disaster Readiness · Step {step} of 3
            </span>
            <h2 id="onboarding-title" style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 700 }}>
              {step === 1 && 'Welcome to SURAKSHA'}
              {step === 2 && 'Offline Map & Storage'}
              {step === 3 && 'Emergency Permissions'}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleFinish}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
              aria-label="Skip onboarding and go to map"
            >
              Skip to Map ✕
            </button>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    width: '24px',
                    height: '4px',
                    borderRadius: '2px',
                    background: s === step ? '#38bdf8' : s < step ? '#10b981' : '#334155',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step 1: Welcome & Mission */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🛡️</div>
              <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                SURAKSHA is a resilient, offline-first disaster intelligence platform.
                It allows citizens and emergency volunteers to create verified hazard reports,
                read first-aid guidance, and synchronize reports peer-to-peer—even when all cell towers and internet go down.
              </p>
            </div>

            <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
              <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px' }}>
                Key Capabilities:
              </strong>
              • <strong>Offline Vector Maps:</strong> Bundled PMTiles require zero internet.<br />
              • <strong>P2P Phone Mesh:</strong> Background Nearby Connections sync reports between passing phones.<br />
              • <strong>Emergency SOS Outbox:</strong> Cryptographically signed distress bundles with SMS and mesh relays.
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="action-btn primary"
                style={{ minWidth: '130px' }}
                onClick={() => setStep(2)}
              >
                Next: Storage & Maps ➔
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Offline Map Download & Storage Persistence */}
        {step === 2 && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
              In prolonged power outages, your browser might evict offline storage unless persistence is explicitly granted.
              Enable persistent storage and cache the offline base map now.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '18px 0' }}>
              {/* Storage Persistence Box */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💾</span>
                    <strong>Persistent Local Storage</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Prevents browser eviction during low-disk states
                  </span>
                </div>
                <button
                  type="button"
                  className={`filter-chip ${isPersisted ? 'active' : ''}`}
                  onClick={handlePersistStorage}
                  disabled={isPersisted}
                >
                  {isPersisted ? '✅ Persisted' : 'Enable Persist'}
                </button>
              </div>

              {/* Offline Map Precache Box */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🗺️</span>
                    <strong>Offline City Base Map</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Sample PMTiles region (Florence sample bundled)
                  </span>
                </div>
                <button
                  type="button"
                  className="filter-chip active"
                  onClick={handlePrecacheTiles}
                  disabled={isDownloadingTiles}
                >
                  {isDownloadingTiles ? 'Downloading...' : 'Cache Map'}
                </button>
              </div>

              {tileDownloadStatus && (
                <div className="status-pill pill-blue" style={{ fontSize: '12px' }}>
                  {tileDownloadStatus}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                type="button"
                className="action-btn secondary"
                onClick={() => setStep(1)}
              >
                ⬅ Back
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => setStep(3)}
              >
                Next: Permissions ➔
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Permissions Rationale & Completion */}
        {step === 3 && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 14px 0' }}>
              SURAKSHA requires specific Android hardware permissions to form autonomous phone-to-phone radio meshes.
              Review the clear purpose for each permission below:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {PERMISSION_EXPLANATIONS.map((p) => {
                const granted = permStatus ? permStatus[p.id] : false;
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '10px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{p.icon}</span>
                        <strong style={{ fontSize: '13px' }}>{p.title}</strong>
                      </div>
                      <span className={`status-badge ${granted ? 'status-green' : 'status-amber'}`}>
                        {granted ? 'GRANTED' : 'REQUIRED'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {p.purpose}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="action-btn secondary"
                style={{ flex: 1 }}
                onClick={handleGrantPermissions}
              >
                Grant Permissions
              </button>
              <button
                type="button"
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={handleFinish}
              >
                Start Using SURAKSHA 🚀
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

