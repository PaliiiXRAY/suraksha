/**
 * SURAKSHA Design System Tokens
 * Inherits and standardizes the FireSense visual language for multi-hazard intelligence.
 * Strictly adheres to dual dark/light themes and tabular data presentation.
 */

export const TOKENS = {
  // Brand identity
  brand: {
    name: 'SURAKSHA',
    tagline: 'Satellite-to-Decision Disaster Intelligence & Prioritised Relief Logistics',
    shortName: 'SURAKSHA',
    accentOrange: '#f4511e',
    accentBlue: '#2563eb',
  },

  // Color tokens mapped to Tailwind semantic utility equivalents
  colors: {
    // Dark theme base surfaces
    dark: {
      canvas: '#0a0d14',
      surface1: '#0e121b',
      surface2: '#121622',
      surface3: '#181d2a',
      borderSubtle: 'rgba(255, 255, 255, 0.07)',
      borderDefault: 'rgba(255, 255, 255, 0.12)',
      borderStrong: 'rgba(255, 255, 255, 0.20)',
      textPrimary: '#ffffff',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
    },
    // Light theme base surfaces
    light: {
      canvas: '#f1f5f9',
      surface1: '#ffffff',
      surface2: '#f8fafc',
      surface3: '#e2e8f0',
      borderSubtle: '#e2e8f0',
      borderDefault: '#cbd5e1',
      borderStrong: '#94a3b8',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#475569',
    },
    // Hazard classification accents
    hazards: {
      cyclone: {
        badge: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/40',
        accent: '#9333ea',
        label: 'CYCLONE',
      },
      flood: {
        badge: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-500/40',
        accent: '#06b6d4',
        label: 'FLOOD',
      },
      wildfire: {
        badge: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/40',
        accent: '#f97316',
        label: 'WILDFIRE',
      },
      earthquake: {
        badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40',
        accent: '#f59e0b',
        label: 'EARTHQUAKE',
      },
      tsunami: {
        badge: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-500/40',
        accent: '#14b8a6',
        label: 'TSUNAMI',
      },
    },
    // High-contrast Explainable Risk Score Tiers (Light & Dark Mode)
    riskTiers: {
      critical: {
        badge: 'bg-red-600 text-white border border-red-700 dark:bg-red-600 dark:text-white shadow-sm',
        scoreClass: 'text-red-700 dark:text-red-400',
        label: 'CRITICAL',
        min: 80,
      },
      high: {
        badge: 'bg-amber-600 text-white border border-amber-700 dark:bg-amber-600 dark:text-white shadow-sm',
        scoreClass: 'text-amber-700 dark:text-amber-400',
        label: 'HIGH',
        min: 65,
      },
      moderate: {
        badge: 'bg-blue-600 text-white border border-blue-700 dark:bg-blue-600 dark:text-white shadow-sm',
        scoreClass: 'text-blue-700 dark:text-blue-400',
        label: 'MODERATE',
        min: 45,
      },
      low: {
        badge: 'bg-emerald-600 text-white border border-emerald-700 dark:bg-emerald-600 dark:text-white shadow-sm',
        scoreClass: 'text-emerald-700 dark:text-emerald-400',
        label: 'LOW',
        min: 0,
      },
    },
    // High-contrast Data Provenance Tags (Light & Dark Mode)
    provenance: {
      OFFICIAL_FORECAST: {
        badge: 'bg-blue-100 text-blue-950 border-2 border-blue-500 dark:bg-blue-950/80 dark:text-blue-100 dark:border-blue-500',
        label: 'OFFICIAL FORECAST',
        icon: 'verified',
      },
      OBSERVED: {
        badge: 'bg-emerald-100 text-emerald-950 border-2 border-emerald-500 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-500',
        label: 'OBSERVED',
        icon: 'sensor',
      },
      MODEL_ESTIMATE: {
        badge: 'bg-purple-100 text-purple-950 border-2 border-purple-500 dark:bg-purple-950/80 dark:text-purple-100 dark:border-purple-500',
        label: 'MODEL ESTIMATE',
        icon: 'cpu',
      },
      HISTORICAL_REPLAY: {
        badge: 'bg-slate-200 text-slate-950 border-2 border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-500',
        label: 'REPLAY ARCHIVE',
        icon: 'history',
      },
      SIMULATED: {
        badge: 'bg-amber-100 text-amber-950 border-2 border-amber-500 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-500',
        label: 'SIMULATED',
        icon: 'sliders',
      },
      INSUFFICIENT_DATA: {
        badge: 'bg-rose-100 text-rose-950 border-2 border-rose-500 dark:bg-rose-950/80 dark:text-rose-100 dark:border-rose-500',
        label: 'REVIEW REQUIRED',
        icon: 'alert-triangle',
      },
    },
  },

  // Portal definitions matching canonical SURAKSHA terminology
  portals: [
    {
      id: 'intelligence',
      name: 'Hazard Intelligence Portal',
      shortName: 'Hazard Intelligence',
      role: 'INTEL ANALYST · NDMA / SDMA',
      description: 'Hazard monitoring, classification, geospatial intelligence and exposure analysis',
    },
    {
      id: 'command',
      name: 'Government Portal',
      shortName: 'Government Portal',
      role: 'AUTHORITY · DISASTER COMMAND HQ',
      description: 'Government command, operational decision-making, what-if simulations and dispatch authorizations',
    },
    {
      id: 'responder',
      name: 'Response Portal',
      shortName: 'Response Portal',
      role: 'FIELD RESPONDER · NDRF / ODRAF',
      description: 'Field execution, mission lifecycle tracking, team coordination and on-scene reports',
    },
    {
      id: 'citizen',
      name: 'Public Portal',
      shortName: 'Public Portal',
      role: 'CIVILIAN · RESILIENCE & SOS',
      description: 'Public hazard advisories, verified safe shelters, evacuation routes and offline distress beacons',
    },
  ],
};

export type HazardType = 'cyclone' | 'flood' | 'wildfire' | 'earthquake' | 'tsunami';
export type RiskTier = 'critical' | 'high' | 'moderate' | 'low';
export type ProvenanceTag =
  | 'OFFICIAL_FORECAST'
  | 'OBSERVED'
  | 'MODEL_ESTIMATE'
  | 'HISTORICAL_REPLAY'
  | 'SIMULATED'
  | 'INSUFFICIENT_DATA';
