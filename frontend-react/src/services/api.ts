// ─────────────────────────────────────────────────────────────────────────────
// SURAKSHA API Client
// Falls back to offline fixtures when backend unreachable (1.5s timeout)
// ─────────────────────────────────────────────────────────────────────────────
import type { DataMode, OverviewStats, Incident, BlockRisk, StrategicAsset, ResponseTask, HazardEvent } from '../types';
import {
  FANI_HAZARD_EVENT,
  BLOCK_RISKS,
  STRATEGIC_ASSETS,
  RESPONSE_TASKS,
  NTRO_OVERVIEW,
  NTRO_INCIDENTS,
  SITUATION_BRIEF,
  FANI_WARNINGS,
} from '../data/fixtures';

const TIMEOUT_MS = 1500;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Data Mode State ─────────────────────────────────────────────────────────

let _dataMode: DataMode = 'REPLAY';
let _isBackendAvailable = false;

export function getDataMode(): DataMode { return _dataMode; }
export function setDataMode(mode: DataMode) { _dataMode = mode; }
export function isBackendAvailable(): boolean { return _isBackendAvailable; }

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/health');
    _isBackendAvailable = res.ok;
  } catch {
    _isBackendAvailable = false;
  }
  if (!_isBackendAvailable && _dataMode === 'LIVE') {
    _dataMode = 'REPLAY';
  }
  return _isBackendAvailable;
}

// ─── Stats / Overview ─────────────────────────────────────────────────────────

export async function getOverviewStats(): Promise<OverviewStats> {
  try {
    if (_isBackendAvailable) {
      const res = await fetchWithTimeout('/api/stats');
      if (res.ok) {
        const data = await res.json();
        return {
          ...NTRO_OVERVIEW,
          hotspots_today: data.hotspots_analyzed ?? NTRO_OVERVIEW.hotspots_today,
          critical_alerts: data.critical_alerts ?? NTRO_OVERVIEW.critical_alerts,
          is_demo_mode: false,
        };
      }
    }
  } catch { /* fall through */ }
  return NTRO_OVERVIEW;
}

// ─── Hazard Event (Cyclone) ───────────────────────────────────────────────────

export async function getHazardEvent(): Promise<HazardEvent> {
  return FANI_HAZARD_EVENT;
}

export function getWarnings() { return FANI_WARNINGS; }

// ─── Block Risk Rankings ──────────────────────────────────────────────────────

export async function getBlockRisks(windOffset = 0): Promise<BlockRisk[]> {
  // What-if: adjust scores by windOffset (slider)
  if (windOffset === 0) return BLOCK_RISKS;
  return BLOCK_RISKS.map(b => ({
    ...b,
    score: Math.min(100, Math.max(0, b.score + windOffset)),
  })).sort((a, b) => b.score - a.score)
    .map((b, i) => ({ ...b, rank: i + 1 }));
}

// ─── Strategic Assets ─────────────────────────────────────────────────────────

export async function getStrategicAssets(): Promise<StrategicAsset[]> {
  return STRATEGIC_ASSETS;
}

// ─── Response Tasks ───────────────────────────────────────────────────────────

let _tasks = [...RESPONSE_TASKS];

export async function getResponseTasks(): Promise<ResponseTask[]> {
  try {
    if (_isBackendAvailable) {
      const res = await fetchWithTimeout('/api/responders/nearby?latitude=20.0&longitude=85.8&radius_km=200');
      if (res.ok) { /* merge if needed */ }
    }
  } catch { /* fall through */ }
  return _tasks;
}

export async function updateTaskStatus(id: string, status: ResponseTask['status'], note?: string): Promise<ResponseTask[]> {
  _tasks = _tasks.map(t => {
    if (t.id !== id) return t;
    const entry = {
      timestamp: new Date().toISOString(),
      actor: 'Cmd Dashboard (User)',
      action: `STATUS_CHANGED_TO_${status}`,
      note: note ?? '',
    };
    return { ...t, status, updated_at: new Date().toISOString(), audit_log: [...t.audit_log, entry] };
  });
  return _tasks;
}

export async function createTask(task: Omit<ResponseTask, 'id' | 'created_at' | 'updated_at' | 'audit_log'>): Promise<ResponseTask> {
  const now = new Date().toISOString();
  const newTask: ResponseTask = {
    ...task,
    id: `TASK-${Date.now()}`,
    created_at: now,
    updated_at: now,
    audit_log: [{ timestamp: now, actor: 'Cmd Dashboard (User)', action: 'TASK_CREATED' }],
  };
  _tasks = [newTask, ..._tasks];
  return newTask;
}

// ─── Situation Brief ──────────────────────────────────────────────────────────

export async function getSituationBrief() {
  return SITUATION_BRIEF;
}

// ─── Incidents (NTRO) ─────────────────────────────────────────────────────────

let _incidents = [...NTRO_INCIDENTS];

export async function getIncidents(): Promise<Incident[]> {
  try {
    if (_isBackendAvailable) {
      const res = await fetchWithTimeout('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        if (data.incidents?.length) {
          return _incidents.map(f => {
            const sv = data.incidents.find((i: { id: string }) => i.id === f.id);
            return sv ? { ...f, status: sv.status ?? f.analyst_verification.status } : f;
          });
        }
      }
    }
  } catch { /* fall through */ }
  return _incidents;
}

export async function submitAnalystVerification(
  incidentId: string,
  payload: { status: string; notes: string; analystName: string }
): Promise<void> {
  _incidents = _incidents.map(i => {
    if (i.id !== incidentId) return i;
    return {
      ...i,
      analyst_verification: {
        status: payload.status,
        verified_by: payload.analystName,
        verified_at: new Date().toISOString(),
        notes: payload.notes,
      },
    };
  });
}

// ─── Public Alerts ────────────────────────────────────────────────────────────

export async function getPublicAlerts() {
  try {
    if (_isBackendAvailable) {
      const res = await fetchWithTimeout('/api/public/alerts?limit=10');
      if (res.ok) return await res.json();
    }
  } catch { /* fall through */ }
  return {
    alerts: [
      {
        id: 'PUB-001',
        alert_type: 'CYCLONE_WARNING',
        status: 'ACTIVE',
        is_simulated: true,
        severity: 'CRITICAL',
        message: 'CYCLONE FANI — Landfall near Puri imminent. Evacuate coastal areas immediately. This is a replay scenario.',
        sent_at: '2019-05-03T00:00:00Z',
      },
    ],
    total: 1,
    notice: 'REPLAY scenario — all alerts are historical data from Cyclone Fani 2019.',
  };
}


// ─── Multi-Hazard Intelligence & Operations ──────────────────────────────────

export interface ScenarioMeta {
  hazard_type: string;
  event_id: string;
  name: string;
  severity: string;
  provenance: string;
  source: string;
  observed_at: string;
  attributes: Record<string, any>;
}

export interface HazardEvaluationReport {
  event_id: string;
  hazard_type: string;
  name: string;
  severity: string;
  provenance: string;
  ranked_blocks: Array<{
    area_code: string;
    block_name: string;
    district: string;
    priority_score: number;
    risk_tier: string;
    reasons: string[];
    population_exposed: number;
    is_intersecting: boolean;
    distance_km: number;
  }>;
  exposed_assets: Array<{
    asset_id: string;
    name: string;
    asset_type: string;
    district: string;
    criticality: string;
    status: string;
    exposure_level: string;
    distance_km: number;
  }>;
  evaluated_routes: Array<{
    route_id: string;
    name: string;
    route_type: string;
    status: string;
    cutoff_percentage: number;
  }>;
  safe_staging_hubs: string[];
}

export async function fetchHazardScenarios(): Promise<ScenarioMeta[]> {
  try {
    const res = await fetchWithTimeout('/api/hazards/scenarios');
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return [
    {
      hazard_type: 'CYCLONE',
      event_id: 'HZ-2019-FANI-CYCLONE',
      name: 'Cyclone Fani Extremely Severe Cyclonic Storm',
      severity: 'CRITICAL',
      provenance: 'REPLAY',
      source: 'IMD / INSAT-3DR',
      observed_at: '2019-05-03T08:00:00Z',
      attributes: { max_wind_kmh: 215.0, landfall_point: 'Puri Coast, Odisha' },
    },
    {
      hazard_type: 'WILDFIRE',
      event_id: 'HZ-2021-SIMILIPAL-FIRE',
      name: 'Similipal Biosphere Reserve Thermal Hotspot Cluster',
      severity: 'HIGH',
      provenance: 'REPLAY',
      source: 'NASA FIRMS / Suomi-NPP VIIRS',
      observed_at: '2021-03-02T13:45:00Z',
      attributes: { total_frp_mw: 469.2, hotspot_count: 5 },
    },
    {
      hazard_type: 'FLOOD',
      event_id: 'HZ-2020-MAHANADI-FLOOD',
      name: 'Mahanadi Delta Monsoon Inundation Event',
      severity: 'HIGH',
      provenance: 'REPLAY',
      source: 'Sentinel-1A SAR C-band / CWC',
      observed_at: '2020-08-28T05:30:00Z',
      attributes: { inundation_water_depth_m: 2.4, satellite_sensor: 'Sentinel-1A IW C-SAR' },
    },
    {
      hazard_type: 'EARTHQUAKE',
      event_id: 'HZ-2023-ODISHA-SEISMIC',
      name: 'Eastern Ghats Strike-Slip Seismic Event',
      severity: 'HIGH',
      provenance: 'REPLAY',
      source: 'USGS ShakeMap / NDMA',
      observed_at: '2023-04-14T11:22:00Z',
      attributes: { magnitude: 6.8, modified_mercalli_intensity: 7.5 },
    },
  ];
}

export async function evaluateHazard(hazardType: string): Promise<HazardEvaluationReport | null> {
  try {
    const res = await fetchWithTimeout(`/api/hazards/evaluate?hazard_type=${hazardType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return null;
}

export async function fetchOperations(): Promise<any[]> {
  try {
    const res = await fetchWithTimeout('/api/hazards/operations');
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return [];
}

export async function authorizeOperation(payload: {
  hazard_event_id: string;
  title: string;
  priority?: string;
  location: string;
  assigned_unit?: string;
  instructions?: string;
}): Promise<any> {
  try {
    const res = await fetchWithTimeout('/api/hazards/operations/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return null;
}

export async function updateOperationStatus(
  taskId: string,
  payload: {
    status: string;
    field_note?: string;
    reported_road_blocked?: boolean;
    flood_depth_meters?: number;
  }
): Promise<any> {
  try {
    const res = await fetchWithTimeout(`/api/hazards/operations/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return null;
}
