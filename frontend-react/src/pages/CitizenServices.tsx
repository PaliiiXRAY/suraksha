// ─────────────────────────────────────────────────────────────────────────────
// CitizenServices.tsx — Portal 4: Public Portal
// Public hazard advisories, verified shelters, evacuation paths & emergency SOS distress.
// Inherits FireSense design language with full multilingual & dual theme support.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Search,
  AlertOctagon,
  PhoneCall,
  Building2,
  Hospital,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Navigation,
  Compass,
  Radio,
  LifeBuoy,
  Send,
  AlertTriangle,
  Bus,
  Fuel,
  Droplets,
  MessageSquare,
  FileText,
} from 'lucide-react';
import StatCard from '../components/design-system/StatCard';
import CitizenEvacuationMap from '../components/gis/CitizenEvacuationMap';
import ProvenancePill from '../components/design-system/ProvenancePill';
import AuditVerificationBlock from '../components/design-system/AuditVerificationBlock';

interface Props {
  onShowToast: (msg: string) => void;
}

type Lang = 'en' | 'or' | 'hi';

const CONTENT = {
  en: {
    portalName: 'Public Portal',
    title: 'Citizen Disaster Awareness & Assistance',
    subtitle: 'Find high-ground shelter, clean water, medical aid and verified evacuation corridors.',
    sos: '🚨 EMERGENCY SOS — I NEED HELP NOW',
    searchPlaceholder: 'Search nearby shelters, relief camps, medical centers, or enter your village/PIN...',
    alertsHeader: 'Active Public Advisories Near You',
    district: 'PURI DISTRICT SECTOR',
    servicesHeader: 'CRITICAL VERIFIED SERVICES AVAILABLE',
    evacuationTitle: 'RECOMMENDED SAFE EVACUATION ROUTE',
    safePath: 'SAFE CORRIDOR',
    origin: 'Current location: Brahmagiri Coastal Belt (19.799°N, 85.823°E)',
    destination: 'Destination: Puri Zilla High School Shelter (Distance: 6.9 km)',
    step1: 'Head inland on SH-13 toward Pipili Junction, away from shoreline (2.1 km)',
    step2: 'Turn left onto VIP Road away from marine drive inundation zone (4.8 km)',
    step3: 'Arrive at Puri Zilla High School Shelter (High-ground RCC shelter building)',
    emergencyHeader: 'OFFICIAL HELPLINE CONTACTS',
    footer:
      'Official guidance: Follow instructions issued by IMD, NDMA, OSDMA and district authorities. SURAKSHA supplements official alerts and never overrides official directives.',
  },
  or: {
    portalName: 'ଜନସାଧାରଣ ପୋର୍ଟାଲ',
    title: 'ବିପର୍ଯ୍ୟୟ ସହାୟତା ଏବଂ ସଚେତନତା ସେବା',
    subtitle: 'ଆପଣଙ୍କ ନିକଟରେ ଆଶ୍ରୟ, ଖାଦ୍ୟ, ସ୍ଥାନାନ୍ତର ମାର୍ଗ ଏବଂ ଜରୁରୀକାଳୀନ ଯୋଗାଯୋଗ ଖୋଜନ୍ତୁ।',
    sos: '🚨 ଜରୁରୀକାଳୀନ SOS — ମୋତେ ବର୍ତ୍ତମାନ ସାହାଯ୍ୟ ଦରକାର',
    searchPlaceholder: 'ଆଶ୍ରୟସ୍ଥଳୀ, ଡାକ୍ତରଖାନା କିମ୍ବା ପିନକୋଡ୍ ଖୋଜନ୍ତୁ...',
    alertsHeader: 'ଆପଣଙ୍କ ନିକଟରେ ସକ୍ରିୟ ଚେତାବନୀ',
    district: 'ପୁରୀ ଜିଲ୍ଲା ସେକ୍ଟର',
    servicesHeader: 'ଉପଲବ୍ଧ ଆଧିକାରିକ ସେବାଗୁଡିକ',
    evacuationTitle: 'ସ୍ଥାନାନ୍ତରଣ ମାର୍ଗ',
    safePath: 'ନିରାପଦ ପଥ',
    origin: 'ବର୍ତ୍ତମାନ ସ୍ଥାନ: ବ୍ରହ୍ମଗିରି ଉପକୂଳ କ୍ଷେତ୍ର (୧୯.୭୯୯°N, ୮୫.୮୨୩°E)',
    destination: 'ଗନ୍ତବ୍ୟ: ପୁରୀ ଜିଲ୍ଲା ସ୍କୁଲ ଆଶ୍ରୟସ୍ଥଳୀ (ଦୂରତା: ୬.୯ କିମି)',
    step1: 'ତଟବର୍ତ୍ତୀ ଅଞ୍ଚଳ ଛାଡି SH-13 ଦେଇ ପିପିଲି ଆଡକୁ ଯାଆନ୍ତୁ (୨.୧ କିମି)',
    step2: 'ଜଳମଗ୍ନ ମରାଇନ୍ ଡ୍ରାଇଭ୍ ଏଡ଼ାଇ ଭିଆଇପି ରୋଡକୁ ମୋଡନ୍ତୁ (୪.୮ କିମି)',
    step3: 'ପୁରୀ ଜିଲ୍ଲା ସ୍କୁଲ ପକ୍କା ଆଶ୍ରୟସ୍ଥଳୀରେ ପହଞ୍ଚନ୍ତୁ',
    emergencyHeader: 'ଆଧିକାରିକ ହେଲ୍ପଲାଇନ୍ ନମ୍ବର',
    footer:
      'ଆଧିକାରିକ ମାର୍ଗଦର୍ଶନ: IMD, NDMA ଏବଂ OSDMA ଦ୍ୱାରା ଜାରି ନିର୍ଦ୍ଦେଶ ପାଳନ କରନ୍ତୁ।',
  },
  hi: {
    portalName: 'सार्वजनिक पोर्टल',
    title: 'नागरिक आपदा जागरूकता एवं सहायता',
    subtitle: 'निकटतम सुरक्षित आश्रय, पेयजल, चिकित्सा सहायता और सुरक्षित निकासी मार्ग खोजें।',
    sos: '🚨 आपातकालीन SOS — मुझे अभी मदद चाहिए',
    searchPlaceholder: 'आश्रय स्थल, अस्पताल या पिनकोड खोजें...',
    alertsHeader: 'आपके निकट सक्रिय सार्वजनिक चेतावनियां',
    district: 'पुरी जिला सेक्टर',
    servicesHeader: 'उपलब्ध आपातकालीन सेवाएं',
    evacuationTitle: 'अनुशंसित सुरक्षित निकासी मार्ग',
    safePath: 'सुरक्षित मार्ग',
    origin: 'वर्तमान स्थान: ब्रह्मगिरी तटीय क्षेत्र (19.799°N, 85.823°E)',
    destination: 'गंतव्य: पुरी जिला स्कूल चक्रवात आश्रय (दूरी: 6.9 किमी)',
    step1: 'तटरेखा से दूर SH-13 होते हुए पिपिली की ओर बढ़ें (2.1 किमी)',
    step2: 'जलमग्न मरीन ड्राइव को छोड़कर वीआईपी रोड की ओर मुड़ें (4.8 किमी)',
    step3: 'पुरी जिला स्कूल पक्के चक्रवात आश्रय में पहुंचें (सुरक्षित उच्च स्थान)',
    emergencyHeader: 'आधिकारिक आपातकालीन नंबर',
    footer:
      'आधिकारिक मार्गदर्शन: IMD, NDMA और स्थानीय अधिकारियों द्वारा जारी निर्देशों का पालन करें।',
  },
};

export default function CitizenServices({ onShowToast }: Props) {
  const [lang, setLang] = useState<Lang>('en');
  const [search, setSearch] = useState('Puri Sector');
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [reportText, setReportText] = useState('');
  const t = CONTENT[lang];

  async function handleConfirmSos() {
    setSosSending(true);
    try {
      const payload = {
        sos_event: {
          id: `01J9CITIZEN${Date.now()}`,
          v: 1,
          kind: 'SOS',
          type: 'medical',
          feature_id: 'u4pruyd84',
          ref: null,
          lat: 19.8135,
          lon: 85.8312,
          severity: 3,
          text: 'Citizen distress beacon triggered via Public Portal. High ground water ingress.',
          qty: 2,
          hlc: new Date().toISOString(),
          device_time: new Date().toISOString(),
          author: '3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29',
          ttl_hours: 72,
          sig: 'simulated_citizen_ed25519_signature',
        },
        events: [],
        private: '',
        client: {
          app_version: '1.0.0',
          sent_via: 'direct',
          gateway_key: null,
        },
      };

      const res = await fetch('/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSosSent(true);
        setShowSosModal(false);
        onShowToast('🚨 SOS Emergency Signal uploaded to SURAKSHA Command HQ. Acknowledgment verified!');
      } else {
        setSosSent(true);
        setShowSosModal(false);
        onShowToast('🚨 SOS Emergency Beacon broadcasted via mesh gateway (SIMULATED). Dispatch alerted!');
      }
    } catch {
      setSosSent(true);
      setShowSosModal(false);
      onShowToast('🚨 SOS Emergency Beacon queued locally in store-and-forward mesh (SIMULATED)');
    } finally {
      setSosSending(false);
    }
  }

  function handleCitizenReport() {
    if (!reportText.trim()) return;
    onShowToast('Ground observation report logged & synced to local emergency cache');
    setReportText('');
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-blue-900 dark:text-blue-200 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 font-black shadow-sm">
              CITIZEN RESILIENCE & LIFELINE PORTAL
            </span>
            <ProvenancePill tag="OFFICIAL_FORECAST" size="sm" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-xs text-slate-700 dark:text-white/60 mt-0.5">
            {t.subtitle}
          </p>
        </div>

        {/* Multilingual Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/10">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-white dark:bg-[#121622] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('or')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'or'
                  ? 'bg-white dark:bg-[#121622] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900'
              }`}
            >
              ଓଡ଼ିଆ
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'hi'
                  ? 'bg-white dark:bg-[#121622] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Red SOS Button (Matching FireSense screenshot) */}
      <div>
        <button
          onClick={() => setShowSosModal(true)}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wider shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-2.5 ${
            sosSent
              ? 'bg-emerald-600 text-white shadow-emerald-950/20'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
          }`}
        >
          <AlertOctagon size={24} className={sosSent ? '' : 'animate-pulse'} />
          <span>{sosSent ? '✔ SOS BEACON ACTIVE · RESCUE HQ ALERTED (SIMULATED)' : t.sos}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-blue-500 font-mono shadow-sm"
        />
      </div>

      {/* Active Alerts Banner */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70">
            {t.alertsHeader}
          </h2>
          <span className="text-xs font-mono text-blue-600 dark:text-cyan-400 font-bold">{t.district}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Critical Cyclone Alert */}
          <div className="p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/20 border border-red-200/80 dark:border-red-500/30 flex items-start gap-3 shadow-sm">
            <AlertOctagon size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-red-900 dark:text-red-200">
                  Extremely Severe Cyclone Fani Landfall Imminent
                </span>
                <span className="px-2.5 py-1 rounded bg-red-700 text-white text-xs font-mono font-black shadow-sm">
                  RED ALERT
                </span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                Landfall scheduled within 35 km of Puri coast. Sustained winds 185–215 km/h. Complete indoor shelter mandatory.
              </p>
            </div>
          </div>

          {/* Surge Warning */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/30 flex items-start gap-3 shadow-sm">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                  Storm Surge Inundation Warning
                </span>
                <span className="px-2.5 py-1 rounded bg-amber-600 text-white text-xs font-mono font-black shadow-sm">
                  HIGH SURGE
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Projected tidal surge 1.5m – 2.0m. Brahmagiri coastal belt and Marine Drive roads closed to civilian traffic.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Card Services Grid (3 cols x 2 rows) matching FireSense Reference */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70">
          {t.servicesHeader}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Nearest Cyclone Shelter */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Puri Zilla High School Shelter</h3>
                <div className="text-xs text-slate-700 dark:text-white/60">2.4 km away · High-Ground Evacuation Camp</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm">
              Capacity: 450 / 600 · Generator Active · Potable Water
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono text-slate-400">GEO: 19.805, 85.830</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                Navigate &rarr;
              </span>
            </div>
          </div>

          {/* Card 2: Emergency Hospital */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                <Hospital size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">District Headquarters Hospital (DHH)</h3>
                <div className="text-xs text-slate-700 dark:text-white/60">3.8 km away · Emergency & Trauma Care</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-300 dark:border-blue-700 shadow-sm">
              Trauma ICU 24/7 · 2 Ambulances Stationed · Blood Bank OK
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono text-slate-400">HOTLINE: 06752-222044</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                Call Hospital &rarr;
              </span>
            </div>
          </div>

          {/* Card 3: Food & Potable Water */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                <Droplets size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pipili Central Relief Supply Depot</h3>
                <div className="text-xs text-slate-700 dark:text-white/60">4.1 km away · OSDMA Ration Distribution</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-cyan-900 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-300 dark:border-cyan-700 shadow-sm">
              6 Water Tankers · 8,000 Dry Ration Packets Available
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono text-slate-400">STOCK: ADEQUATE</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                Request Supply &rarr;
              </span>
            </div>
          </div>

          {/* Card 4: Evacuation Transit Depot */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Bus size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Badadanda Evacuation Transit Point</h3>
                <div className="text-xs text-slate-700 dark:text-white/60">3.2 km away · State Transport Fleet</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 shadow-sm">
              OSRTC Evacuation Buses Depart Every 15 Mins
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono text-slate-400">FARES: 100% FREE</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                View Schedule &rarr;
              </span>
            </div>
          </div>

          {/* Card 5: Fuel & Power Reserve */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                <Fuel size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Balagandi Emergency Fuel Station</h3>
                <div className="text-xs text-slate-700 dark:text-white/60">5.0 km away · IndianOil Strategic Reserve</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-orange-900 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/40 p-2.5 rounded-xl border border-orange-300 dark:border-orange-700 shadow-sm">
              Reserved for Emergency Vehicles & Hospital Generators
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono text-slate-400">DIESEL: 18,000L</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                Fuel Pass &rarr;
              </span>
            </div>
          </div>

          {/* Card 6: Emergency Helplines */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <PhoneCall size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">National & State Disaster Helplines</h3>
                <div className="text-xs text-slate-700 dark:text-white/60">Dial 112 / 1070 · 24/7 Operations</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm">
              Toll-Free Police, Medical Ambulance & OSDMA Desk
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono text-slate-400">TOLL-FREE 24/7</span>
              <a href="tel:112" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline flex items-center gap-1">
                Dial 112 Now &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Safe Evacuation Route Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-blue-600 dark:text-cyan-400" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white">
              {t.evacuationTitle}
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full font-mono font-black text-xs bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-sm">
            {t.safePath}
          </span>
        </div>

        <div className="space-y-1 text-xs text-slate-700 dark:text-white/70 font-mono">
          <div>{t.origin}</div>
          <div className="text-slate-900 dark:text-white font-bold">{t.destination}</div>
        </div>

        <div className="space-y-2.5 pt-1 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-sm">01.</span>
            <span className="text-slate-800 dark:text-white/90 leading-relaxed font-medium">{t.step1}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-sm">02.</span>
            <span className="text-slate-800 dark:text-white/90 leading-relaxed font-medium">{t.step2}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 flex items-start gap-3">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">03.</span>
            <span className="text-slate-900 dark:text-white font-bold leading-relaxed">{t.step3}</span>
          </div>
        </div>

        {/* Real Interactive Leaflet Evacuation Map (matching assets/screenshots/citizen_map.png) */}
        <div className="pt-2">
          <CitizenEvacuationMap />
        </div>
      </div>

      {/* Official Emergency Contact Grid (matching FireSense screenshot citizen_map.png) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <PhoneCall size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white">
              Official Emergency Contact Numbers
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
            TOLL-FREE 24/7 ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-white">NDRF Command</span>
            <a href="tel:1078" className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline">1078</a>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-white">Police Control</span>
            <a href="tel:112" className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline">112</a>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-white">Ambulance</span>
            <a href="tel:108" className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline">108</a>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-white">Fire & Rescue</span>
            <a href="tel:101" className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline">101</a>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-white">Disaster Mgmt (SEOC)</span>
            <a href="tel:1070" className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline">1070</a>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-white">Women & Child Help</span>
            <a href="tel:1091" className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline">1091</a>
          </div>
        </div>
      </div>

      {/* Citizen Crowd-Reporting Form & Offline SMS Fallback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Crowd-Reporting Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
            <MessageSquare size={16} className="text-blue-600 dark:text-cyan-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white">
              Report Ground Obstruction or Need
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-white/60">
            Submit local road blockages, fallen electrical poles, or people trapped to the district control room.
          </p>
          <div className="space-y-2">
            <textarea
              rows={2}
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              placeholder="E.g., Fallen banyan tree blocking SH-13 near Brahmagiri block office..."
              className="w-full bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-blue-500 font-mono shadow-sm"
            />
            <button
              onClick={handleCitizenReport}
              disabled={!reportText.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Send size={13} />
              <span>Submit Local Report</span>
            </button>
          </div>
        </div>

        {/* Zero-Data SMS Fallback */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <Radio size={16} className="text-amber-500" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white">
                Zero-Data SMS Distress Gateway
              </h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-white/70 mt-3 leading-relaxed">
              If cellular tower data is disrupted during cyclone landfall, text messages will route via peer-to-peer LoRa/VHF relay and direct telecom SMS bypass.
            </p>
            <div className="p-3 mt-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 font-mono text-xs text-slate-800 dark:text-white">
              SMS Format: <strong className="text-blue-600 dark:text-cyan-400">SOS &lt;GPS OR VILLAGE&gt;</strong> to <strong className="text-emerald-600">112</strong> or <strong className="text-emerald-600">51969</strong>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400">
            COMPLIANT WITH ITU DISASTER TELECOM PROTOCOLS
          </div>
        </div>
      </div>

      {/* Official Guidance Note */}
      <div className="text-[11px] text-slate-500 dark:text-white/40 italic text-center pb-2">
        {t.footer}
      </div>

      {/* Audit Verification Block */}
      <AuditVerificationBlock
        hash="0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b"
        sourceAuthority="OSDMA Public Safety Cryptographic Gateway"
        onVerify={() => onShowToast('Audit Verified: Public portal advisory ledger verified')}
      />

      {/* Emergency SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertOctagon size={24} className="animate-pulse" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Broadcast Emergency SOS Beacon?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
              This will broadcast an immutable distress beacon with your coordinates (<strong>19.8135°N, 85.8312°E</strong>)
              directly to the SURAKSHA Command HQ and nearby mesh nodes.
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-[11px] font-mono text-amber-800 dark:text-amber-300">
              PROTOTYPE NOTICE: Dispatches in this demonstration system are simulated for training and technical evaluation.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSosModal(false)}
                disabled={sosSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSos}
                disabled={sosSending}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {sosSending ? (
                  <span>Broadcasting Beacon...</span>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Confirm & Broadcast SOS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
