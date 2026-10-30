// ─────────────────────────────────────────────────────────────────────────────
// CycloneMap — MapLibre GL map showing Fani track, assets, blocks, roads
// Uses OpenStreetMap raster tiles (offline-safe for local caching)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { HazardEvent, StrategicAsset, BlockRisk } from '../../types';

const ASSET_ICONS: Record<string, string> = {
  hospital:     '🏥',
  shelter:      '🏠',
  ndrf_base:    '🪖',
  relief_depot: '📦',
  port:         '⚓',
  fuel_depot:   '⛽',
};

const ASSET_COLORS: Record<string, string> = {
  hospital:     '#ef4444',
  shelter:      '#3b82f6',
  ndrf_base:    '#10b981',
  relief_depot: '#f59e0b',
  port:         '#8b5cf6',
  fuel_depot:   '#f97316',
};

interface Props {
  event: HazardEvent;
  assets: StrategicAsset[];
  blocks: BlockRisk[];
  selectedBlockId: string | null;
  onBlockClick: (id: string) => void;
}

export default function CycloneMap({ event, assets, blocks, selectedBlockId, onBlockClick }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // ── Cleanup markers ──────────────────────────────────────────────────────
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.3 } }],
        background: { id: 'bg', type: 'background' } as unknown as maplibregl.LayerSpecification,
      } as maplibregl.StyleSpecification,
      center: [85.8, 19.8],
      zoom: 6.5,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      addLayers(map);
    });

    return () => {
      clearMarkers();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render when data changes ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateLayers(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, assets, blocks, selectedBlockId]);

  function addLayers(map: maplibregl.Map) {
    // Cyclone track line
    if (!map.getSource('track')) {
      map.addSource('track', {
        type: 'geojson',
        data: buildTrackGeoJSON(),
      });
      map.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        paint: {
          'line-color': '#a855f7',
          'line-width': 3,
          'line-dasharray': [4, 2],
          'line-opacity': 0.9,
        },
      });
    }

    // Wind footprint circle
    if (!map.getSource('footprint')) {
      map.addSource('footprint', {
        type: 'geojson',
        data: buildFootprintGeoJSON(),
      });
      map.addLayer({
        id: 'footprint-fill',
        type: 'fill',
        source: 'footprint',
        paint: { 'fill-color': '#f97316', 'fill-opacity': 0.08 },
      });
      map.addLayer({
        id: 'footprint-line',
        type: 'line',
        source: 'footprint',
        paint: { 'line-color': '#f97316', 'line-width': 1.5, 'line-opacity': 0.5, 'line-dasharray': [3, 3] },
      });
    }

    // Block centroids
    if (!map.getSource('blocks')) {
      map.addSource('blocks', { type: 'geojson', data: buildBlocksGeoJSON() });
      map.addLayer({
        id: 'blocks-circle',
        type: 'circle',
        source: 'blocks',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 50, 8, 100, 18],
          'circle-color': [
            'case',
            ['==', ['get', 'tier'], 'CRITICAL'], '#ef4444',
            ['==', ['get', 'tier'], 'HIGH'],     '#f97316',
            ['==', ['get', 'tier'], 'MODERATE'], '#eab308',
            '#6b7280',
          ],
          'circle-opacity': ['case', ['==', ['get', 'id'], selectedBlockId ?? ''], 1, 0.7],
          'circle-stroke-width': ['case', ['==', ['get', 'id'], selectedBlockId ?? ''], 3, 1],
          'circle-stroke-color': '#fff',
        },
      });
      map.addLayer({
        id: 'blocks-label',
        type: 'symbol',
        source: 'blocks',
        layout: {
          'text-field': ['concat', '#', ['get', 'rank'], ' ', ['get', 'block_name']],
          'text-size': 10,
          'text-offset': [0, 1.8],
          'text-font': ['Open Sans Regular'],
        },
        paint: { 'text-color': '#e5e7eb', 'text-halo-color': '#111827', 'text-halo-width': 1.5 },
      });

      map.on('click', 'blocks-circle', (e) => {
        const f = e.features?.[0];
        if (f?.properties?.id) onBlockClick(f.properties.id as string);
      });
      map.on('mouseenter', 'blocks-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'blocks-circle', () => { map.getCanvas().style.cursor = ''; });
    }

    // Add asset markers
    addAssetMarkers(map);

    // Add track point markers (eye position)
    addEyeMarker(map);
  }

  function updateLayers(map: maplibregl.Map) {
    (map.getSource('track') as maplibregl.GeoJSONSource)?.setData(buildTrackGeoJSON());
    (map.getSource('footprint') as maplibregl.GeoJSONSource)?.setData(buildFootprintGeoJSON());
    (map.getSource('blocks') as maplibregl.GeoJSONSource)?.setData(buildBlocksGeoJSON());

    if (map.getLayer('blocks-circle')) {
      map.setPaintProperty('blocks-circle', 'circle-opacity',
        ['case', ['==', ['get', 'id'], selectedBlockId ?? ''], 1, 0.7]);
      map.setPaintProperty('blocks-circle', 'circle-stroke-width',
        ['case', ['==', ['get', 'id'], selectedBlockId ?? ''], 3, 1]);
    }
  }

  function buildTrackGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: event.track.map(p => [p.lon, p.lat]),
        },
        properties: { provenance_tag: 'REPLAY' },
      }],
    };
  }

  function buildFootprintGeoJSON(): GeoJSON.FeatureCollection {
    // Approximate 90 km/h wind circle around current eye
    const steps = 64;
    const radiusDeg = 0.9; // ~100 km
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      coords.push([
        event.current_lon + radiusDeg * Math.cos(angle),
        event.current_lat + radiusDeg * Math.sin(angle) * 0.85,
      ]);
    }
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: { provenance_tag: 'MODEL_ESTIMATE' },
      }],
    };
  }

  function buildBlocksGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: blocks.map(b => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [b.lon, b.lat] },
        properties: { id: b.id, block_name: b.block_name, score: b.score, tier: b.tier, rank: b.rank },
      })),
    };
  }

  function addAssetMarkers(map: maplibregl.Map) {
    clearMarkers();
    assets.forEach(asset => {
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center w-7 h-7 rounded-full border-2 cursor-pointer text-sm shadow-lg transition-transform hover:scale-110';
      el.style.backgroundColor = ASSET_COLORS[asset.type] + '33';
      el.style.borderColor = ASSET_COLORS[asset.type];
      el.textContent = ASSET_ICONS[asset.type] ?? '📍';
      el.title = `${asset.name} [${asset.type}] — ${asset.provenance_tag}`;
      if (asset.exposed) {
        el.style.animation = 'pulse 2s infinite';
        el.style.boxShadow = `0 0 8px ${ASSET_COLORS[asset.type]}80`;
      }

      const popup = new maplibregl.Popup({ offset: 12, closeButton: false, className: 'suraksha-popup' })
        .setHTML(`
          <div style="background:#1c1f2b;border:1px solid #374151;padding:8px 10px;border-radius:6px;min-width:160px">
            <div style="font-weight:700;color:#f9fafb;font-size:12px;margin-bottom:4px">${asset.name}</div>
            <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">${asset.type}</div>
            <div style="color:${asset.exposed ? '#f97316' : '#10b981'};font-size:10px;margin-top:4px;font-family:monospace">
              ${asset.exposed ? '⚠ EXPOSED' : '✓ OUT OF FOOTPRINT'}
            </div>
            <div style="color:#6b7280;font-size:9px;margin-top:4px">Criticality: ${asset.criticality}/5.0</div>
            <div style="margin-top:4px;padding:2px 6px;background:#312e81;color:#a5b4fc;border-radius:12px;font-size:9px;display:inline-block;font-family:monospace">${asset.provenance_tag}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([asset.lon, asset.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }

  function addEyeMarker(map: maplibregl.Map) {
    const el = document.createElement('div');
    el.className = 'w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer';
    el.style.background = 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.1) 70%, transparent 100%)';
    el.style.border = '2px solid rgba(168,85,247,0.8)';
    el.style.animation = 'spin 8s linear infinite';
    el.innerHTML = '🌀';
    el.title = `Cyclone FANI Eye | Wind: ${event.wind_kmh} km/h | REPLAY`;

    const eyeMarker = new maplibregl.Marker({ element: el })
      .setLngLat([event.current_lon, event.current_lat])
      .setPopup(
        new maplibregl.Popup({ offset: 20, closeButton: false })
          .setHTML(`
            <div style="background:#1c1f2b;border:1px solid #7c3aed;padding:8px 10px;border-radius:6px">
              <div style="font-weight:700;color:#c4b5fd;font-size:12px">Cyclone FANI (Eye)</div>
              <div style="color:#9ca3af;font-size:10px;margin-top:3px">Wind: <b style="color:#f9fafb">${event.wind_kmh} km/h</b></div>
              <div style="color:#9ca3af;font-size:10px">Speed: <b style="color:#f9fafb">${event.speed_kmh} km/h</b></div>
              <div style="color:#9ca3af;font-size:10px">Landfall: <b style="color:#f9fafb">${event.landfall_location}</b></div>
              <div style="margin-top:4px;padding:2px 6px;background:#312e81;color:#a5b4fc;border-radius:12px;font-size:9px;display:inline-block;font-family:monospace">REPLAY</div>
            </div>
          `)
      )
      .addTo(map);
    markersRef.current.push(eyeMarker);
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map legend */}
      <div className="absolute bottom-3 left-3 bg-[#0f1117]/90 border border-white/10 rounded-lg p-2.5 text-xs space-y-1.5 backdrop-blur-sm">
        <div className="text-white/50 font-mono text-[10px] uppercase tracking-widest mb-1">Legend</div>
        {[
          { color: '#a855f7', dash: true, label: 'Track [REPLAY]' },
          { color: '#f97316', dash: true, label: '90 km/h footprint [MODEL_ESTIMATE]' },
          { color: '#ef4444', label: 'CRITICAL block' },
          { color: '#f97316', label: 'HIGH block' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-4 h-0.5 flex-shrink-0" style={{ backgroundColor: item.color, borderTop: item.dash ? `1.5px dashed ${item.color}` : undefined }} />
            <span className="text-white/60">{item.label}</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(ASSET_ICONS).map(([type, icon]) => (
            <span key={type} title={type} className="text-sm">{icon}</span>
          ))}
          <span className="text-white/40 text-[10px] ml-1">assets [OBSERVED]</span>
        </div>
      </div>

      {/* Offline mode indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-mono px-2 py-1 rounded backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        REPLAY: CYCLONE FANI (May 2019)
      </div>
    </div>
  );
}
