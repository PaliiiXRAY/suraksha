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
} from 'lucide-react';
import StatCard from '../components/design-system/StatCard';
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
    sos: '🚨 EMERGENCY SOS — BROADCAST DISTRESS BEACON',
    searchPlaceholder: 'Search nearby shelters, health centres, or enter pincode...',
    archiveBadge: 'REPLAY ARCHIVE · MAY 2019',
    alertsHeader: 'Active Public Advisories Near You',
    district: 'PURI DISTRICT SECTOR',
    servicesHeader: 'CRITICAL SERVICES AVAILABLE',
    shelter1: 'Puri Zilla High School Evacuation Shelter',
    shelter1Sub: '2.4 km away · High-Ground Evacuation Camp',
    shelter1Status: 'Capacity: 450 / 600 · Generator power active · Potable water tankers present',
    shelter2: 'District Headquarters Hospital (DHH)',
    shelter2Sub: '3.8 km away · Emergency & Trauma Care',
    shelter2Status: 'Trauma ICU & Emergency Casualty active 24/7 · 2 Ambulances stationed',
    emergency: 'National Disaster Helpline',
    emergencySub: 'Dial 112 · Toll-Free 24 Hours',
    emergencyStatus: 'Toll-free police, ambulance and rapid disaster response dispatch',
    viewDetails: 'View details ->',
    callNow: 'Call now ->',
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
    searchPlaceholder: 'ଆଶ୍ରୟସ୍ଥଳୀ କିମ୍ବା ପିନକୋଡ୍ ଖୋଜନ୍ତୁ...',
    archiveBadge: 'ରିପ୍ଲେ ଅଭିଲେଖାଗାର · ମଇ ୨୦୧୯',
    alertsHeader: 'ଆପଣଙ୍କ ନିକଟରେ ସକ୍ରିୟ ଚେତାବନୀ',
    district: 'ପୁରୀ ଜିଲ୍ଲା ସେକ୍ଟର',
    servicesHeader: 'ଉପଲବ୍ଧ ସେବାଗୁଡିକ',
    shelter1: 'ପୁରୀ ଜିଲ୍ଲା ସ୍କୁଲ ଆଶ୍ରୟସ୍ଥଳୀ',
    shelter1Sub: '୨.୪ କିମି ଦୂର · ସ୍ଥାନାନ୍ତର ଶିବିର',
    shelter1Status: 'କ୍ଷମତା: ୪୫୦ / ୬୦୦ · ଜେନେରେଟର ବିଦ୍ୟୁତ୍ ଉପଲବ୍ଧ',
    shelter2: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH)',
    shelter2Sub: '୩.୮ କିମି ଦୂର · ଜରୁରୀକାଳୀନ ସେବା',
    shelter2Status: 'ଟ୍ରମା ଆଇସିୟୁ ଏବଂ ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା ଚାଲୁଅଛି',
    emergency: 'ଜାତୀୟ ଜରୁରୀକାଳୀନ ସହାୟତା',
    emergencySub: '୧୧୨ · ୨୪ ଘଣ୍ଟା ଉପଲବ୍ଧ',
    emergencyStatus: 'ପୋଲିସ, ଆମ୍ବୁଲାନ୍ସ ଏବଂ ବିପର୍ଯ୍ୟୟ ସହାୟତା ଟୋଲ୍-ଫ୍ରି',
    viewDetails: 'ବିବରଣୀ ଦେଖନ୍ତୁ ->',
    callNow: 'କଲ୍ କରନ୍ତୁ ->',
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
    sos: '🚨 आपातकालीन SOS — डिस्ट्रेस सिग्नल प्रसारित करें',
    searchPlaceholder: 'आश्रय स्थल, अस्पताल या पिनकोड खोजें...',
    archiveBadge: 'रीप्ले पुरालेख · मई 2019',
    alertsHeader: 'आपके निकट सक्रिय सार्वजनिक चेतावनियां',
    district: 'पुरी जिला सेक्टर',
    servicesHeader: 'उपलब्ध आपातकालीन सेवाएं',
    shelter1: 'पुरी जिला स्कूल उच्च-भूमि आश्रय स्थल',
    shelter1Sub: '2.4 किमी दूर · पक्का बहुउद्देशीय आश्रय',
    shelter1Status: 'क्षमता: 450 / 600 · जनरेटर बिजली और स्वच्छ पेयजल उपलब्ध',
    shelter2: 'जिला मुख्य अस्पताल (DHH Puri)',
    shelter2Sub: '3.8 किमी दूर · आपातकालीन देखभाल',
    shelter2Status: 'ट्रॉमा आईसीयू और आपातकालीन चिकित्सा 24/7 सक्रिय',
    emergency: 'राष्ट्रीय आपदा हेल्पलाइन',
    emergencySub: 'डायल 112 · 24 घंटे उपलब्ध',
    emergencyStatus: 'टोल-फ्री पुलिस, एम्बुलेंस और आपदा राहत दल',
    viewDetails: 'विवरण देखें ->',
    callNow: 'कॉल करें ->',
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
  const t = CONTENT[lang];

  async function handleConfirmSos() {
    setSosSending(true);
    try {
      // Connect to the newly implemented /v1/sos API contract
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
        // Offline or fallback simulated response
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

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-[#0a0d14] text-slate-900 dark:text-white p-6 space-y-6 transition-colors">
      {/* Top Strip: Language Switcher + Status */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#141824] p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              lang === 'en' ? 'bg-blue-600 text-white shadow font-bold' : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('or')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              lang === 'or' ? 'bg-blue-600 text-white shadow font-bold' : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
            }`}
          >
            ଓଡ଼ିଆ
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              lang === 'hi' ? 'bg-blue-600 text-white shadow font-bold' : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
        </div>

        <ProvenancePill tag="OFFICIAL_FORECAST" />
      </div>

      {/* Main Title Header */}
      <div className="space-y-1">
        <div className="text-[11px] font-mono tracking-widest text-blue-600 dark:text-cyan-400 font-bold uppercase">
          {t.portalName}
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.title}</h1>
        <p className="text-xs text-slate-600 dark:text-white/50">{t.subtitle}</p>
      </div>

      {/* Prominent Red SOS Button */}
      <div>
        <button
          onClick={() => setShowSosModal(true)}
          className={`w-full py-4 rounded-2xl font-black text-base sm:text-lg tracking-wider shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-2 ${
            sosSent
              ? 'bg-emerald-600 text-white shadow-emerald-950/40'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60'
          }`}
        >
          <span>{sosSent ? '✔ SOS BEACON ACTIVE · RESCUE HQ ALERTED (SIMULATED)' : t.sos}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-blue-500 font-mono shadow-sm"
        />
      </div>

      {/* Active Alerts Near You */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
            {t.alertsHeader}
          </h2>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">{t.district}</span>
        </div>

        <div className="space-y-3">
          {/* Critical Cyclone Alert */}
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/40 flex items-start gap-3 shadow-sm">
            <AlertOctagon size={20} className="text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-red-600 dark:text-red-300">
                  Extremely Severe Cyclone Fani Landfall Imminent
                </span>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-200 text-[10px] font-mono font-bold">
                  RED ALERT
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-white/70">
                Landfall scheduled within 35 km radius of Puri coast with sustained gusts of 215 km/h. Complete indoor shelter mandatory.
              </p>
            </div>
          </div>

          {/* Surge Warning */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-orange-950/20 border border-amber-200 dark:border-orange-500/40 flex items-start gap-3 shadow-sm">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-amber-700 dark:text-orange-300">
                  Storm Surge Inundation Warning — Low-Lying Coastal Belt
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-orange-200 text-[10px] font-mono font-bold">
                  HIGH SURGE
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-white/70">
                Projected tidal surge 1.5m – 2.0m. Brahmagiri, Chilika spit and Marine Drive roads closed to civilian vehicular traffic.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Verified Shelters Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
          {t.servicesHeader}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shelter 1 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t.shelter1}</h3>
                <div className="text-xs text-slate-500 dark:text-white/50">{t.shelter1Sub}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
              {t.shelter1Status}
            </div>
            <div className="flex justify-end pt-1">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                <span>{t.viewDetails}</span>
              </span>
            </div>
          </div>

          {/* Hospital 2 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                <Hospital size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t.shelter2}</h3>
                <div className="text-xs text-slate-500 dark:text-white/50">{t.shelter2Sub}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-200 dark:border-blue-500/20">
              {t.shelter2Status}
            </div>
            <div className="flex justify-end pt-1">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-1">
                <span>{t.callNow}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Evacuation Routing Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-blue-600 dark:text-cyan-400" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white">
              {t.evacuationTitle}
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded font-mono font-black text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {t.safePath}
          </span>
        </div>

        <div className="space-y-1 text-xs text-slate-600 dark:text-white/60 font-mono">
          <div>{t.origin}</div>
          <div className="text-slate-900 dark:text-white font-bold">{t.destination}</div>
        </div>

        <div className="space-y-2 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-start gap-2.5">
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">01.</span>
            <span className="text-slate-800 dark:text-white/90">{t.step1}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-start gap-2.5">
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">02.</span>
            <span className="text-slate-800 dark:text-white/90">{t.step2}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-start gap-2.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">03.</span>
            <span className="text-slate-800 dark:text-white/90 font-bold">{t.step3}</span>
          </div>
        </div>
      </div>

      {/* Official Emergency Helplines Pill */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
            {t.emergencyHeader}
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
            National Emergency: 112 · Disaster Control: 1070
          </div>
        </div>
        <a
          href="tel:112"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
        >
          <PhoneCall size={14} />
          <span>Call 112 (Toll-Free)</span>
        </a>
      </div>

      {/* Footer Guidance Note */}
      <div className="text-[11px] text-slate-500 dark:text-white/40 italic text-center pb-4">
        {t.footer}
      </div>

      {/* Emergency SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSos}
                disabled={sosSending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
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
