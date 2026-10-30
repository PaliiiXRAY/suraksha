// ─────────────────────────────────────────────────────────────────────────────
// CitizenServices.tsx — Tab 4 matching video 2 (01:08 - 01:16)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  AlertOctagon,
  Building2,
  Hospital,
  Droplets,
  Bus,
  Fuel,
  PhoneCall,
  CheckCircle2,
  MapPin,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  onShowToast: (msg: string) => void;
}

type Lang = 'en' | 'or' | 'hi';

const CONTENT = {
  en: {
    title: 'Disaster Help Services',
    subtitle: 'Find shelter, food, evacuation routes and emergency contacts near you.',
    sos: '🚨 SOS — I NEED HELP NOW',
    alertsHeader: 'Active Alerts Near You',
    district: 'Angul district',
    servicesHeader: 'SERVICES AVAILABLE',
    evacuationTitle: 'EVACUATION ROUTE',
    safePath: 'SAFE PATH',
    emergencyHeader: 'EMERGENCY NUMBERS',
    crowdsource: 'REPORT SMOKE OR FIRE',
  },
  or: {
    title: 'ବିପର୍ଯ୍ୟୟ ସହାୟତା ସେବା',
    subtitle: 'ଆପଣଙ୍କ ନିକଟରେ ଆଶ୍ରୟ, ଖାଦ୍ୟ, ସ୍ଥାନାନ୍ତର ମାର୍ଗ ଏବଂ ଜରୁରୀକାଳୀନ ଯୋଗାଯୋଗ ଖୋଜନ୍ତୁ।',
    sos: '🚨 SOS — ମୋତେ ବର୍ତ୍ତମାନ ସାହାଯ୍ୟ ଦରକାର',
    alertsHeader: 'ଆପଣଙ୍କ ନିକଟରେ ସକ୍ରିୟ ଚେତାବନୀ',
    district: 'ଅନୁଗୁଳ ଜିଲ୍ଲା',
    servicesHeader: 'ଉପଲବ୍ଧ ସେବାଗୁଡିକ',
    evacuationTitle: 'ସ୍ଥାନାନ୍ତରଣ ମାର୍ଗ',
    safePath: 'ନିରାପଦ ପଥ',
    emergencyHeader: 'ଜରୁରୀକାଳୀନ ନମ୍ବର',
    crowdsource: 'ନିଆଁ ବା ଧୂଆଁ ରିପୋର୍ଟ କରନ୍ତୁ',
  },
  hi: {
    title: 'आपदा सहायता सेवा',
    subtitle: 'अपने निकटतम आश्रय, भोजन, निकासी मार्ग और आपातकालीन संपर्क खोजें।',
    sos: '🚨 SOS — मुझे अभी सहायता चाहिए',
    alertsHeader: 'आपके निकट सक्रिय अलर्ट',
    district: 'अंगुल जिला',
    servicesHeader: 'उपलब्ध सेवाएं',
    evacuationTitle: 'निकासी मार्ग',
    safePath: 'सुरक्षित मार्ग',
    emergencyHeader: 'आपातकालीन नंबर',
    crowdsource: 'धुआं या आग की सूचना दें',
  },
};

export default function CitizenServices({ onShowToast }: Props) {
  const [lang, setLang] = useState<Lang>('en');
  const t = CONTENT[lang];

  function handleSos() {
    onShowToast('🚨 Emergency SOS broadcasted: Ticket #SOS-OD-9041 logged with Angul Incident Command');
  }

  function handleAction(name: string) {
    onShowToast(`Opened: ${name}`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Language Toggle */}
      <div className="flex items-center gap-1.5 self-start bg-[#141824] p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            lang === 'en' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLang('or')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            lang === 'or' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          ଓଡ଼ିଆ
        </button>
        <button
          onClick={() => setLang('hi')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            lang === 'hi' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          हिन्दी
        </button>
      </div>

      {/* Main Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white tracking-tight">{t.title}</h1>
        <p className="text-xs text-white/50">{t.subtitle}</p>
      </div>

      {/* Big Red SOS Button */}
      <button
        onClick={handleSos}
        className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <span>{t.sos}</span>
      </button>

      {/* Active Alerts Near You */}
      <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e121b]">
          <span className="text-xs font-mono uppercase font-bold text-white/80">
            {t.alertsHeader}
          </span>
          <span className="text-xs font-mono text-white/40">{t.district}</span>
        </div>

        <div className="divide-y divide-white/5 font-mono text-xs">
          {/* Alert 1 */}
          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold">04:31</span>
              <span className="text-white font-sans text-xs">
                Industrial fire in Angul — stay indoors, close windows
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
              CRITICAL
            </span>
          </div>

          {/* Alert 2 */}
          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold">03:05</span>
              <span className="text-white font-sans text-xs">
                Wildfire moving NE from Mahanadi forest zone
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
              HIGH
            </span>
          </div>

          {/* Alert 3 */}
          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold">02:18</span>
              <span className="text-white font-sans text-xs">
                Stubble burning alert — avoid outdoor activity today
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
              MODERATE
            </span>
          </div>
        </div>
      </div>

      {/* Services Available (6 Cards in 3x2 Grid) */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold">
          {t.servicesHeader}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Nearest Shelter */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <Building2 size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">Nearest Shelter</h3>
              <p className="text-xs text-white/40 mt-0.5">Govt School, 1.2 km</p>
            </div>
            <button
              onClick={() => handleAction('Get Directions to Govt School')}
              className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold self-start"
            >
              Get Directions
            </button>
          </div>

          {/* Card 2: Emergency Hospital */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
                <Hospital size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">Emergency Hospital</h3>
              <p className="text-xs text-white/40 mt-0.5">District Hospital, 3.4 km</p>
            </div>
            <button
              onClick={() => handleAction('Calling District Hospital: 06764-230400')}
              className="mt-4 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold self-start"
            >
              Call Now
            </button>
          </div>

          {/* Card 3: Food & Water */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                <Droplets size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">Food &amp; Water</h3>
              <p className="text-xs text-white/40 mt-0.5">Relief camp open nearby</p>
            </div>
            <button
              onClick={() => handleAction('Viewing Relief Camp Location')}
              className="mt-4 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold self-start"
            >
              View Location
            </button>
          </div>

          {/* Card 4: Evacuation Bus */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <Bus size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">Evacuation Bus</h3>
              <p className="text-xs text-white/40 mt-0.5">Next pickup: 20 mins</p>
            </div>
            <button
              onClick={() => handleAction('Tracking Evacuation Bus #OD-08')}
              className="mt-4 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold self-start"
            >
              Track Bus
            </button>
          </div>

          {/* Card 5: Fuel Station */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                <Fuel size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">Fuel Station</h3>
              <p className="text-xs text-white/40 mt-0.5">Open, 1.8 km away</p>
            </div>
            <button
              onClick={() => handleAction('Navigating to IOCL Fuel Station')}
              className="mt-4 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold self-start"
            >
              Navigate
            </button>
          </div>

          {/* Card 6: Emergency Helpline */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-3">
                <PhoneCall size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">Emergency Helpline</h3>
              <p className="text-xs text-white/40 mt-0.5">NDRF: 1078 · Police: 112</p>
            </div>
            <button
              onClick={() => handleAction('Calling Helpline 1078')}
              className="mt-4 px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold self-start"
            >
              Call
            </button>
          </div>
        </div>
      </div>

      {/* Evacuation Route Box with Vector Route Map */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-white/80">
            {t.evacuationTitle}
          </span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            {t.safePath}
          </span>
        </div>

        {/* 3 Step Instructions */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
              1
            </span>
            <span className="text-white/80">
              Head to NH-55 via Market Road — <strong className="text-red-400">avoid Thermal Plant area</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
              2
            </span>
            <span className="text-white/80">
              Cross Brahmani river bridge — <strong className="text-emerald-400">open and clear</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
              3
            </span>
            <span className="text-white/80">
              Reach Govt High School — shelter, food, first aid ready
            </span>
          </div>
        </div>

        {/* Route Map Canvas */}
        <div className="relative h-64 w-full rounded-xl bg-[#0e121a] border border-white/10 overflow-hidden select-none">
          {/* Stylized OpenStreetMap vector rendering */}
          <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
            {/* Background subtle land/river */}
            <path d="M 0,160 Q 200,120 400,180 T 600,140" fill="none" stroke="#0284c7" strokeWidth="24" strokeOpacity="0.25" />
            <path d="M 0,80 L 600,110" fill="none" stroke="#334155" strokeWidth="4" strokeOpacity="0.5" />
            <path d="M 180,0 L 220,240" fill="none" stroke="#334155" strokeWidth="3" strokeOpacity="0.4" />

            {/* Evacuation Route Line (NH-55) */}
            <path
              d="M 120,160 Q 240,110 380,100 T 520,70"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray="6 4"
            />

            {/* NALCO / Angul Area Labels */}
            <text x="260" y="140" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="monospace">
              Angul
            </text>
            <text x="480" y="80" fill="#64748b" fontSize="11" fontFamily="monospace">
              NALCO
            </text>

            {/* Incident Zone 🔴 */}
            <g transform="translate(120, 160)">
              <circle r="14" fill="#ef4444" fillOpacity="0.3">
                <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="7" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
              <text x="14" y="4" fill="#fca5a5" fontSize="10" fontWeight="bold" fontFamily="monospace">
                Incident Zone
              </text>
            </g>

            {/* Safe Shelter 🟢 */}
            <g transform="translate(520, 70)">
              <circle r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <text x="-85" y="4" fill="#6ee7b7" fontSize="10" fontWeight="bold" fontFamily="monospace">
                Safe Shelter
              </text>
            </g>
          </svg>

          {/* Map Legend Bar */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-white/60 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Incident Zone
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Safe Shelter
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-cyan-400 inline-block"></span> Evacuation Route (NH-55)
              </span>
            </div>
            <div className="text-white/30">© OpenStreetMap contributors</div>
          </div>
        </div>
      </div>

      {/* Emergency Numbers (6 Grid) */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold">
          {t.emergencyHeader}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'NDRF', num: '1078' },
            { label: 'Police', num: '112' },
            { label: 'Ambulance', num: '108' },
            { label: 'Fire', num: '101' },
            { label: 'Disaster Mgmt', num: '1070' },
            { label: 'Women Help', num: '1091' },
          ].map(e => (
            <div
              key={e.label}
              onClick={() => onShowToast(`Calling ${e.label}: ${e.num}`)}
              className="bg-[#121622] border border-white/10 hover:border-white/20 p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
            >
              <div>
                <div className="text-[10px] font-mono text-white/40">{e.label}</div>
                <div className="text-base font-black font-mono text-white">{e.num}</div>
              </div>
              <PhoneCall size={14} className="text-cyan-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Crowdsource Report Footer */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#0e121a] border border-white/5">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-amber-400" />
          <span className="text-xs font-mono uppercase font-bold text-white/80">
            {t.crowdsource}
          </span>
        </div>
        <button
          onClick={() => onShowToast('Crowdsourced incident report modal opened')}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-colors"
        >
          CROWDSOURCE
        </button>
      </div>
    </div>
  );
}
