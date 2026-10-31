import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { eventStore } from './data/eventStore';
import { reduceFeatures, type FeatureState } from './domain/statusEngine';
import type { MeshEvent } from './domain/types';
import { FilterBar, type FilterState } from './ui/FilterBar';
import { ReportModal } from './ui/ReportModal';
import { BottomSheet } from './ui/BottomSheet';
import { HandbookModal } from './ui/HandbookModal';
import { SosModal } from './ui/SosModal';
import { SyncModal } from './ui/SyncModal';
import { OnboardingModal } from './ui/OnboardingModal';
import { nearbyTransport, MeshNative } from './transports/nearby';
import { PermissionsManager } from './transports/permissions';

// Default center: Punjab, India [lon, lat]
const FALLBACK_CENTER: [number, number] = [75.4000, 31.0250];
const DEFAULT_CENTER: [number, number] = [75.4000, 31.0250];
const DEFAULT_ZOOM = 9;

// Helper to render static SVG string for custom MapLibre DOM markers
function createMarkerHtml(feature: FeatureState): string {
  const statusCornerIcon =
    feature.status === 'resolved'
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : feature.status === 'closed'
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : feature.status === 'disputed'
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

  // Generic clean SVG icon representing feature kind
  const iconSvg =
    feature.kind === 'RESOURCE'
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  return `
    <div class="marker-badge-corner" aria-hidden="true">${statusCornerIcon}</div>
    <div style="display: flex; align-items: center; justify-content: center;" aria-hidden="true">${iconSvg}</div>
  `;
}

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapStyleMode, setMapStyleMode] = useState<'offline' | 'online'>('offline');

  // Connection & GPS states
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lon: number;
    accuracy?: number;
  } | null>(null);
  const [tileMetadata, setTileMetadata] = useState<string>('Punjab Offline Vector Map (100% Offline)');
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Event & Feature state
  const [events, setEvents] = useState<MeshEvent[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [isHandbookOpen, setIsHandbookOpen] = useState<boolean>(false);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [isSyncOpen, setIsSyncOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('meshmap_onboarded') !== 'true';
    } catch {
      return false;
    }
  });

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    minSeverity: 0,
    timeWindow: 'all',
  });

  // Report Modal state
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    lat: number;
    lon: number;
  }>({
    isOpen: false,
    lat: DEFAULT_CENTER[1],
    lon: DEFAULT_CENTER[0],
  });

  // Track online / airplane mode status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to EventStore — wait for IDB init so we show persisted events immediately
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    eventStore.ready.then(() => {
      unsubscribe = eventStore.subscribe((allEvents) => {
        setEvents(allEvents);
      });
    });
    return () => { unsubscribe?.(); };
  }, []);

  // Autonomous screen-off background mesh discovery & sync (SRS §7 & FR-24)
  useEffect(() => {
    nearbyTransport.isAvailable().then(async (available) => {
      if (available) {
        try {
          const perms = await PermissionsManager.checkStatus();
          if (perms.allGranted) {
            console.info('[App] Autonomous mesh starting in background...');
            await nearbyTransport.startDiscovery();
          }
        } catch (err) {
          console.warn('[App] Error starting autonomous background mesh:', err);
        }
      }
    });
  }, []);

  // Compute all features
  const allFeatures = useMemo(() => {
    return reduceFeatures(events);
  }, [events]);

  // Compute filtered features
  const filteredFeatures = useMemo(() => {
    return allFeatures.filter((f) => {
      // 1. Type / Category
      if (filters.type === 'hazards' && f.kind !== 'HAZARD') return false;
      if (filters.type === 'resources' && f.kind !== 'RESOURCE') return false;

      // 2. Severity
      if (filters.minSeverity > 0 && f.severity < filters.minSeverity) return false;

      // 3. Time window
      if (filters.timeWindow !== 'all') {
        const itemMs = new Date(f.updatedAt).getTime();
        const nowMs = Date.now();
        const maxAgeMs =
          filters.timeWindow === '6h' ? 6 * 3600 * 1000 : 24 * 3600 * 1000;
        if (nowMs - itemMs > maxAgeMs) return false;
      }

      return true;
    });
  }, [allFeatures, filters]);

  // The active selected feature for the bottom sheet
  const selectedFeature = useMemo(() => {
    if (!selectedFeatureId) return null;
    return allFeatures.find((f) => f.feature_id === selectedFeatureId) || null;
  }, [allFeatures, selectedFeatureId]);

  // Map initialization with Real OpenStreetMap & Offline PMTiles
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const pmtilesUrl = `${window.location.origin}/tiles/sample.pmtiles`;
    const p = new pmtiles.PMTiles(pmtilesUrl);
    protocol.add(p);

    let initialCenter = DEFAULT_CENTER;
    let initialZoom = DEFAULT_ZOOM;

    const initMap = () => {
      if (!mapContainer.current) return;

      const basemapLayers = layers('protomaps', namedFlavor('dark'));

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm-online': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
              maxzoom: 19,
            },
            protomaps: {
              type: 'vector',
              url: `pmtiles://${pmtilesUrl}`,
              attribution: '© OpenStreetMap contributors · PMTiles Punjab Offline',
            },
          },
          layers: [
            ...basemapLayers,
            {
              id: 'osm-online-layer',
              type: 'raster',
              source: 'osm-online',
              minzoom: 0,
              maxzoom: 19,
              layout: {
                visibility: 'none',
              },
            },
          ],
        },
        center: initialCenter,
        zoom: initialZoom,
        maxZoom: 19,
        minZoom: 2,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
      });

      geolocate.on('geolocate', (e: any) => {
        const { latitude, longitude, accuracy } = e.coords;
        setGpsLocation({ lat: latitude, lon: longitude, accuracy });
      });

      map.addControl(geolocate, 'bottom-right');

      // Automatically request and fly to real GPS location on startup
      const fetchCurrentGps = async () => {
        try {
          if (await nearbyTransport.isAvailable()) {
            const loc = await MeshNative.getCurrentLocation();
            if (loc && loc.lat && loc.lon) {
              setGpsLocation(loc);
              map.flyTo({ center: [loc.lon, loc.lat], zoom: 16, essential: true });
              return;
            }
          }
        } catch {}

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              };
              setGpsLocation(loc);
              map.flyTo({ center: [loc.lon, loc.lat], zoom: 16, essential: true });
            },
            (err) => {
              console.warn('[GPS] Initial location lookup failed or pending permission:', err);
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      };

      // WebGL Context Loss Recovery for budget / power-saving devices
      try {
        const canvas = map.getCanvas();
        canvas.addEventListener('webglcontextlost', (e) => {
          console.warn('[MapLibre] WebGL context lost. Preventing default to allow recovery.');
          e.preventDefault();
        });
        canvas.addEventListener('webglcontextrestored', () => {
          console.info('[MapLibre] WebGL context restored. Triggering map resize.');
          map.resize();
        });
      } catch (e) {
        // Ignore canvas event listener failure
      }

      // Long press / right click on map -> Open Report Form
      map.on('contextmenu', (e) => {
        e.preventDefault();
        setReportModal({
          isOpen: true,
          lat: e.lngLat.lat,
          lon: e.lngLat.lng,
        });
      });

      // Touch long-press detector for mobile
      let touchTimer: ReturnType<typeof setTimeout> | null = null;
      let touchStartPos: { x: number; y: number } | null = null;

      map.on('touchstart', (e: any) => {
        if (!e.points || e.points.length !== 1) return;
        const pt = e.points[0];
        touchStartPos = { x: pt.x, y: pt.y };
        touchTimer = setTimeout(() => {
          const lngLat = map.unproject([pt.x, pt.y]);
          setReportModal({
            isOpen: true,
            lat: lngLat.lat,
            lon: lngLat.lng,
          });
        }, 600); // 600ms hold
      });

      map.on('touchmove', (e: any) => {
        if (touchTimer && touchStartPos && e.points && e.points.length > 0) {
          const pt = e.points[0];
          const dist = Math.hypot(pt.x - touchStartPos.x, pt.y - touchStartPos.y);
          if (dist > 10) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
        }
      });

      map.on('touchend', () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      });

      mapRef.current = map;
      map.on('load', () => {
        map.resize();
        setIsMapReady(true);
        setTileMetadata('Punjab Offline Vector Map (100% Offline)');
        fetchCurrentGps();
      });
      if (map.loaded()) {
        map.resize();
        setIsMapReady(true);
        setTileMetadata('Punjab Offline Vector Map (100% Offline)');
        fetchCurrentGps();
      } else {
        setTimeout(() => {
          map.resize();
          setIsMapReady(true);
          setTileMetadata('Punjab Offline Vector Map (100% Offline)');
          fetchCurrentGps();
        }, 200);
      }
    };

    p.getHeader()
      .then((header) => {
        setTileMetadata(
          `Punjab Offline Vector Map · PMTiles v${header.specVersion}`
        );
      })
      .catch((err) => {
        console.warn('Failed to read PMTiles header, using defaults:', err);
        setTileMetadata('Punjab Offline Vector Map');
      })
      .finally(() => {
        initMap();
      });

    return () => {
      setIsMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  // Synchronize Markers with Filtered Features
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const currentMarkers = markersRef.current;
    const activeFeatureIds = new Set(filteredFeatures.map((f) => f.feature_id));

    // Remove markers that are no longer active/filtered
    for (const [id, marker] of currentMarkers.entries()) {
      if (!activeFeatureIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    filteredFeatures.forEach((feat) => {
      const existing = currentMarkers.get(feat.feature_id);

      if (existing) {
        // Update DOM element classes & icon
        const el = existing.getElement();
        el.className = `mesh-marker marker-${feat.color}`;
        el.setAttribute(
          'aria-label',
          `${feat.statusLabel}: ${feat.type.replace(/_/g, ' ')} (${feat.trustLabel})`
        );
        el.innerHTML = createMarkerHtml(feat);
      } else {
        // Create new DOM element for marker
        const el = document.createElement('div');
        el.className = `mesh-marker marker-${feat.color}`;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute(
          'aria-label',
          `${feat.statusLabel}: ${feat.type.replace(/_/g, ' ')} (${feat.trustLabel})`
        );
        el.innerHTML = createMarkerHtml(feat);

        // Click / Enter listener to open bottom sheet
        const handleOpen = (e: Event) => {
          e.stopPropagation();
          setSelectedFeatureId(feat.feature_id);
        };
        el.addEventListener('click', handleOpen);
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen(e);
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([feat.lon, feat.lat])
          .addTo(map);

        currentMarkers.set(feat.feature_id, marker);
      }
    });
  }, [filteredFeatures, isMapReady]);

  // Synchronize User Location GPS marker (pulsing blue beacon)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !gpsLocation) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-gps-marker';
      el.innerHTML = '<div class="user-gps-pulse"></div><div class="user-gps-dot"></div>';
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([gpsLocation.lon, gpsLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([gpsLocation.lon, gpsLocation.lat]);
    }
  }, [gpsLocation, isMapReady]);

  // Center on User GPS Location
  const handleCenterOnLocation = useCallback(async () => {
    if (gpsLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [gpsLocation.lon, gpsLocation.lat],
        zoom: 16,
        essential: true,
      });
      return;
    }

    try {
      if (await nearbyTransport.isAvailable()) {
        const loc = await MeshNative.getCurrentLocation();
        if (loc && loc.lat && loc.lon) {
          setGpsLocation(loc);
          mapRef.current?.flyTo({ center: [loc.lon, loc.lat], zoom: 16, essential: true });
          return;
        }
      }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setGpsLocation(loc);
          mapRef.current?.flyTo({ center: [loc.lon, loc.lat], zoom: 16, essential: true });
        },
        (err) => {
          console.warn('[GPS] Position lookup warning:', err);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [gpsLocation]);

  // Toggle Map Style: Punjab Offline Vector / OpenStreetMap Online
  const handleToggleMapStyle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (mapStyleMode === 'offline') {
      try {
        map.setLayoutProperty('osm-online-layer', 'visibility', 'visible');
      } catch {}
      setMapStyleMode('online');
      setTileMetadata('OpenStreetMap Online (No API Key Required)');
    } else {
      try {
        map.setLayoutProperty('osm-online-layer', 'visibility', 'none');
      } catch {}
      setMapStyleMode('offline');
      setTileMetadata('Punjab Offline Vector Map (100% Offline)');
    }
  }, [mapStyleMode]);

  // "Report Here" FAB button handler - defaults directly to current GPS position
  const handleOpenReportHere = useCallback(() => {
    let lat = DEFAULT_CENTER[1];
    let lon = DEFAULT_CENTER[0];

    if (gpsLocation) {
      lat = gpsLocation.lat;
      lon = gpsLocation.lon;
    } else if (mapRef.current) {
      const center = mapRef.current.getCenter();
      lat = center.lat;
      lon = center.lng;
    }

    setReportModal({
      isOpen: true,
      lat,
      lon,
    });
  }, [gpsLocation]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Top Status Bar */}
      <div className="status-bar">
        <div className="status-badge">
          <span className={`indicator ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'ONLINE' : 'AIRPLANE / OFFLINE MODE'}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: '#38bdf8' }}>{tileMetadata}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="sync-pill-btn"
            onClick={() => setIsSyncOpen(true)}
            aria-label="Open peer-to-peer sync"
          >
            <span>🔄</span>
            <span>Sync</span>
          </button>
          <button
            type="button"
            className="sos-pill-btn"
            onClick={() => setIsSosOpen(true)}
            aria-label="Open emergency SOS dispatch"
          >
            <span>🆘</span>
            <span>SOS</span>
          </button>
          <button
            type="button"
            className="handbook-pill-btn"
            onClick={() => setIsHandbookOpen(true)}
            aria-label="Open offline first-aid handbook"
          >
            <span>🚑</span>
            <span>First Aid</span>
          </button>
          <div className="attribution-badge">MeshMap PWA · PMTiles Offline</div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalFeaturesCount={allFeatures.length}
        filteredCount={filteredFeatures.length}
      />

      {/* Map Canvas */}
      <div ref={mapContainer} className="map-container" />

      {/* Floating Tools: Center on My Location & Switch Map Layer */}
      <div className="map-floating-tools">
        <button
          type="button"
          className="map-tool-btn"
          onClick={handleCenterOnLocation}
          aria-label="Center on my current location"
        >
          <span style={{ fontSize: '15px' }}>📍</span>
          <span>My Location</span>
        </button>
        <button
          type="button"
          className="map-tool-btn"
          onClick={handleToggleMapStyle}
          aria-label="Toggle map style"
        >
          <span style={{ fontSize: '15px' }}>🗺️</span>
          <span>{mapStyleMode === 'offline' ? 'Punjab Offline' : 'OSM Online'}</span>
        </button>
      </div>

      {/* Bottom Floating Action Button (Report Here) */}
      <div className="fab-container">
        <button
          type="button"
          className="report-fab-btn"
          onClick={handleOpenReportHere}
          aria-label="Report an incident or available resource at this location"
        >
          <span style={{ fontSize: '20px' }}>📍</span>
          <span>+ Report Here</span>
        </button>
      </div>

      {/* Bottom Sheet for Selected Feature */}
      {selectedFeature && (
        <BottomSheet
          feature={selectedFeature}
          onClose={() => setSelectedFeatureId(null)}
        />
      )}

      {/* Report Creation Modal */}
      <ReportModal
        isOpen={reportModal.isOpen}
        onClose={() => setReportModal((prev) => ({ ...prev, isOpen: false }))}
        lat={reportModal.lat}
        lon={reportModal.lon}
        onCreated={(newEvent) => {
          setSelectedFeatureId(newEvent.feature_id);
        }}
      />

      {/* Offline First-Aid Handbook */}
      <HandbookModal
        isOpen={isHandbookOpen}
        onClose={() => setIsHandbookOpen(false)}
      />

      {/* Emergency SOS Modal & Stepper */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        userCoords={{
          lat: gpsLocation?.lat || DEFAULT_CENTER[1],
          lon: gpsLocation?.lon || DEFAULT_CENTER[0],
        }}
      />

      {/* P2P Peer Sync Modal */}
      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
      />

      {/* Onboarding Flow: Map Precache & Permissions */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
