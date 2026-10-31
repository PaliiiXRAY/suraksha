import React, { useState, useEffect, useRef } from 'react';
import {
  createFileBundle,
  downloadFileBundle,
  importFileBundle,
  type ImportResult,
} from '../transports/fileTransport';
import { generateQrSyncDataUrl, importFromQrText } from '../transports/qrTransport';
import {
  nearbyTransport,
  PermissionsManager,
  PERMISSION_EXPLANATIONS,
} from '../transports';
import type { MeshPermissionsStatus } from '../transports/nearby';
import type { PeerInfo } from '../transports/types';
import { eventStore } from '../data/eventStore';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncModal({ isOpen, onClose }: SyncModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'file' | 'qr' | 'nearby'>('file');
  const [importStatus, setImportStatus] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrInputText, setQrInputText] = useState<string>('');
  const [tabSyncMsg, setTabSyncMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nearby & Android permissions state
  const [isNearbyAvailable, setIsNearbyAvailable] = useState<boolean>(false);
  const [isMeshActive, setIsMeshActive] = useState<boolean>(() => nearbyTransport.isMeshRunning);
  const [discoveredPeers, setDiscoveredPeers] = useState<PeerInfo[]>([]);
  const [permStatus, setPermStatus] = useState<MeshPermissionsStatus | null>(null);
  const [nearbyStatusMsg, setNearbyStatusMsg] = useState<string | null>(() =>
    nearbyTransport.isMeshRunning
      ? 'Mesh active! Background syncing automatically across nearby peers.'
      : null
  );

  useEffect(() => {
    setIsMeshActive(nearbyTransport.isMeshRunning);
    nearbyTransport.isAvailable().then((avail) => {
      setIsNearbyAvailable(avail);
      if (avail) {
        PermissionsManager.checkStatus().then(setPermStatus);
      }
    });

    nearbyTransport.onPeerFound((peer) => {
      setDiscoveredPeers((prev) => {
        if (prev.some((p) => p.id === peer.id)) return prev;
        return [...prev, peer];
      });
      setNearbyStatusMsg(`Discovered peer ${peer.name || peer.id}! Connecting & syncing in background...`);
    });

    nearbyTransport.onSyncCompleted(({ peerId, result }) => {
      setNearbyStatusMsg(
        `✅ Synced with peer ${peerId}: received ${result.receivedCount} new reports, sent ${result.sentCount}!`
      );
    });
  }, []);

  const handleToggleMesh = async () => {
    try {
      if (isMeshActive) {
        await nearbyTransport.stopDiscovery();
        setIsMeshActive(false);
        setNearbyStatusMsg('Background mesh stopped.');
      } else {
        await nearbyTransport.startDiscovery();
        setIsMeshActive(true);
        setNearbyStatusMsg('Mesh active! Foreground service running with screen-off sync.');
      }
    } catch (err: any) {
      setNearbyStatusMsg(`Mesh error: ${err.message}`);
    }
  };

  const handleRequestPermissions = async () => {
    const updated = await PermissionsManager.requestAll();
    setPermStatus(updated);
  };

  // Load QR code when opening QR tab
  useEffect(() => {
    if (activeTab === 'qr') {
      generateQrSyncDataUrl()
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [activeTab]);

  // Tab-to-tab sync via BroadcastChannel for instant testing in multiple browser tabs
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('meshmap_p2p_sync_channel');

    channel.onmessage = async (e) => {
      if (e.data && e.data.type === 'SYNC_BUNDLE' && typeof e.data.payload === 'string') {
        const res = await importFileBundle(e.data.payload);
        if (res.importedCount > 0) {
          setTabSyncMsg(`Received and imported ${res.importedCount} new events from peer tab!`);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const handleExportFile = () => {
    downloadFileBundle();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(null);
    setTabSyncMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = await importFileBundle(content);
        setImportStatus(result);
      } catch (err: any) {
        setImportStatus({
          totalInFile: 0,
          importedCount: 0,
          duplicateCount: 0,
          rejectedCount: 1,
          errors: [err.message || 'Failed reading file'],
        });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDirectTabSync = () => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('meshmap_p2p_sync_channel');
    const bundleStr = createFileBundle();
    channel.postMessage({ type: 'SYNC_BUNDLE', payload: bundleStr });
    channel.close();
    setTabSyncMsg('Broadcasted all local reports to other open browser tabs!');
  };

  const handleImportQr = async () => {
    if (!qrInputText.trim()) return;
    setIsProcessing(true);
    try {
      const res = await importFromQrText(qrInputText.trim());
      setImportStatus(res);
      setQrInputText('');
    } catch (err: any) {
      setImportStatus({
        totalInFile: 0,
        importedCount: 0,
        duplicateCount: 0,
        rejectedCount: 1,
        errors: [err.message],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
    >
      <div className="modal-sheet sync-modal-sheet">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🔄</span>
            <div>
              <h2 id="sync-modal-title" className="modal-title">
                P2P Peer Sync
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Radio-Agnostic · Zero Internet · File & QR
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Close sync modal"
          >
            ✕
          </button>
        </div>

        {/* Segmented Control */}
        <div className="segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'file'}
            className={`segmented-btn ${activeTab === 'file' ? 'active resource' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            📁 File Bundle (AirDrop / Share)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'qr'}
            className={`segmented-btn ${activeTab === 'qr' ? 'active resource' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            📷 QR Optical Frame
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'nearby'}
            className={`segmented-btn ${activeTab === 'nearby' ? 'active resource' : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            📡 Nearby Mesh (Android)
          </button>
        </div>

        {/* Tab 1: File Bundle Sync */}
        {activeTab === 'file' && (
          <div className="sync-section">
            <p className="sync-instruction">
              Export all local reports as a signed bundle to share with nearby peers via Nearby
              Share, Bluetooth, AirDrop, or USB.
            </p>

            <div className="sync-buttons-grid">
              <button
                type="button"
                className="action-btn-large confirm-btn"
                onClick={handleExportFile}
                aria-label="Export sync bundle file"
              >
                <span className="btn-icon">📥</span>
                <div className="btn-text-col">
                  <strong>Export Sync File</strong>
                  <span className="btn-subtext">Download meshmap-sync.json</span>
                </div>
              </button>

              <button
                type="button"
                className="action-btn-large resolve-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                aria-label="Import sync bundle file"
              >
                <span className="btn-icon">📤</span>
                <div className="btn-text-col">
                  <strong>{isProcessing ? 'Importing...' : 'Import Sync File'}</strong>
                  <span className="btn-subtext">Select .json from peer</span>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* Quick multi-tab live sync button */}
            <div className="tab-sync-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#38bdf8' }}>
                    ⚡ Multi-Tab Instant Test Sync
                  </strong>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Broadcast local reports to other open browser tabs
                  </div>
                </div>
                <button
                  type="button"
                  className="filter-chip active"
                  style={{ minHeight: '36px' }}
                  onClick={handleDirectTabSync}
                >
                  Sync Open Tabs
                </button>
              </div>
              {tabSyncMsg && (
                <div className="status-pill pill-blue" style={{ marginTop: '8px' }}>
                  ℹ️ {tabSyncMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: QR Optical Frame */}
        {activeTab === 'qr' && (
          <div className="sync-section">
            <p className="sync-instruction">
              Show this QR code to a peer phone or paste a scanned QR payload to import events
              without any physical media.
            </p>

            {qrDataUrl && (
              <div className="qr-container">
                <img
                  src={qrDataUrl}
                  alt="MeshMap P2P Sync QR Frame"
                  className="qr-image"
                />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Scan with peer camera or optical scanner
                </span>
              </div>
            )}

            <div className="qr-input-row">
              <input
                type="text"
                className="text-input"
                placeholder="Paste scanned QR text payload..."
                value={qrInputText}
                onChange={(e) => setQrInputText(e.target.value)}
              />
              <button
                type="button"
                className="action-btn primary"
                style={{ flex: 'none', minWidth: '90px' }}
                onClick={handleImportQr}
                disabled={isProcessing || !qrInputText.trim()}
              >
                Import
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Android Nearby Connections & Screen-Off Sync */}
        {activeTab === 'nearby' && (
          <div className="sync-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Autonomous Screen-Off Mesh</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Google Nearby Connections (P2P Cluster) · Screen-Off Foreground Service
                </div>
              </div>
              <span className={`status-badge ${isMeshActive ? 'status-green' : 'status-gray'}`}>
                {isMeshActive ? 'MESH ACTIVE' : 'STANDBY'}
              </span>
            </div>

            {/* Toggle Switch Button */}
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className={`action-btn-large ${isMeshActive ? 'resolve-btn' : 'confirm-btn'}`}
                onClick={handleToggleMesh}
              >
                <span className="btn-icon">{isMeshActive ? '⏹️' : '▶️'}</span>
                <div className="btn-text-col">
                  <strong>{isMeshActive ? 'Stop Mesh Discovery' : 'Start Background Mesh'}</strong>
                  <span className="btn-subtext">
                    {isMeshActive
                      ? 'Release radio & foreground service'
                      : 'Keep radio listening with screen locked'}
                  </span>
                </div>
              </button>
            </div>

            {nearbyStatusMsg && (
              <div className="status-pill pill-blue" style={{ marginTop: '10px' }}>
                ℹ️ {nearbyStatusMsg}
              </div>
            )}

            {/* Discovered Peers */}
            <div style={{ marginTop: '16px' }}>
              <strong style={{ fontSize: '13px' }}>
                Discovered Mesh Peers ({discoveredPeers.length})
              </strong>
              {discoveredPeers.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  No nearby phones in radio range currently. Walk within 50m of another phone.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {discoveredPeers.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#1e293b',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong>{p.name || p.id}</strong>
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>ID: {p.id}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="status-badge status-green">CONNECTED</span>
                        <button
                          type="button"
                          className="filter-chip active"
                          style={{ minHeight: '28px', fontSize: '11px' }}
                          onClick={async () => {
                            setNearbyStatusMsg(`Manual sync requested with ${p.id}...`);
                            try {
                              const res = await nearbyTransport.syncWithPeer(p.id);
                              if (res) {
                                setNearbyStatusMsg(`Sync done: received ${res.receivedCount}, sent ${res.sentCount}`);
                              } else {
                                setNearbyStatusMsg(`Sync already in progress or session busy.`);
                              }
                            } catch (e: any) {
                              setNearbyStatusMsg(`Sync error: ${e.message}`);
                            }
                          }}
                        >
                          Sync Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions Explanations Accordion/Cards */}
            <div style={{ marginTop: '18px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px' }}>Required Android Permissions</strong>
                <button
                  type="button"
                  className="filter-chip active"
                  style={{ minHeight: '30px', fontSize: '11px' }}
                  onClick={handleRequestPermissions}
                >
                  Grant Permissions
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {PERMISSION_EXPLANATIONS.map((perm) => {
                  const isGranted = permStatus ? permStatus[perm.id] : false;
                  return (
                    <div
                      key={perm.id}
                      style={{
                        padding: '10px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{perm.icon}</span>
                          <strong>{perm.title}</strong>
                        </div>
                        <span className={`status-badge ${isGranted ? 'status-green' : 'status-amber'}`}>
                          {isGranted ? 'GRANTED' : 'REQUIRED'}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '11px', lineHeight: 1.4 }}>
                        {perm.purpose}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Import Results Notification Box */}
        {importStatus && (
          <div
            className={`import-status-box ${
              importStatus.rejectedCount > 0 ? 'has-errors' : 'success'
            }`}
            role="status"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{importStatus.rejectedCount > 0 ? '⚠️' : '✅'}</span>
              <strong>
                Import Complete: {importStatus.importedCount} new events added
              </strong>
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
              Total in bundle: {importStatus.totalInFile} · Duplicates skipped:{' '}
              {importStatus.duplicateCount} · Rejected: {importStatus.rejectedCount}
            </div>
            {importStatus.errors.length > 0 && (
              <ul className="import-errors-list">
                {importStatus.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

