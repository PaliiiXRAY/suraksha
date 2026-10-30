// ─────────────────────────────────────────────────────────────────────────────
// GISOverlayMap — High-fidelity GIS polygon map matching Figma / Screen Recording
// Renders Odisha coastal faceted polygons, hazard cone, track, and eye marker
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';

interface Props {
  selectedBlockId?: string;
  onSelectBlock?: (id: string) => void;
  filter?: string;
  windSpeed?: number;
  highlightBrahmagiri?: boolean;
}

export default function GISOverlayMap({
  selectedBlockId = 'brahmagiri',
  onSelectBlock,
  filter = 'all',
  windSpeed = 195,
  highlightBrahmagiri = true,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full min-h-[360px] bg-[#0c0f17] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center select-none">
      {/* Background grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="gis-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gis-grid)" />
      </svg>

      {/* Top-left toggles */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded bg-[#161b26]/90 border border-white/15 text-[11px] font-mono text-white/80 flex items-center gap-1.5 shadow-sm">
          <span className="text-[10px]">👁</span> ODISHA BLOCKS
        </span>
        <span className="px-2.5 py-1 rounded bg-[#161b26]/90 border border-red-500/30 text-[11px] font-mono text-red-400 flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> FANI TRACK
        </span>
      </div>

      {/* Bottom-left landfall projection info */}
      <div className="absolute bottom-3 left-3 z-10 bg-[#121620]/90 backdrop-blur-md border border-white/10 rounded-lg p-3 max-w-[240px] shadow-lg">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider mb-0.5">
          <span>CYCLONE FANI</span>
          <span className="text-white/40">·</span>
          <span>REPLAY</span>
        </div>
        <div className="text-xs font-semibold text-white">Landfall projection: Puri coast</div>
        <div className="text-[11px] font-mono text-white/50 mt-0.5">
          20.19°N, 85.83°E · <span className="text-amber-400 font-bold">{windSpeed} km/h</span>
        </div>
      </div>

      {/* Bottom-right cache tag */}
      <div className="absolute bottom-3 right-3 z-10">
        <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-white/40 uppercase tracking-widest">
          LOCAL TILE CACHE
        </span>
      </div>

      {/* Main SVG Vector Canvas */}
      <svg
        viewBox="0 0 600 420"
        className="w-full h-full max-w-[700px] max-h-[440px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Danger zone radial gradient */}
          <radialGradient id="dangerCone" cx="35%" cy="65%" r="70%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>

          {/* Glowing filter for eye */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Hazard Wind / Surge Danger Swath Sector (expanding eastward into Bay of Bengal) */}
        <polygon
          points="250,285 370,240 450,290 340,340 250,285"
          fill="url(#dangerCone)"
          stroke="#f87171"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.8"
        />

        {/* Cyclone Inflow Radial Fan */}
        <path
          d="M 250 285 L 360 210 A 160 160 0 0 1 380 340 Z"
          fill="#dc2626"
          fillOpacity="0.28"
          stroke="#ef4444"
          strokeWidth="1.2"
        />

        {/* Faceted Block Polygons (Odisha Coastal Region) */}

        {/* 1. CUTTACK (North inland) */}
        <polygon
          points="280,120 340,110 370,165 310,185 270,150"
          fill={hovered === 'cuttack' ? '#273549' : '#1c2433'}
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.4"
          className="cursor-pointer transition-colors"
          onMouseEnter={() => setHovered('cuttack')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectBlock?.('cuttack')}
        />
        <text x="325" y="145" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
          CUTTACK
        </text>

        {/* 2. KHORDHA (Central west) */}
        <polygon
          points="230,195 285,160 310,185 290,240 235,235"
          fill={hovered === 'khordha' ? '#263445' : '#17202d'}
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.35"
          className="cursor-pointer transition-colors"
          onMouseEnter={() => setHovered('khordha')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectBlock?.('khordha')}
        />

        {/* 3. JAGATSINGHPUR (East coast) */}
        <polygon
          points="310,185 370,165 410,210 395,260 330,240"
          fill={hovered === 'jagatsinghpur' ? '#332722' : '#221e25'}
          stroke="#fb923c"
          strokeWidth="0.9"
          strokeOpacity="0.5"
          className="cursor-pointer transition-colors"
          onMouseEnter={() => setHovered('jagatsinghpur')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectBlock?.('jagatsinghpur')}
        />
        <text x="365" y="215" fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
          JAGATSINGHPUR
        </text>

        {/* 4. ERASAMA (Southeast coastal delta) */}
        <polygon
          points="395,260 410,210 445,245 425,295 365,280"
          fill={hovered === 'erasama' ? '#442220' : '#2d1c22'}
          stroke="#f87171"
          strokeWidth="1"
          strokeOpacity="0.6"
          className="cursor-pointer transition-colors"
          onMouseEnter={() => setHovered('erasama')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectBlock?.('erasama')}
        />
        <text x="410" y="260" fill="#fca5a5" fontSize="8" fontFamily="monospace" textAnchor="middle">
          ERASAMA
        </text>

        {/* 5. KRUSHNAPRASAD (Chilika coastal spit) */}
        <polygon
          points="200,310 245,290 280,315 255,360 195,340"
          fill={hovered === 'krushnaprasad' ? '#4a1d1d' : '#33171f'}
          stroke="#ef4444"
          strokeWidth="1"
          strokeOpacity="0.7"
          className="cursor-pointer transition-colors"
          onMouseEnter={() => setHovered('krushnaprasad')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectBlock?.('krushnaprasad')}
        />

        {/* 6. BRAHMAGIRI & PURI (Landfall zone - Prominent red highlight) */}
        <polygon
          points="240,245 300,230 330,265 290,315 245,285"
          fill={highlightBrahmagiri || selectedBlockId === 'brahmagiri' ? '#b91c1c' : '#7f1d1d'}
          fillOpacity={highlightBrahmagiri ? 0.95 : 0.8}
          stroke="#fca5a5"
          strokeWidth={highlightBrahmagiri ? '2.2' : '1.2'}
          className="cursor-pointer transition-all"
          filter={highlightBrahmagiri ? 'url(#glow)' : undefined}
          onMouseEnter={() => setHovered('brahmagiri')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectBlock?.('brahmagiri')}
        />
        <text x="282" y="275" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          BRAHMAGIRI
        </text>

        {/* Historical Fani Track Line (Pink/Red dotted trajectory from Bay of Bengal into Puri) */}
        <path
          d="M 120,380 L 175,345 L 215,315 L 250,285 L 295,245 L 345,190 L 390,135"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2.5"
          strokeDasharray="4 3"
        />

        {/* Historical Track Observation Nodes */}
        {[
          { x: 120, y: 380, label: '01 May' },
          { x: 175, y: 345, label: '02 May' },
          { x: 215, y: 315, label: '03 May 00:00' },
          { x: 295, y: 245, label: 'Inland' },
          { x: 345, y: 190, label: 'Cuttack pass' },
        ].map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#fda4af" stroke="#9f1239" strokeWidth="1" />
        ))}

        {/* Eye Landfall Center (Brahmagiri / Puri coast) */}
        <g transform="translate(250, 285)" className="cursor-pointer">
          {/* Pulsing ring */}
          <circle r="14" fill="#ef4444" fillOpacity="0.25">
            <animate attributeName="r" values="8;18;8" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
          {/* Eye inner */}
          <circle r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
          <circle r="2" fill="#ffffff" />
          {/* Label */}
          <text x="14" y="4" fill="#fca5a5" fontSize="10" fontWeight="bold" fontFamily="monospace">
            EYE (LANDFALL)
          </text>
        </g>
      </svg>
    </div>
  );
}
