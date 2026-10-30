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
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
    },
    // Light theme base surfaces
    light: {
      canvas: '#f8fafc',
      surface1: '#ffffff',
      surface2: '#f1f5f9',
      surface3: '#e2e8f0',
      borderSubtle: '#e2e8f0',
      borderDefault: '#cbd5e1',
      borderStrong: '#94a3b8',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
    },
    // Hazard classification accents
    hazards: {
      cyclone: {
        badge: 'bg-purple-950/40 text-purple-300 border-purple-500/30',
        accent: '#9333ea',
        label: 'CYCLONE',
      },
      flood: {
        badge: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30',
        accent: '#06b6d4',
        label: 'FLOOD',
      },
      wildfire: {
        badge: 'bg-orange-950/40 text-orange-300 border-orange-500/30',
        accent: '#f97316',
        label: 'WILDFIRE',
      },
      earthquake: {
        badge: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
        accent: '#f59e0b',
        label: 'EARTHQUAKE',
      },
      tsunami: {
        badge: 'bg-teal-950/40 text-teal-300 border-teal-500/30',
        accent: '#14b8a6',
        label: 'TSUNAMI',
      },
    },
    // Explainable Risk Score Tiers
    riskTiers: {
      critical: {
        badge: 'bg-red-500/20 text-red-400 border-red-500/40',
        scoreClass: 'text-red-400',
        label: 'CRITICAL',
        min: 80,
      },
      high: {
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        scoreClass: 'text-amber-400',
        label: 'HIGH',
        min: 65,
      },
      moderate: {
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        scoreClass: 'text-blue-400',
        label: 'MODERATE',
        min: 45,
      },
      low: {
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        scoreClass: 'text-emerald-400',
        label: 'LOW',
        min: 0,
      },
    },
    // Data Provenance Tags
    provenance: {
      OFFICIAL_FORECAST: {
        badge: 'bg-blue-950/40 text-blue-300 border-blue-500/30',
        label: 'OFFICIAL FORECAST',
        icon: 'verified',
      },
      OBSERVED: {
        badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
        label: 'OBSERVED',
        icon: 'sensor',
      },
      MODEL_ESTIMATE: {
        badge: 'bg-purple-950/40 text-purple-300 border-purple-500/30',
        label: 'MODEL ESTIMATE',
        icon: 'cpu',
      },
      HISTORICAL_REPLAY: {
        badge: 'bg-slate-800 text-slate-300 border-slate-600',
        label: 'REPLAY ARCHIVE',
        icon: 'history',
      },
      SIMULATED: {
        badge: 'bg-amber-950/40 text-amber-300 border-amber-500/30 animate-pulse',
        label: 'SIMULATED',
        icon: 'sliders',
      },
      INSUFFICIENT_DATA: {
        badge: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
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
      role: 'PUBLIC CITIZEN ACCESS',
      description: 'Public hazard advisories, verified shelters, evacuation routing and emergency SOS broadcast',
    },
  ],
} as const;

export type PortalId = (typeof TOKENS.portals)[number]['id'];
export type HazardType = keyof typeof TOKENS.colors.hazards;
export type ProvenanceTag = keyof typeof TOKENS.colors.provenance;
export type RiskTier = keyof typeof TOKENS.colors.riskTiers;
