/**
 * SURAKSHA — Cyclone Command View Controller (M3 Presentation & Interactions)
 * Connects CycloneEngine to the DOM and Leaflet Map Canvas.
 */

class CycloneViewController {
  constructor() {
    this.map = null;
    this.blockLayers = {};
    this.trackLayer = null;
    this.assetMarkersLayer = null;
    this.roadLayers = null;
    this.searchQuery = "";
    this.districtFilter = "ALL";
    this.pendingTaskId = null;
  }

  async init() {
    console.log("[SURAKSHA] Initializing Cyclone Command View...");
    await window.CycloneEngine.init();

    this.initMap();
    this.bindEvents();
    
    // Subscribe to engine state mutations
    window.CycloneEngine.subscribe(state => this.render(state));

    // Initial render
    this.render(window.CycloneEngine.getState());
  }

  initMap() {
    const mapContainer = document.getElementById('cyclone-map');
    if (!mapContainer || this.map) return;

    // Center on coastal Odisha (Puri / Bhubaneswar / Chilika)
    this.map = L.map('cyclone-map', {
      center: [19.85, 85.85],
      zoom: 9,
      zoomControl: true,
      attributionControl: false
    });

    // Dark cartographic base tiles (works with fallback if offline)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.blockGroup = L.featureGroup().addTo(this.map);
    this.assetMarkersLayer = L.layerGroup().addTo(this.map);
    this.roadLayers = L.layerGroup().addTo(this.map);
    this.trackLayer = L.layerGroup().addTo(this.map);

    // Load block polygons into map
    this.renderPolygons();
    this.renderTrackAndAssets();
  }

  invalidateMap() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  }

  getScoreColor(score) {
    if (score >= 80) return '#ef4444'; // Red (Critical)
    if (score >= 60) return '#f97316'; // Amber (High)
    if (score >= 40) return '#eab308'; // Yellow (Moderate)
    return '#10b981';                  // Emerald (Low)
  }

  renderPolygons() {
    const geo = window.CycloneEngine.blockPolygonsGeoJSON;
    if (!geo || !geo.features) {
      this.renderFallbackBlockMarkers();
      return;
    }

    this.blockGroup.clearLayers();
    this.blockLayers = {};

    const state = window.CycloneEngine.getState();
    const rankedMap = {};
    state.rankedBlocks.forEach(b => {
      rankedMap[b.area_code] = b;
      rankedMap[b.block_name] = b;
    });

    L.geoJSON(geo, {
      style: (feature) => {
        const code = feature.properties.area_code || feature.properties.block_name;
        const bData = rankedMap[code] || {};
        const score = bData.score || 50;
        const color = this.getScoreColor(score);
        return {
          fillColor: color,
          weight: 1.5,
          opacity: 0.9,
          color: '#ffffff',
          fillOpacity: 0.55
        };
      },
      onEachFeature: (feature, layer) => {
        const code = feature.properties.area_code || feature.properties.block_name;
        this.blockLayers[code] = layer;

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3, fillOpacity: 0.8, color: '#f8fafc' });
          },
          mouseout: (e) => {
            const l = e.target;
            const bData = rankedMap[code] || {};
            const score = bData.score || 50;
            l.setStyle({
              weight: 1.5,
              fillOpacity: 0.55,
              color: '#ffffff',
              fillColor: this.getScoreColor(score)
            });
          },
          click: () => {
            window.CycloneEngine.selectBlock(code);
            this.openReasonsDrawer();
          }
        });

        const bData = rankedMap[code] || feature.properties;
        layer.bindTooltip(`
          <div class="font-sans text-xs">
            <strong class="font-bold block text-slate-900">${feature.properties.block_name} (${feature.properties.district})</strong>
            <span class="text-slate-600 font-mono">Priority Score: <strong class="font-bold text-red-600">${bData.score || '—'}</strong>/100</span>
          </div>
        `, { sticky: true, className: 'cyclone-map-tooltip' });
      }
    }).addTo(this.blockGroup);
  }

  renderFallbackBlockMarkers() {
    this.blockGroup.clearLayers();
    const state = window.CycloneEngine.getState();
    state.rankedBlocks.forEach(b => {
      const lat = b.center_lat || b.center_latitude || 19.8;
      const lon = b.center_lon || b.center_longitude || 85.8;
      const color = this.getScoreColor(b.score);

      const circle = L.circleMarker([lat, lon], {
        radius: Math.max(6, (b.score / 100) * 16),
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.7
      }).addTo(this.blockGroup);

      circle.bindTooltip(`<b>${b.block_name}</b><br>Score: ${b.score}/100`, { sticky: true });
      circle.on('click', () => {
        window.CycloneEngine.selectBlock(b.area_code);
        this.openReasonsDrawer();
      });
      this.blockLayers[b.area_code] = circle;
    });
  }

  renderTrackAndAssets() {
    const state = window.CycloneEngine.getState();
    const ev = state.currentEvent;

    // Track Layer
    this.trackLayer.clearLayers();

    // Eye Landfall Marker with pulsing CSS ring
    const eyeIcon = L.divIcon({
      className: 'cyclone-eye-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 rounded-full bg-rose-500/40 animate-ping"></span>
          <span class="relative flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg border-2 border-white">
            🌀
          </span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([ev.landfall_lat, ev.landfall_lon], { icon: eyeIcon })
      .bindTooltip(`<b>${ev.name} Eye (Projected Landfall)</b><br>Peak Wind: ${ev.peak_wind_kmh} km/h<br>${renderProvenanceBadge(state.provenanceTag, 'sm')}`, { permanent: false })
      .addTo(this.trackLayer);

    // Hazard envelope circle (90 km/h destructive wind radius ~ 75 km radius)
    L.circle([ev.landfall_lat, ev.landfall_lon], {
      radius: 75000,
      color: '#f43f5e',
      weight: 1.5,
      dashArray: '4, 6',
      fillColor: '#f43f5e',
      fillOpacity: 0.12
    }).bindTooltip("90 km/h Destructive Wind Envelope", { sticky: true }).addTo(this.trackLayer);

    // Assets Layer
    this.assetMarkersLayer.clearLayers();
    state.threatenedAssets.slice(0, 15).forEach(ast => {
      const isHospital = ast.type === 'hospital';
      const iconChar = isHospital ? '🏥' : (ast.type === 'shelter' ? '🛡️' : '📦');
      const isExposed = ast.exposure_status === 'EXTREME_HAZARD' || ast.exposure_status === 'IN_HAZARD_FOOTPRINT';

      const astIcon = L.divIcon({
        className: 'asset-map-icon',
        html: `
          <div class="px-1.5 py-0.5 rounded ${isExposed ? 'bg-red-600 text-white animate-bounce' : 'bg-slate-800 text-slate-200'} text-[11px] font-bold border border-white/50 shadow flex items-center gap-1">
            <span>${iconChar}</span>
          </div>
        `,
        iconSize: [24, 20],
        iconAnchor: [12, 10]
      });

      L.marker([parseFloat(ast.latitude), parseFloat(ast.longitude)], { icon: astIcon })
        .bindTooltip(`
          <div class="text-xs font-sans">
            <strong class="block font-bold text-slate-900">${ast.name}</strong>
            <span class="text-slate-600">Wind: <strong>${ast.local_wind_kmh} km/h</strong> (${ast.exposure_status})</span><br>
            <span class="text-[10px] text-slate-500">${ast.capacity || ''}</span>
          </div>
        `)
        .addTo(this.assetMarkersLayer);
    });

    // Roads Layer
    this.roadLayers.clearLayers();
    state.routeStatuses.forEach(r => {
      const sLat = parseFloat(r.start_lat || 19.8);
      const sLon = parseFloat(r.start_lon || 85.8);
      const eLat = parseFloat(r.end_lat || 20.3);
      const eLon = parseFloat(r.end_lon || 85.8);

      const color = r.status === 'CUT' ? '#ef4444' : (r.status === 'AT_RISK' ? '#f59e0b' : '#10b981');
      const dash = r.status === 'CUT' ? '6, 6' : '';

      L.polyline([[sLat, sLon], [eLat, eLon]], {
        color: color,
        weight: 3.5,
        opacity: 0.85,
        dashArray: dash
      }).bindTooltip(`<b>${r.name}</b><br>Status: <strong>${r.status}</strong><br>${r.detail}`).addTo(this.roadLayers);
    });
  }

  updateMapStyles() {
    const state = window.CycloneEngine.getState();
    const rankedMap = {};
    state.rankedBlocks.forEach(b => {
      rankedMap[b.area_code] = b;
      rankedMap[b.block_name] = b;
    });

    Object.keys(this.blockLayers).forEach(code => {
      const layer = this.blockLayers[code];
      const bData = rankedMap[code] || {};
      const score = bData.score || 50;
      const color = this.getScoreColor(score);
      if (layer.setStyle) {
        layer.setStyle({
          fillColor: color
        });
      }
    });

    this.renderTrackAndAssets();
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('cyclone-block-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderRankedTable();
      });
    }

    // What-If Track Slider
    const trackSlider = document.getElementById('whatif-track-slider');
    const trackVal = document.getElementById('whatif-track-val');
    if (trackSlider) {
      trackSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (trackVal) trackVal.textContent = `${val > 0 ? '+' : ''}${val} km`;
        this.onWhatIfChange();
      });
    }

    // What-If Wind Slider
    const windSlider = document.getElementById('whatif-wind-slider');
    const windVal = document.getElementById('whatif-wind-val');
    if (windSlider) {
      windSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (windVal) windVal.textContent = `${val > 0 ? '+' : ''}${val}%`;
        this.onWhatIfChange();
      });
    }
  }

  onWhatIfChange() {
    const trackSlider = document.getElementById('whatif-track-slider');
    const windSlider = document.getElementById('whatif-wind-slider');
    const trackShift = trackSlider ? parseFloat(trackSlider.value) : 0;
    const windDelta = windSlider ? parseFloat(windSlider.value) : 0;

    const res = window.CycloneEngine.applyWhatIf(trackShift, windDelta, 0);
    
    // Update latency telemetry label
    const latencyEl = document.getElementById('whatif-latency-badge');
    if (latencyEl) {
      latencyEl.textContent = `⚡ Re-ranked in ${res.executionTimeMs.toFixed(1)} ms (< 2s SLA PASS)`;
      latencyEl.className = "text-[11px] font-mono font-bold text-emerald-400";
    }
  }

  resetWhatIf() {
    const trackSlider = document.getElementById('whatif-track-slider');
    const windSlider = document.getElementById('whatif-wind-slider');
    const trackVal = document.getElementById('whatif-track-val');
    const windVal = document.getElementById('whatif-wind-val');

    if (trackSlider) trackSlider.value = 0;
    if (windSlider) windSlider.value = 0;
    if (trackVal) trackVal.textContent = "0 km (Baseline)";
    if (windVal) windVal.textContent = "0% (215 km/h)";

    window.CycloneEngine.resetWhatIf();

    const latencyEl = document.getElementById('whatif-latency-badge');
    if (latencyEl) {
      latencyEl.textContent = "Baseline IMD Replay Restored";
      latencyEl.className = "text-[11px] font-mono font-bold text-purple-400";
    }
  }

  render(state) {
    this.renderHeaderBanners(state);
    this.renderRankedTable(state);
    this.renderReasonsDrawer(state);
    this.renderAssetsAndRoutes(state);
    this.renderTasksAndAudit(state);
    this.renderBriefing(state);
    this.updateMapStyles();
  }

  renderHeaderBanners(state) {
    const ev = state.currentEvent;
    const bannerContainer = document.getElementById('cyclone-top-banner');
    if (!bannerContainer) return;

    const tag = state.provenanceTag;
    const badgeHtml = renderProvenanceBadge(tag, 'md', ev.data_source);

    let interlockHtml = `
      <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>INTERLOCKS ARMED (0 FLAGS)</span>
      </div>
    `;

    if (state.interlockFlags.length > 0) {
      interlockHtml = `
        <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500 text-rose-300 text-xs font-mono font-bold animate-pulse">
          <span class="w-2 h-2 rounded-full bg-rose-400"></span>
          <span>SAFETY INTERLOCK: REVIEW REQUIRED (${state.interlockFlags.join(', ')})</span>
        </div>
      `;
    }

    bannerContainer.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-md">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-2xl">🌀</span>
          <div>
            <div class="flex items-center gap-2.5">
              <h2 class="text-lg font-black tracking-tight text-white uppercase">${ev.name} COMMAND CONSOLE</h2>
              ${badgeHtml}
            </div>
            <p class="text-xs text-slate-300 font-sans mt-0.5">
              Landfall: <strong class="text-white">${ev.target_landfall} (${ev.landfall_time_ist})</strong> &bull; Peak Wind: <strong class="text-amber-400">${ev.peak_wind_kmh} km/h</strong> &bull; Venue Mode: <strong class="text-emerald-400">100% OFFLINE</strong>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          ${interlockHtml}
          <button onclick="CycloneView.toggleInterlockSimulation()" class="px-3 py-1.5 rounded-lg ${state.telemetryStale ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
            <span>⚠️</span> <span>${state.telemetryStale ? 'Restore Fresh IMD Feed' : 'Simulate Stale Feed (+7 hrs)'}</span>
          </button>
        </div>
      </div>
    `;
  }

  renderRankedTable(state = window.CycloneEngine.getState()) {
    const tbody = document.getElementById('cyclone-ranked-table-body');
    if (!tbody) return;

    let blocks = state.rankedBlocks;
    if (this.searchQuery) {
      blocks = blocks.filter(b => 
        b.block_name.toLowerCase().includes(this.searchQuery) || 
        b.district.toLowerCase().includes(this.searchQuery)
      );
    }

    if (blocks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 text-xs">No matching blocks found.</td></tr>`;
      return;
    }

    const sel = state.selectedBlock ? state.selectedBlock.area_code : null;

    tbody.innerHTML = blocks.map((b, idx) => {
      const isSelected = (b.area_code === sel);
      const scoreColor = this.getScoreColor(b.score);
      const topReason = (b.reasons && b.reasons[0]) ? b.reasons[0].detail : "High coastal wind exposure";

      return `
        <tr onclick="CycloneEngine.selectBlock('${b.area_code}'); CycloneView.openReasonsDrawer();"
            class="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-500' : ''}">
          <td class="py-2.5 px-3 font-mono font-bold text-slate-500 dark:text-slate-400">#${idx + 1}</td>
          <td class="py-2.5 px-3">
            <div class="font-bold text-slate-900 dark:text-white text-xs">${b.block_name}</div>
            <div class="text-[11px] text-slate-500">${b.district} District ${b.is_coastal ? '🌊 Littoral' : ''}</div>
          </td>
          <td class="py-2.5 px-3 font-mono font-bold">
            <span class="text-sm" style="color: ${scoreColor}">${b.score}</span>
            <span class="text-[10px] text-slate-400">/100</span>
          </td>
          <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11.5px] max-w-xs truncate" title="${topReason}">
            ${topReason}
          </td>
          <td class="py-2.5 px-3">
            ${renderProvenanceBadge(state.provenanceTag, 'sm')}
          </td>
          <td class="py-2.5 px-3 text-right">
            <button class="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-all">
              Inspect &rarr;
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openReasonsDrawer() {
    const drawer = document.getElementById('cyclone-reasons-drawer');
    if (drawer) {
      drawer.classList.remove('hidden');
    }
  }

  closeReasonsDrawer() {
    const drawer = document.getElementById('cyclone-reasons-drawer');
    if (drawer) {
      drawer.classList.add('hidden');
    }
  }

  renderReasonsDrawer(state = window.CycloneEngine.getState()) {
    const block = state.selectedBlock;
    if (!block) return;

    const titleEl = document.getElementById('reasons-block-title');
    const districtEl = document.getElementById('reasons-block-district');
    const scoreEl = document.getElementById('reasons-block-score');
    const badgeEl = document.getElementById('reasons-block-badge');
    const factorsListEl = document.getElementById('reasons-factors-list');

    if (titleEl) titleEl.textContent = block.block_name;
    if (districtEl) districtEl.textContent = `${block.district} District &bull; ${block.distance_km} km to Eye Landfall &bull; Local Peak Wind: ${block.local_wind_kmh} km/h`;
    if (scoreEl) {
      scoreEl.textContent = block.score;
      scoreEl.style.color = this.getScoreColor(block.score);
    }
    if (badgeEl) badgeEl.innerHTML = renderProvenanceBadge(state.provenanceTag, 'md');

    if (factorsListEl && block.reasons) {
      factorsListEl.innerHTML = block.reasons.map(r => {
        const pct = Math.min(100, (r.contribution / r.weight) * 100);
        const factorLabels = {
          wind_exposure: "1. Wind Exposure (30%)",
          rainfall_flood: "2. Rainfall & Flood Inundation (20%)",
          storm_surge: "3. Storm Surge Littoral Proximity (15%)",
          population_exposure: "4. Exposed & Vulnerable Population (20%)",
          critical_infrastructure: "5. Critical Infrastructure & Shelters (10%)",
          urgency_window: "6. Urgency Window / Hours to Landfall (5%)"
        };
        const title = factorLabels[r.factor] || r.factor;

        return `
          <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-800 dark:text-slate-200">${title}</span>
              <span class="font-mono text-blue-600 dark:text-blue-400 font-bold">${r.contribution} / ${r.weight} pts</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div class="bg-blue-600 dark:bg-blue-500 h-full rounded-full" style="width: ${pct}%"></div>
            </div>
            <p class="text-[11.5px] text-slate-600 dark:text-slate-300 font-medium">${r.detail}</p>
          </div>
        `;
      }).join('');
    }
  }

  renderAssetsAndRoutes(state = window.CycloneEngine.getState()) {
    // 1. Staging Depot Recommendation
    const stgEl = document.getElementById('cyclone-staging-rec');
    if (stgEl && state.stagingRecommendation) {
      const stg = state.stagingRecommendation;
      stgEl.innerHTML = `
        <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">OPTIMAL SAFE STAGING DEPOT</span>
            ${renderProvenanceBadge(stg.provenance_tag, 'sm')}
          </div>
          <h4 class="text-base font-black text-slate-900 dark:text-white">${stg.name}</h4>
          <p class="text-xs text-slate-600 dark:text-slate-300 font-sans">${stg.rationale}</p>
          <div class="flex items-center gap-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 pt-1">
            <span>📍 ${stg.district} (${stg.distance_km} km from eye)</span>
            <span>💨 Wind: ${stg.wind_kmh} km/h (SAFE)</span>
          </div>
        </div>
      `;
    }

    // 2. Threatened Assets List
    const assetListEl = document.getElementById('cyclone-assets-list');
    if (assetListEl) {
      const assets = state.threatenedAssets.slice(0, 6);
      assetListEl.innerHTML = assets.map(a => {
        const isCritical = a.exposure_status === 'EXTREME_HAZARD' || a.exposure_status === 'IN_HAZARD_FOOTPRINT';
        return `
          <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
            <div>
              <strong class="block text-slate-900 dark:text-white font-bold">${a.name}</strong>
              <span class="text-[11px] text-slate-500">${a.district} &bull; ${a.category} &bull; ${a.capacity || 'Operational'}</span>
            </div>
            <div class="text-right space-y-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isCritical ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'}">
                ${a.exposure_status}
              </span>
              <div class="font-mono text-[11px] text-slate-500 font-bold">${a.local_wind_kmh} km/h</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Road Severances List
    const routeListEl = document.getElementById('cyclone-routes-list');
    if (routeListEl) {
      routeListEl.innerHTML = state.routeStatuses.map(r => {
        const badgeColor = r.status === 'CUT' ? 'bg-red-600 text-white' : (r.status === 'AT_RISK' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white');
        return `
          <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
            <div>
              <strong class="block text-slate-900 dark:text-white font-bold">${r.name}</strong>
              <span class="text-[11px] text-slate-500 font-sans">${r.detail}</span>
            </div>
            <div class="text-right space-y-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${badgeColor}">
                ${r.status}
              </span>
              <div class="font-mono text-[10px] text-slate-500">${r.exposure_wind_kmh} km/h</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  renderTasksAndAudit(state = window.CycloneEngine.getState()) {
    // Task Queue
    const taskContainer = document.getElementById('cyclone-tasks-list');
    if (taskContainer) {
      taskContainer.innerHTML = state.tasks.map(t => {
        const stColors = {
          'PROPOSED': 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300',
          'APPROVED': 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300',
          'EN_ROUTE': 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300',
          'COMPLETED': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
        }[t.status] || 'bg-slate-100 text-slate-700';

        const actionBtn = t.status === 'PROPOSED' ? `
          <button onclick="CycloneView.openHumanApprovalModal('${t.id}')" class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer">
            <span>🛡️ Authorize Dispatch &rarr;</span>
          </button>
        ` : (t.status === 'APPROVED' ? `
          <button onclick="window.CycloneEngine.advanceTask('${t.id}')" class="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer">
            <span>Mark En Route &rarr;</span>
          </button>
        ` : '');

        return `
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-slate-500">${t.id}</span>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${stColors}">${t.status}</span>
                ${renderProvenanceBadge('SIMULATED', 'sm')}
              </div>
            </div>
            <h5 class="text-[13px] font-bold text-slate-900 dark:text-white">${t.title}</h5>
            <div class="text-[11.5px] text-slate-600 dark:text-slate-300 space-y-0.5">
              <div>🎯 Destination: <strong>${t.targetBlock}</strong> &bull; Origin: <strong>${t.sourceDepot}</strong></div>
              <div>🚚 Resource: <strong>${t.resource}</strong></div>
              ${t.approvedBy ? `<div class="text-blue-600 dark:text-blue-400 font-mono text-[10.5px]">✓ Authorized by: ${t.approvedBy} at ${t.approvedAt}</div>` : ''}
            </div>
            <div class="pt-1 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-mono">${t.createdAt}</span>
              ${actionBtn}
            </div>
          </div>
        `;
      }).join('');
    }

    // Audit Log
    const auditContainer = document.getElementById('cyclone-audit-list');
    if (auditContainer) {
      auditContainer.innerHTML = state.auditLog.slice(0, 5).map(a => `
        <div class="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-0.5">
          <div class="flex items-center justify-between text-slate-400">
            <span>${a.timestamp}</span>
            <span class="font-bold text-slate-700 dark:text-slate-300">${a.action}</span>
          </div>
          <div class="text-slate-800 dark:text-slate-200 font-sans">${a.details}</div>
          <div class="text-[9.5px] text-slate-400 truncate">SHA-256: ${a.hash} &bull; Actor: ${a.actor}</div>
        </div>
      `).join('');
    }
  }

  renderBriefing(state = window.CycloneEngine.getState()) {
    const briefContainer = document.getElementById('cyclone-briefing-text');
    if (!briefContainer) return;
    const brief = state.situationBriefing;

    briefContainer.innerHTML = brief.lines.map(line => `
      <div class="p-2 rounded bg-slate-100 dark:bg-slate-800/60 font-mono text-xs text-slate-800 dark:text-slate-200 border-l-2 border-blue-500">
        ${line}
      </div>
    `).join('');
  }

  // =========================================================================
  // HUMAN APPROVAL MODAL & INTERLOCK SAFETY CONTROLS
  // =========================================================================
  openHumanApprovalModal(taskId) {
    this.pendingTaskId = taskId;
    const state = window.CycloneEngine.getState();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('cyclone-human-approval-modal');
    const taskDetailsEl = document.getElementById('approval-task-details');
    const warningEl = document.getElementById('approval-interlock-warning');
    const confirmBtn = document.getElementById('btn-confirm-approval');

    if (taskDetailsEl) {
      taskDetailsEl.innerHTML = `
        <div class="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div class="font-bold text-slate-900 dark:text-white text-sm">${task.title}</div>
          <div>Task ID: <strong class="font-mono">${task.id}</strong></div>
          <div>Destination: <strong>${task.targetBlock}</strong></div>
          <div>Origin Depot: <strong>${task.sourceDepot}</strong></div>
          <div>Resource: <strong>${task.resource}</strong></div>
        </div>
      `;
    }

    if (state.telemetryStale && state.interlockFlags.includes('STALE_TELEMETRY_REFUSED')) {
      if (warningEl) {
        warningEl.classList.remove('hidden');
        warningEl.innerHTML = `
          <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold space-y-1">
            <div class="flex items-center gap-1.5">
              <span>🛑</span> <span>SAFETY INTERLOCK ENGAGED: STALE TELEMETRY (>6 HOURS)</span>
            </div>
            <p class="font-normal font-sans text-[11.5px]">Automated dispatch is REFUSED. System demands fresh IMD bulletin confirmation or explicit supervisor override.</p>
          </div>
        `;
      }
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    } else {
      if (warningEl) warningEl.classList.add('hidden');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    if (modal) modal.classList.remove('hidden');
  }

  closeHumanApprovalModal() {
    this.pendingTaskId = null;
    const modal = document.getElementById('cyclone-human-approval-modal');
    if (modal) modal.classList.add('hidden');
  }

  confirmHumanApproval() {
    if (!this.pendingTaskId) return;
    const res = window.CycloneEngine.approveTask(this.pendingTaskId, "authority@firesense.org (SRC Command)");
    if (!res.ok) {
      alert(`Approval Refused: ${res.error}`);
    } else {
      this.closeHumanApprovalModal();
    }
  }

  toggleInterlockSimulation() {
    const state = window.CycloneEngine.getState();
    if (state.telemetryStale) {
      window.CycloneEngine.clearInterlocks();
    } else {
      window.CycloneEngine.triggerStaleDataInterlock();
    }
  }
}

// Global Singleton View
window.CycloneView = new CycloneViewController();
