// ─────────────────────────────────────────────────────────────────────────────
// SURAKSHA Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type ProvenanceTag =
  | 'OFFICIAL_FORECAST'
  | 'OBSERVED'
  | 'MODEL_ESTIMATE'
  | 'REPLAY'
  | 'SIMULATED'
  | 'INSUFFICIENT_DATA'
  | 'HISTORICAL';

export type DataMode = 'REPLAY' | 'LIVE' | 'CACHED';

export type RiskTier = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'ROUTINE' | 'REVIEW_REQUIRED';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentStatus =
  | 'ACTIVE'
  | 'VERIFIED'
  | 'INVESTIGATING'
  | 'ACKNOWLEDGED'
  | 'DISPATCHED'
  | 'RESOLVED'
  | 'UNVERIFIED';

export type AssetType =
  | 'hospital'
  | 'shelter'
  | 'ndrf_base'
  | 'relief_depot'
  | 'port'
  | 'fuel_depot';

export type TaskStatus = 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ─── Cyclone / Hazard ────────────────────────────────────────────────────────

export interface CycloneTrackPoint {
  timestamp_utc: string;
  lat: number;
  lon: number;
  wind_kmh: number;
  pressure_hpa: number;
  category: string;
  provenance_tag: ProvenanceTag;
}

export interface CycloneWarning {
  bulletin_id: string;
  issued_at: string;
  issued_by: string;
  cyclone_name: string;
  intensity: string;
  current_position: { lat: number; lon: number };
  wind_kmh: number;
  landfall_est: string;
  landfall_location: string;
  message: string;
  provenance_tag: ProvenanceTag;
}

export interface HazardEvent {
  id: string;
  name: string;
  category: string;
  speed_kmh: number;
  wind_kmh: number;
  track: CycloneTrackPoint[];
  current_lat: number;
  current_lon: number;
  landfall_est: string;
  landfall_location: string;
  provenance_tag: ProvenanceTag;
}

// ─── Block Risk ──────────────────────────────────────────────────────────────

export interface RiskReason {
  factor: string;
  value: string;
  provenance_tag: ProvenanceTag;
  weight_pct?: number;
}

export interface BlockRisk {
  id: string;
  block_name: string;
  district: string;
  rank: number;
  score: number;
  tier: RiskTier;
  lat: number;
  lon: number;
  population: number;
  reasons: RiskReason[];
  staging_rec?: string;
  cut_routes: string[];
  passable_routes: string[];
  provenance_tag: ProvenanceTag;
}

// ─── Strategic Assets ────────────────────────────────────────────────────────

export interface StrategicAsset {
  id: string;
  name: string;
  type: AssetType;
  lat: number;
  lon: number;
  criticality: number;
  exposed: boolean;
  distance_to_eye_km?: number;
  provenance_tag: ProvenanceTag;
}

// ─── Response Tasks ──────────────────────────────────────────────────────────

export interface ResponseTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  target_block?: string;
  target_asset?: string;
  provenance_tag: ProvenanceTag;
  audit_log: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  note?: string;
}

// ─── Situation Brief ─────────────────────────────────────────────────────────

export interface SituationBrief {
  event_status: string;
  top_priority: string;
  critical_assets: string;
  logistics: string;
  staging_recommendation: string;
  interlock_status: string;
  generated_at: string;
  provenance_tag: ProvenanceTag;
}

// ─── NTRO Incidents ──────────────────────────────────────────────────────────

export interface SatelliteData {
  frp_mw: number;
  brightness_temp_k: number;
  brightness_temp_c: number;
  track_m: number;
  scan_m: number;
  satellite_name: string;
  instrument: string;
  pass_type: string;
  detection_confidence_pct: number;
}

export interface ClassificationData {
  category: string;
  label: string;
  confidence_pct: number;
  model_version: string;
  evidence: string[];
  counter_evidence: string[];
}

export interface PersistenceData {
  observations_in_window: number;
  window_days: number;
  persistence_score_pct: number;
  normal_seasonal_range: string;
  anomaly_ratio: string;
  dot_history: boolean[];
  verdict: string;
}

export interface GeospatialData {
  land_cover_class: string;
  facility_name: string;
  facility_type: string;
  distance_to_facility_m: number;
  nearest_transport: string;
  surface_wind: {
    speed_kmh: number;
    direction: string;
    threat_corridor_km: number;
    impact_zone: string;
  };
}

export interface IncidentRisk {
  score: number;
  tier: string;
  contributing_factors: Array<{
    factor: string;
    weight_pct: number;
    impact: string;
  }>;
}

export interface AnalystVerification {
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string;
}

export interface Incident {
  id: string;
  title: string;
  location_name: string;
  state: string;
  district: string;
  coordinates: { lat: number; lon: number };
  timestamp_utc: string;
  satellite_source: string;
  satellite: SatelliteData;
  classification: ClassificationData;
  persistence: PersistenceData;
  geospatial: GeospatialData;
  risk: IncidentRisk;
  analyst_verification: AnalystVerification;
  status?: IncidentStatus;
}

// ─── Overview Stats ──────────────────────────────────────────────────────────

export interface OverviewStats {
  hotspots_today: number;
  delta_yesterday: number;
  auto_classified: number;
  classification_rate_pct: number;
  critical_alerts: number;
  pending_review: number;
  satellite_pass_time_utc: string;
  coverage_region: string;
  sensor_fleet: string[];
  is_demo_mode: boolean;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface AppState {
  dataMode: DataMode;
  isOffline: boolean;
  activeView: 'command' | 'ntro' | 'responder' | 'public';
  lastUpdated: string;
}
