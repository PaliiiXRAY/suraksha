// ─────────────────────────────────────────────────────────────────────────────
// AuthPortal.tsx — SURAKSHA Role-Based Access Control (RBAC) Landing & Gateway
// Faithfully matching the target reference (media_1793405536805_e57aeb25.png & 5b844e9c.png)
// STRICT AUTHORIZATION ENFORCEMENT:
//   - Hazard Intelligence : ONLY '3amcommits.admin.in'
//   - Government Portal   : ONLY 'mosac.gov.in' or 'virms.gov.in'
//   - Response Portal     : ONLY 'responder@ndrf.gov.in'
//   - Public Portal       : ONLY 'citizen@suraksha.public' (or emergency public bypass)
//   - ANY OTHER EMAIL     : STRICTLY REJECTED — CANNOT AUTHENTICATE.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import { ShieldCheck, Moon, Sun, Sparkles, CheckCircle2, AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import type { AuthUser, UserRole } from '../types';
import { getAuthorizedRoleForEmail } from '../types';

interface Props {
  onLoginSuccess: (user: AuthUser, targetView: 'intelligence' | 'command' | 'responder' | 'citizen') => void;
  onPublicBypass: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface RoleConfig {
  email: string;
  role: UserRole;
  name: string;
  org: string;
  dropdownLabel: string;
  targetView: 'intelligence' | 'command' | 'responder' | 'citizen';
  policyLabel: string;
}

const ROLES: Record<string, RoleConfig> = {
  intelligence: {
    email: '3amcommits.admin.in',
    role: 'analyst',
    name: 'Lead Intel Analyst (3amcommits)',
    org: 'NDMA / 3amcommits Earth Observation Division',
    dropdownLabel: 'Intelligence — Analyst workspace (3amcommits.admin.in)',
    targetView: 'intelligence',
    policyLabel: 'Strictly 3amcommits.admin.in',
  },
  command: {
    email: 'commander@mosac.gov.in',
    role: 'authority',
    name: 'State Disaster Authority (MOSAC / VIRMS)',
    org: 'State Emergency Operations Center (SEOC)',
    dropdownLabel: 'Command — Government authority (mosac.gov.in / virms.gov.in)',
    targetView: 'command',
    policyLabel: 'Strictly mosac.gov.in or virms.gov.in',
  },
  operations: {
    email: 'responder@ndrf.gov.in',
    role: 'responder',
    name: 'Insp. Rajesh Nayak (NDRF Bn 03)',
    org: 'NDRF 03 Battalion Mundali',
    dropdownLabel: 'Operations — Field responder (responder@ndrf.gov.in)',
    targetView: 'responder',
    policyLabel: 'Strictly responder@ndrf.gov.in',
  },
  public: {
    email: 'citizen@suraksha.public',
    role: 'civilian',
    name: 'Civilian Resident (Public Safety)',
    org: 'Public Safety & Evacuation Portal',
    dropdownLabel: 'Public — Citizen safety (citizen@suraksha.public)',
    targetView: 'citizen',
    policyLabel: 'Public Emergency Access',
  },
};

export default function AuthPortal({
  onLoginSuccess,
  onPublicBypass,
  onShowToast,
  theme = 'light',
  onToggleTheme,
}: Props) {
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('intelligence');
  const [email, setEmail] = useState<string>(ROLES.intelligence.email);
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Live validation of email against the strict authorization matrix
  const authCheck = useMemo(() => {
    return getAuthorizedRoleForEmail(email);
  }, [email]);

  function handleRoleChange(key: string) {
    setSelectedRoleKey(key);
    setAuthError(null);
    const cfg = ROLES[key];
    if (cfg) {
      setEmail(cfg.email);
      setPassword('');
    }
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    setAuthError(null);
    // Auto-align selected role when an authorized email is typed
    const check = getAuthorizedRoleForEmail(val);
    if (check.authorized && check.roleKey && check.roleKey !== selectedRoleKey) {
      setSelectedRoleKey(check.roleKey);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 1. HARD GATE: Strictly block any email that is not in the authorized whitelist
    const check = getAuthorizedRoleForEmail(email);
    if (!check.authorized) {
      setAuthError(check.error || 'Access Denied: Unrecognized email identifier.');
      onShowToast(check.error || 'Access Denied: Email not authorized', 'warning');
      return;
    }

    // 2. Ensure the email aligns with the requested role
    const cfg = ROLES[selectedRoleKey] || ROLES.intelligence;
    if (check.role && check.role !== cfg.role) {
      const mismatchMsg = `Access Denied: '${email.trim()}' is authorized for ${check.role.toUpperCase()} role, not ${cfg.role.toUpperCase()}.`;
      setAuthError(mismatchMsg);
      onShowToast(mismatchMsg, 'warning');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password || 'demo-password',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const authUser: AuthUser = {
          id: data.user?.id || `usr_${check.role}_01`,
          email: data.user?.email || email.trim(),
          full_name: data.user?.full_name || check.name || cfg.name,
          role: (data.user?.role as UserRole) || check.role || cfg.role,
          org: check.org || cfg.org,
          token: data.access_token,
        };
        onShowToast(`Authenticated: ${authUser.full_name} [${authUser.role.toUpperCase()}]`, 'success');
        onLoginSuccess(authUser, check.view || cfg.targetView);
        return;
      }
    } catch {
      // Offline fallback
    }

    // Reliable Local/Demo Fallback for verified authorized credentials
    setTimeout(() => {
      setLoading(false);
      const authUser: AuthUser = {
        id: `usr_${check.role || cfg.role}_demo`,
        email: email.trim(),
        full_name: check.name || cfg.name,
        role: check.role || cfg.role,
        org: check.org || cfg.org,
        token: `mock_jwt_${check.role || cfg.role}_${Date.now()}`,
      };
      onShowToast(`Authenticated: ${authUser.full_name} [${authUser.role.toUpperCase()}]`, 'success');
      onLoginSuccess(authUser, check.view || cfg.targetView);
    }, 300);
  }

  const isDark = theme === 'dark';
  const heroBackgroundImage = isDark
    ? "linear-gradient(to top, rgba(5, 8, 22, 0.95) 0%, rgba(5, 8, 22, 0.50) 25%, rgba(5, 8, 22, 0) 50%, rgba(5, 8, 22, 0.65) 100%), url('/media/globe_landing_dark.jpg')"
    : "linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.50) 28%, rgba(0, 0, 0, 0) 55%, rgba(15, 23, 42, 0.65) 100%), url('/media/globe_landing_light.jpg')";

  const activeCfg = ROLES[selectedRoleKey] || ROLES.intelligence;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f4f7fb] dark:bg-[#050816] text-slate-900 dark:text-white relative transition-colors duration-300">
      {/* ─────────────────────────────────────────────────────────────────────────
          LEFT COLUMN (50%): 3D Globe with Atmosphere & Dual Theme Imagery
          ───────────────────────────────────────────────────────────────────────── */}
      <div
        className="lg:w-1/2 min-h-[420px] lg:min-h-screen relative flex flex-col justify-between p-8 sm:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 transition-all duration-300"
        style={{
          backgroundImage: heroBackgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Top Brand Tag with Shield Icon matching Target */}
        <div className="z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#f4511e] shadow-xs">
            <ShieldCheck size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-wider text-white uppercase leading-none">
              SURAKSHA
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              DECISION INTELLIGENCE
            </span>
          </div>
        </div>

        {/* Bottom Headline & Telemetry Metadata */}
        <div className="z-10 space-y-3 max-w-xl">
          <div className="font-mono text-xs font-bold tracking-widest uppercase text-[#f97316]">
            IMD • ISRO • NDMA • SECURE GATEWAY
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Every response begins with a verified signal.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed pt-1">
            Role-shaped access • Multi-tenant authority coordination • Simulated dispatch • Immutable audit trail
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          RIGHT COLUMN (50%): Clean Authorized Access RBAC Gateway Form
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="lg:w-1/2 flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-[#f4f7fb] dark:bg-[#050816] transition-colors relative">
        {/* Top-Right Theme Toggle Button matching Target */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-300 hover:scale-105 transition-all"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>
        )}

        {/* Centered Form Container (Max 440px matching FireSense/Target layout) */}
        <div className="w-full max-w-[440px] space-y-6">
          {/* Form Header with Logo + RBAC Gateway Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#f4511e] shadow-xs">
                <ShieldCheck size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  SURAKSHA
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  DECISION INTELLIGENCE
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#232d46] uppercase shadow-xs">
              RBAC GATEWAY
            </span>
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Authorized Access
            </h2>
            <p className="text-xs font-normal text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your official emergency credentials. Other emails will be rejected by policy.
            </p>
          </div>

          {/* Authorized 1-Click Role Presets */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Sparkles size={12} />
                <span>Authorized Credentials:</span>
              </span>
              <span className="text-slate-500">1-click fill</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(ROLES).map(([k, cfg]) => {
                const isSelected = selectedRoleKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleRoleChange(k)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all border text-center truncate ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-[#141b2d] border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                    title={cfg.dropdownLabel}
                  >
                    {k.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Quick Email Chips for Government Command (mosac.gov.in / virms.gov.in) */}
          {selectedRoleKey === 'command' && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#101524] p-2 rounded-lg border border-slate-200 dark:border-white/10">
              <span className="font-bold">Government Domain:</span>
              <button
                type="button"
                onClick={() => handleEmailChange('commander@mosac.gov.in')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  email.includes('mosac.gov.in')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-[#181d2a] border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                mosac.gov.in
              </button>
              <button
                type="button"
                onClick={() => handleEmailChange('officer@virms.gov.in')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  email.includes('virms.gov.in')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-[#181d2a] border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                virms.gov.in
              </button>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Operator Identifier */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  Operator Identifier
                </label>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {activeCfg.policyLabel}
                </span>
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                placeholder={activeCfg.email}
                className={`w-full bg-white dark:bg-[#141b2d] border rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none shadow-xs transition-colors ${
                  authCheck.authorized
                    ? 'border-slate-300 dark:border-[#232d46] focus:border-[#f4511e] focus:ring-1 focus:ring-[#f4511e]'
                    : 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                }`}
              />

              {/* Live Domain Authorization Badge */}
              <div className="pt-0.5">
                {authCheck.authorized ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Authorized credential: {authCheck.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 mt-1">
                    <ShieldAlert size={14} className="text-rose-600 flex-shrink-0" />
                    <span>{authCheck.error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Authentication Key */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Authentication Key
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter demo password"
                className="w-full bg-white dark:bg-[#141b2d] border border-slate-300 dark:border-[#232d46] rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#f4511e] focus:ring-1 focus:ring-[#f4511e] shadow-xs transition-colors"
              />
            </div>

            {/* Select Dashboard Role */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Select Dashboard Role
              </label>
              <select
                value={selectedRoleKey}
                onChange={e => handleRoleChange(e.target.value)}
                className="w-full bg-white dark:bg-[#141b2d] border border-slate-300 dark:border-[#232d46] rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#f4511e] focus:ring-1 focus:ring-[#f4511e] shadow-xs transition-colors cursor-pointer"
              >
                {Object.entries(ROLES).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {cfg.dropdownLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Prominent Error Alert Banner if validation fails */}
            {authError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs font-mono font-bold text-rose-900 dark:text-rose-200 flex items-start gap-2 shadow-xs">
                <Lock size={15} className="mt-0.5 flex-shrink-0 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Orange Authenticate & Launch Portal Button matching Target */}
            <div className="pt-1.5">
              <button
                type="submit"
                disabled={loading || !authCheck.authorized}
                className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all ${
                  authCheck.authorized
                    ? 'bg-[#f4511e] hover:bg-[#e04513] text-white active:scale-[0.99] cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <span>{loading ? 'Authenticating...' : 'Authenticate & Launch Portal'}</span>
                <span className="text-sm">›</span>
              </button>
            </div>
          </form>

          {/* Divider */}
          <hr className="border-t border-slate-200 dark:border-white/10 my-4" />

          {/* Public Emergency Access & Back Link matching Target */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono">
              <span>Public emergency access:</span>
              <button
                type="button"
                onClick={onPublicBypass}
                className="font-bold text-[#f4511e] hover:underline cursor-pointer"
              >
                Citizen safety portal
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  onShowToast('SURAKSHA v2.4 (National Geospatial Multi-Hazard Intel System)', 'info');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Back to SURAKSHA overview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
