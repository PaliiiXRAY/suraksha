// ─────────────────────────────────────────────────────────────────────────────
// CitizenServices.tsx — Tab 4 matching 8.16.10 PM canonical UI + 8.37.45 PM features
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
    searchPlaceholder: 'Puri',
    archiveBadge: 'REPLAY ARCHIVE · MAY 2019',
    alertsHeader: 'Active Alerts Near You',
    district: 'PURI DISTRICT',
    servicesHeader: 'SERVICES AVAILABLE',
    shelter1: 'Puri Zilla School',
    shelter1Sub: '2.4 km away · Evacuation camp',
    shelter1Status: 'Capacity: 450 / 600 · Generator power active',
    shelter2: 'District HQ Hospital',
    shelter2Sub: '3.8 km away · Emergency care',
    shelter2Status: 'Trauma ICU & Emergency Casualty active 24/7',
    emergency: 'National Emergency',
    emergencySub: '112 · Available 24 hrs',
    emergencyStatus: 'Toll-free police, ambulance & disaster dispatch',
    viewDetails: 'View details ->',
    callNow: 'Call now ->',
    evacuationTitle: 'EVACUATION ROUTE',
    safePath: 'SAFE PATH',
    origin: 'Current location: Brahmagiri Coastal Belt (19.799°N, 85.823°E)',
    destination: 'Destination: Puri Zilla School Cyclone Shelter (Distance: 6.9 km)',
    step1: 'Head inland on SH-13 toward Pipili Junction, away from shoreline (2.1 km)',
    step2: 'Turn left onto VIP Road away from marine drive inundation zone (4.8 km)',
    step3: 'Arrive at Puri Zilla School Cyclone Evacuation Shelter (High-ground RCC)',
    emergencyHeader: 'OFFICIAL EMERGENCY NUMBERS',
    footer:
      'Official guidance: Follow instructions issued by IMD, NDMA and local authorities. SURAKSHA supplements official warnings and never replaces them.',
  },
  or: {
    title: 'ବିପର୍ଯ୍ୟୟ ସହାୟତା ସେବା',
    subtitle: 'ଆପଣଙ୍କ ନିକଟରେ ଆଶ୍ରୟ, ଖାଦ୍ୟ, ସ୍ଥାନାନ୍ତର ମାର୍ଗ ଏବଂ ଜରୁରୀକାଳୀନ ଯୋଗାଯୋଗ ଖୋଜନ୍ତୁ।',
    sos: '🚨 SOS — ମୋତେ ବର୍ତ୍ତମାନ ସାହାଯ୍ୟ ଦରକାର',
    searchPlaceholder: 'ପୁରୀ',
    archiveBadge: 'ରିପ୍ଲେ ଅଭିଲେଖାଗାର · ମଇ ୨୦୧୯',
    alertsHeader: 'ଆପଣଙ୍କ ନିକଟରେ ସକ୍ରିୟ ଚେତାବନୀ',
    district: 'ପୁରୀ ଜିଲ୍ଲା',
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
    destination: 'ଗନ୍ତବ୍ୟସ୍ଥଳ: ପୁରୀ ଜିଲ୍ଲା ସ୍କୁଲ ବାତ୍ୟା ଆଶ୍ରୟସ୍ଥଳୀ (ଦୂରତା: ୬.୯ କିମି)',
    step1: 'ସମୁଦ୍ରକୂଳଠାରୁ ଦୂରକୁ ଯାଇ SH-13 ଦେଇ ପିପିଲି ଆଡକୁ ଯାଆନ୍ତୁ (୨.୧ କିମି)',
    step2: 'ବନ୍ୟା ପ୍ରଭାବିତ ମାରିନ୍ ଡ୍ରାଇଭ୍ ଛାଡି ଭିଆଇପି ରୋଡ୍ କୁ ବୁଲନ୍ତୁ (୪.୮ କିମି)',
    step3: 'ପୁରୀ ଜିଲ୍ଲା ସ୍କୁଲ ପକ୍କା ବାତ୍ୟା ଆଶ୍ରୟସ୍ଥଳୀରେ ପହଞ୍ଚନ୍ତୁ (ସୁରକ୍ଷିତ ଉଚ୍ଚ ସ୍ଥାନ)',
    emergencyHeader: 'ସରକାରୀ ଜରୁରୀକାଳୀନ ନମ୍ବର',
    footer:
      'ସରକାରୀ ନିର୍ଦ୍ଦେଶାବଳୀ: IMD, NDMA ଏବଂ ସ୍ଥାନୀୟ ପ୍ରଶାସନ ଦ୍ୱାରା ଜାରି କରାଯାଇଥିବା ନିର୍ଦ୍ଦେଶ ଅନୁସରଣ କରନ୍ତୁ। ସୁରକ୍ଷା ଅଫିସିଆଲ୍ ଚେତାବନୀକୁ ସମର୍ଥନ କରେ, ବଦଳାଏ ନାହିଁ।',
  },
  hi: {
    title: 'आपदा सहायता सेवा',
    subtitle: 'अपने निकटतम आश्रय, भोजन, निकासी मार्ग और आपातकालीन संपर्क खोजें।',
    sos: '🚨 SOS — मुझे अभी सहायता चाहिए',
    searchPlaceholder: 'पुरी',
    archiveBadge: 'रीप्ले पुरालेख · मई 2019',
    alertsHeader: 'आपके निकट सक्रिय अलर्ट',
    district: 'पुरी जिला',
    servicesHeader: 'उपलब्ध सेवाएं',
    shelter1: 'पुरी जिला स्कूल आश्रय',
    shelter1Sub: '2.4 किमी दूर · निकासी शिविर',
    shelter1Status: 'क्षमता: 450 / 600 · जनरेटर बिजली उपलब्ध',
    shelter2: 'जिला मुख्य अस्पताल (DHH)',
    shelter2Sub: '3.8 किमी दूर · आपातकालीन देखभाल',
    shelter2Status: 'ट्रॉमा आईसीयू और आपातकालीन चिकित्सा 24/7 सक्रिय',
    emergency: 'राष्ट्रीय आपातकालीन सेवा',
    emergencySub: '112 · 24 घंटे उपलब्ध',
    emergencyStatus: 'टोल-फ्री पुलिस, एम्बुलेंस और आपदा राहत',
    viewDetails: 'विवरण देखें ->',
    callNow: 'कॉल करें ->',
    evacuationTitle: 'निकासी मार्ग',
    safePath: 'सुरक्षित मार्ग',
    origin: 'वर्तमान स्थान: ब्रह्मगिरी तटीय क्षेत्र (19.799°N, 85.823°E)',
    destination: 'गंतव्य: पुरी जिला स्कूल चक्रवात आश्रय (दूरी: 6.9 किमी)',
    step1: 'तटरेखा से दूर SH-13 होते हुए पिपिली की ओर बढ़ें (2.1 किमी)',
    step2: 'जलमग्न मरीन ड्राइव को छोड़कर वीआईपी रोड की ओर मुड़ें (4.8 किमी)',
    step3: 'पुरी जिला स्कूल पक्के चक्रवात आश्रय में पहुंचें (सुरक्षित उच्च स्थान)',
    emergencyHeader: 'आधिकारिक आपातकालीन नंबर',
    footer:
      'आधिकारिक मार्गदर्शन: IMD, NDMA और स्थानीय अधिकारियों द्वारा जारी निर्देशों का पालन करें। सुरक्षा आधिकारिक चेतावनियों का पूरक है, उनका स्थान नहीं लेता।',
  },
};

export default function CitizenServices({ onShowToast }: Props) {
  const [lang, setLang] = useState<Lang>('en');
  const [search, setSearch] = useState('Puri');
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosType, setSosType] = useState('surge');
  const t = CONTENT[lang];

  function handleTriggerSos() {
    setShowSosModal(true);
  }

  function handleConfirmSos() {
    setShowSosModal(false);
    onShowToast('🚨 SOS Emergency Beacon #SOS-OD-2019-9041 broadcasted to Puri Incident Command Center');
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Language Toggle matching 8.16.10 PM */}
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

      {/* Main Header matching 8.16.10 PM */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white tracking-tight">{t.title}</h1>
        <p className="text-xs text-white/50">{t.subtitle}</p>
      </div>

      {/* Prominent Red SOS Button matching 8.16.10 PM */}
      <div>
        <button
          onClick={handleTriggerSos}
          className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-lg tracking-wider shadow-lg shadow-red-950/60 transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span>{t.sos}</span>
        </button>
      </div>

      {/* Search Bar matching 8.16.10 PM */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-[#121622] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 font-mono"
        />
      </div>

      {/* Replay Archive Tag */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1.5">
          <Radio size={12} className="text-amber-400" />
          <span>{t.archiveBadge}</span>
        </span>
      </div>

      {/* Active Alerts Near You matching 8.16.10 PM */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-white/80">
            {t.alertsHeader}
          </h2>
          <span className="text-xs font-mono text-cyan-400 font-bold">{t.district}</span>
        </div>

        <div className="space-y-2.5">
          {/* Alert 1 */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 flex items-start gap-3">
            <AlertOctagon size={18} className="text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-red-300">
                  Extremely Severe Cyclone Fani Landfall Imminent
                </span>
                <span className="px-2 py-0.5 rounded bg-red-500/30 text-red-200 text-[10px] font-mono font-bold">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-white/70">
                Landfall scheduled within 35 km radius of Puri coast with sustained gusts of 215 km/h. Complete indoor shelter mandatory.
              </p>
            </div>
          </div>

          {/* Alert 2 */}
          <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/40 flex items-start gap-3">
            <AlertOctagon size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-orange-300">
                  Storm Surge Inundation Warning - Puri Coastal Belt
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-500/30 text-orange-200 text-[10px] font-mono font-bold">
                  HIGH
                </span>
              </div>
              <p className="text-xs text-white/70">
                Astronomical tide + 1.8m surge flood forecast for Brahmagiri & Puri coastlines. Evacuate all kutcha and ground-level dwellings.
              </p>
            </div>
          </div>

          {/* Alert 3 */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex items-start gap-3">
            <AlertOctagon size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-amber-300">
                  Power Grid Precautionary Shutdown
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-mono font-bold">
                  MODERATE
                </span>
              </div>
              <p className="text-xs text-white/70">
                33kV and 11kV transmission lines de-energized to prevent electrocution hazard. Emergency shelters running on diesel generators.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Available (Cards) matching 8.16.10 PM */}
      <div className="space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-white/80">
          {t.servicesHeader}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Cyclone Shelter */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Building2 size={16} />
                <span className="text-[10px] font-mono uppercase font-bold">CYCLONE SHELTER</span>
              </div>
              <h3 className="font-bold text-base text-white">{t.shelter1}</h3>
              <p className="text-xs text-white/50">{t.shelter1Sub}</p>
              <div className="text-[11px] font-mono text-emerald-400 mt-2">{t.shelter1Status}</div>
            </div>

            <button
              onClick={() => onShowToast('Navigating to Puri Zilla School Shelter')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start"
            >
              <span>{t.viewDetails}</span>
            </button>
          </div>

          {/* Card 2: Hospital */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Hospital size={16} />
                <span className="text-[10px] font-mono uppercase font-bold">EMERGENCY HOSPITAL</span>
              </div>
              <h3 className="font-bold text-base text-white">{t.shelter2}</h3>
              <p className="text-xs text-white/50">{t.shelter2Sub}</p>
              <div className="text-[11px] font-mono text-emerald-400 mt-2">{t.shelter2Status}</div>
            </div>

            <button
              onClick={() => onShowToast('Calling District HQ Hospital Emergency: 06752-222044')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start"
            >
              <span>{t.callNow}</span>
            </button>
          </div>

          {/* Card 3: Emergency Helpline */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <PhoneCall size={16} />
                <span className="text-[10px] font-mono uppercase font-bold">NATIONAL HELPLINE</span>
              </div>
              <h3 className="font-bold text-base text-white">{t.emergency}</h3>
              <p className="text-xs text-white/50">{t.emergencySub}</p>
              <div className="text-[11px] font-mono text-emerald-400 mt-2">{t.emergencyStatus}</div>
            </div>

            <button
              onClick={() => onShowToast('Calling National Disaster Helpline 112')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start"
            >
              <span>{t.callNow}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Evacuation Route with OpenStreetMap Vector Visual matching 8.16.10 PM */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
              {t.evacuationTitle}
            </div>
            <h3 className="text-base font-bold text-white">{t.destination}</h3>
            <p className="text-xs text-white/50 font-mono mt-0.5">{t.origin}</p>
          </div>

          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span>{t.safePath}</span>
          </span>
        </div>

        {/* Vector Route Canvas */}
        <div className="h-44 bg-[#0a0d14] rounded-lg border border-white/5 relative overflow-hidden flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 600 160">
            {/* Grid */}
            <defs>
              <pattern id="route-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeOpacity="0.04" />
              </pattern>
            </defs>
            <rect width="100%" height="160" fill="url(#route-grid)" />

            {/* Coastal flood zone */}
            <rect x="0" y="110" width="600" height="50" fill="#ef4444" fillOpacity="0.1" />
            <text x="30" y="140" fill="#ef4444" fontSize="10" fontFamily="monospace">
              🌊 COASTAL STORM SURGE DANGER SWATH (AVOID)
            </text>

            {/* Inundated Marine Drive (Cut) */}
            <path d="M 60 120 L 540 120" stroke="#f87171" strokeWidth="2" strokeDasharray="4 4" />
            <text x="380" y="115" fill="#f87171" fontSize="9" fontFamily="monospace">
              Marine Drive (INUNDATED · CUT)
            </text>

            {/* Safe High-Ground Route (Green) */}
            <path
              d="M 80 100 L 180 50 L 340 50 L 480 70"
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Origin Node */}
            <circle cx="80" cy="100" r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <text x="80" y="85" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              START
            </text>

            {/* Intermediate Node */}
            <circle cx="260" cy="50" r="4" fill="#10b981" />
            <text x="260" y="40" fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Pipili Bypass High Ground
            </text>

            {/* Destination Node */}
            <circle cx="480" cy="70" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text x="480" y="55" fill="#34d399" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              SHELTER
            </text>
          </svg>
        </div>

        {/* Turn-by-Turn Steps */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-start gap-2.5 p-2 rounded bg-[#0e121b] border border-white/5">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
              1
            </span>
            <span className="text-white/80">{t.step1}</span>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded bg-[#0e121b] border border-white/5">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
              2
            </span>
            <span className="text-white/80">{t.step2}</span>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded bg-[#0e121b] border border-white/5">
            <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              3
            </span>
            <span className="text-emerald-300 font-semibold">{t.step3}</span>
          </div>
        </div>
      </div>

      {/* Official Emergency Numbers Footer matching 8.16.10 PM */}
      <div className="p-4 rounded-xl bg-[#121622] border border-white/10 space-y-2">
        <div className="text-[11px] font-mono uppercase text-white/50 font-bold tracking-wider">
          {t.emergencyHeader}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2 rounded bg-[#0e121b] border border-white/5">
            <div className="text-white/40 text-[10px]">STATE SEOC</div>
            <div className="font-bold text-cyan-300">1070</div>
          </div>
          <div className="p-2 rounded bg-[#0e121b] border border-white/5">
            <div className="text-white/40 text-[10px]">PURI DEOC</div>
            <div className="font-bold text-cyan-300">1077</div>
          </div>
          <div className="p-2 rounded bg-[#0e121b] border border-white/5">
            <div className="text-white/40 text-[10px]">NDRF HELPLINE</div>
            <div className="font-bold text-cyan-300">011-24363260</div>
          </div>
          <div className="p-2 rounded bg-[#0e121b] border border-white/5">
            <div className="text-white/40 text-[10px]">ODRAF CONTROL</div>
            <div className="font-bold text-cyan-300">0674-2534177</div>
          </div>
        </div>
      </div>

      {/* Official guidance disclaimer matching 8.16.10 PM */}
      <p className="text-[11px] text-white/40 text-center">{t.footer}</p>

      {/* Interactive Rapid SOS Modal (from 8.37.45 PM) */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider">
                  EMERGENCY CITIZEN SOS BEACON · SIMULATED
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1">Broadcast SOS Request</h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Direct dispatch beacon to Puri Incident Command Center
                </p>
              </div>
              <button
                onClick={() => setShowSosModal(false)}
                className="text-white/40 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-[#0a0d14] p-4 rounded-xl border border-white/10 text-xs font-mono">
              <div className="flex justify-between text-white/60">
                <span>GPS POSITION:</span>
                <span className="font-bold text-white">19.7991°N · 85.8239°E (Brahmagiri)</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>TARGET SHELTER:</span>
                <span className="font-bold text-cyan-300">Puri Zilla School (2.4 km)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-white/80">Select Emergency Type:</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { id: 'surge', label: 'Trapped in Surge Water' },
                  { id: 'medical', label: 'Medical Emergency' },
                  { id: 'collapse', label: 'Shelter Damage / Collapse' },
                  { id: 'ration', label: 'Need Food / Potable Water' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSosType(opt.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sosType === opt.id
                        ? 'bg-red-600/20 border-red-500 text-white font-bold'
                        : 'bg-[#0a0d14] border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSosModal(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSos}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/50"
              >
                Broadcast Simulated SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
