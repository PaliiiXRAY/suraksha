// ─────────────────────────────────────────────────────────────────────────────
// GISOverlayMap.tsx — Interactive Leaflet + OpenStreetMap GIS Engine
// Renders Odisha coastal block boundaries, cyclone trajectory, danger swath,
// strategic assets, and route cutoff status directly on real OSM tiles.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapTheme = 'colour' | 'terrain' | 'dark';

const THEMES: Record<MapTheme, { url: string; options: L.TileLayerOptions }> = {
  colour: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  terrain: {
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 17,
      attribution: 'Map: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap',
    },
  },
  dark: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 18,
      className: 'map-tiles-dark',
      attribution: '&copy; OpenStreetMap contributors &mdash; Tactical Dark',
    },
  },
};

interface Props {
  selectedBlockId?: string;
  onSelectBlock?: (id: string) => void;
  filter?: string;
  windSpeed?: number;
  highlightBrahmagiri?: boolean;
}

// Odisha Coastal Blocks Geo-Polygons (Lat, Lng coordinates)
const BLOCK_POLYGONS: Record<string, { name: string; district: string; score: number; coords: [number, number][] }> = {
  brahmagiri: {
    name: 'Brahmagiri',
    district: 'Puri District',
    score: 92,
    coords: [
      [19.88, 85.65],
      [19.82, 85.75],
      [19.74, 85.82],
      [19.71, 85.75],
      [19.75, 85.60],
      [19.85, 85.58],
    ],
  },
  krushnaprasad: {
    name: 'Krushna Prasad',
    district: 'Puri District',
    score: 87,
    coords: [
      [19.75, 85.60],
      [19.71, 85.75],
      [19.60, 85.55],
      [19.55, 85.40],
      [19.65, 85.35],
      [19.73, 85.48],
    ],
  },
  puri_sadar: {
    name: 'Puri Sadar',
    district: 'Puri District',
    score: 84,
    coords: [
      [19.88, 85.75],
      [19.85, 85.88],
      [19.79, 85.85],
      [19.74, 85.82],
      [19.82, 85.75],
    ],
  },
  astaranga: {
    name: 'Astaranga',
    district: 'Puri District',
    score: 73,
    coords: [
      [19.95, 86.15],
      [19.98, 86.28],
      [19.88, 86.32],
      [19.84, 86.20],
      [19.89, 86.12],
    ],
  },
  erasama: {
    name: 'Erasama',
    district: 'Jagatsinghpur District',
    score: 79,
    coords: [
      [20.08, 86.40],
      [20.18, 86.55],
      [20.10, 86.68],
      [20.00, 86.58],
      [20.02, 86.42],
    ],
  },
};

// Cyclone Track Points (May 2019 Fani Replay)
const CYCLONE_TRACK: [number, number][] = [
  [16.5, 84.8],  // Deep Depression
  [17.8, 85.2],  // Severe Cyclonic Storm
  [18.9, 85.5],  // Very Severe
  [19.8, 85.8],  // Landfall near Puri / Brahmagiri
  [20.3, 85.9],  // Weakening inland
  [21.1, 86.3],  // Post-landfall
];

export default function GISOverlayMap({
  selectedBlockId = 'brahmagiri',
  onSelectBlock,
  filter = 'all',
  windSpeed = 215,
  highlightBrahmagiri = true,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<Record<string, L.Polygon>>({});
  const [mapTheme, setMapTheme] = useState<MapTheme>('colour');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map centered on Odisha coastline
    const map = L.map(mapContainerRef.current, {
      center: [19.85, 85.9],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    // Managed tile layer is attached via THEMES[mapTheme] effect

    // Threat Swath Cone (Bay of Bengal landfall danger area)
    const swathCoords: [number, number][] = [
      [18.2, 85.1],
      [20.5, 84.5],
      [20.8, 86.8],
      [18.8, 87.2],
    ];
    L.polygon(swathCoords, {
      color: '#f97316',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#ef4444',
      fillOpacity: 0.15,
    }).addTo(map).bindTooltip('High Storm Surge & Wind Impact Swath', { sticky: true });

    // Draw Cyclone Track Line
    L.polyline(CYCLONE_TRACK, {
      color: '#dc2626',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.9,
    }).addTo(map);

    // Track points
    CYCLONE_TRACK.forEach((pt, idx) => {
      const isLandfall = idx === 3;
      L.circleMarker(pt, {
        radius: isLandfall ? 9 : 5,
        color: isLandfall ? '#b91c1c' : '#ea580c',
        weight: isLandfall ? 3 : 2,
        fillColor: isLandfall ? '#ef4444' : '#f97316',
        fillOpacity: 0.9,
      }).addTo(map).bindTooltip(
        isLandfall ? `Landfall Window (Puri/Brahmagiri) · Peak Gusts ${windSpeed} km/h` : `Observation ${idx + 1} (Fani)`,
        { permanent: isLandfall, direction: 'top' }
      );
    });

    // Draw Administrative Blocks
    const polygonLayers: Record<string, L.Polygon> = {};
    Object.entries(BLOCK_POLYGONS).forEach(([id, block]) => {
      const isSelected = id === selectedBlockId;
      const poly = L.polygon(block.coords, {
        color: isSelected ? '#2563eb' : block.score >= 85 ? '#dc2626' : '#f59e0b',
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? '#3b82f6' : block.score >= 85 ? '#ef4444' : '#f59e0b',
        fillOpacity: isSelected ? 0.45 : 0.25,
      }).addTo(map);

      poly.bindTooltip(
        `<strong>${block.name}</strong><br/>${block.district}<br/>Priority Score: <strong>${block.score}/100</strong>`,
        { sticky: true }
      );

      poly.on('click', () => {
        if (onSelectBlock) {
          onSelectBlock(id);
        }
      });

      polygonLayers[id] = poly;
    });
    polygonLayersRef.current = polygonLayers;

    // Draw Arterial Routes
    // NH-316 (Passable: Green)
    const nh316Coords: [number, number][] = [
      [20.29, 85.82], // Bhubaneswar
      [20.12, 85.83], // Pipili
      [19.81, 85.82], // Puri
    ];
    L.polyline(nh316Coords, {
      color: '#10b981',
      weight: 4,
      opacity: 0.85,
    }).addTo(map).bindTooltip('NH-316: Passable (Emergency Convoy Escort)', { sticky: true });

    // Marine Drive (Cut: Red)
    const marineDriveCoords: [number, number][] = [
      [19.80, 85.83], // Puri Beach
      [19.85, 86.01], // Marine Drive
      [19.89, 86.11], // Konark
    ];
    L.polyline(marineDriveCoords, {
      color: '#ef4444',
      weight: 4,
      dashArray: '4, 4',
      opacity: 0.85,
    }).addTo(map).bindTooltip('Puri-Konark Marine Drive: CUT (1.8m Surge Breach at Culvert 14)', { sticky: true });

    // Critical Strategic Asset Markers
    const assets = [
      { name: 'Brahmagiri CHC Hospital', lat: 19.80, lng: 85.68, type: 'hospital' },
      { name: 'Puri Zilla High School Shelter', lat: 19.81, lng: 85.83, type: 'shelter' },
      { name: 'Pipili Central Relief Supply Depot', lat: 20.11, lng: 85.83, type: 'relief' },
      { name: 'Marine Drive Culvert 14 (Breach)', lat: 19.84, lng: 85.95, type: 'hazard' },
    ];

    assets.forEach(a => {
      const color = a.type === 'hospital' ? '#dc2626' : a.type === 'shelter' ? '#2563eb' : a.type === 'relief' ? '#059669' : '#d97706';
      L.circleMarker([a.lat, a.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(map).bindTooltip(`<strong>${a.name}</strong><br/>Category: ${a.type.toUpperCase()}`);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  // Dynamic Basemap Switcher Effect (Colour OSM / Satellite / Tactical Dark)
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = L.tileLayer(THEMES[mapTheme].url, THEMES[mapTheme].options).addTo(mapRef.current);
    tileLayerRef.current = newLayer;
    newLayer.bringToBack();
  }, [mapTheme]);

  // Update selected block styling dynamically when selectedBlockId changes
  useEffect(() => {
    Object.entries(polygonLayersRef.current).forEach(([id, poly]) => {
      const block = BLOCK_POLYGONS[id];
      if (!block) return;
      const isSelected = id === selectedBlockId;
      poly.setStyle({
        color: isSelected ? '#2563eb' : block.score >= 85 ? '#dc2626' : '#f59e0b',
        weight: isSelected ? 3.5 : 1.5,
        fillColor: isSelected ? '#3b82f6' : block.score >= 85 ? '#ef4444' : '#f59e0b',
        fillOpacity: isSelected ? 0.45 : 0.25,
      });
      if (isSelected) {
        poly.bringToFront();
      }
    });
  }, [selectedBlockId]);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col">
      {/* Real Interactive Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />

      {/* Floating Basemap Controls & Status Badges */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 pointer-events-none">
        {/* Interactive Basemap Theme Switcher */}
        <div className="flex items-center bg-black/85 backdrop-blur-md border border-white/20 rounded-lg p-0.5 shadow-lg text-[10px] font-mono pointer-events-auto">
          <button
            type="button"
            onClick={() => setMapTheme('colour')}
            className={`px-2.5 py-1 rounded font-bold transition-all ${
              mapTheme === 'colour' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            🗺️ Colour OSM
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('terrain')}
            className={`px-2.5 py-1 rounded font-bold transition-all ${
              mapTheme === 'terrain' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            ⛰️ Topo
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('dark')}
            className={`px-2.5 py-1 rounded font-bold transition-all ${
              mapTheme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            🌑 Dark
          </button>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-mono font-bold shadow-sm flex items-center gap-1.5 pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          <span>{windSpeed} KM/H GALE</span>
        </span>
      </div>

      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-[#121622]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-md max-w-[260px] pointer-events-auto">
        <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
          ODISHA CYCLONE FOOTPRINT
        </div>
        <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
          Puri & Coastal Blocks Inundation
        </div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-white/50 mt-1">
          Click any block on map to inspect tactical exposure.
        </div>
      </div>
    </div>
  );
}
