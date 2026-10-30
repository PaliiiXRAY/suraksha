// ─────────────────────────────────────────────────────────────────────────────
// CitizenServices.tsx — Tab 4 matching video frames 00:23 - 00:29
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Search, AlertOctagon, PhoneCall, Building2, Hospital, ArrowRight, ShieldCheck } from 'lucide-react';

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
    shelter2: 'District HQ Hospital',
    shelter2Sub: '3.8 km away · Emergency care',
    emergency: 'National Emergency',
    emergencySub: '112 · Available 24 hrs',
    viewDetails: 'View details ->',
    callNow: 'Call now ->',
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
    shelter2: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH)',
    shelter2Sub: '୩.୮ କିମି ଦୂର · ଜରୁରୀକାଳୀନ ସେବା',
    emergency: 'ଜାତୀୟ ଜରୁରୀକାଳୀନ ସହାୟତା',
    emergencySub: '୧୧୨ · ୨୪ ଘଣ୍ଟା ଉପଲବ୍ଧ',
    viewDetails: 'ବିବରଣୀ ଦେଖନ୍ତୁ ->',
    callNow: 'କଲ୍ କରନ୍ତୁ ->',
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
    shelter2: 'जिला मुख्य अस्पताल (DHH)',
    shelter2Sub: '3.8 किमी दूर · आपातकालीन देखभाल',
    emergency: 'राष्ट्रीय आपातकालीन सेवा',
    emergencySub: '112 · 24 घंटे उपलब्ध',
    viewDetails: 'विवरण देखें ->',
    callNow: 'कॉल करें ->',
    footer:
      'आधिकारिक मार्गदर्शन: IMD, NDMA और स्थानीय अधिकारियों द्वारा जारी निर्देशों का पालन करें। सुरक्षा आधिकारिक चेतावनियों का पूरक है, उनका स्थान नहीं लेता।',
  },
};

export default function CitizenServices({ onShowToast }: Props) {
  const [lang, setLang] = useState<Lang>('en');
  const [search, setSearch] = useState('Puri');
  const t = CONTENT[lang];

  function handleSos() {
    onShowToast('SOS ticket #SOS-OD-9041 broadcasted to Puri Incident Command (Simulated)');
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

      {/* Search Input with Replay Archive Badge */}
      <div className="flex items-center justify-between bg-[#121622] border border-white/10 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5 flex-1">
          <Search size={16} className="text-white/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="bg-transparent text-sm text-white placeholder-white/40 outline-none w-full font-medium"
          />
        </div>
        <span className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
          {t.archiveBadge}
        </span>
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
              <span className="text-white/40 font-bold">04:30</span>
              <span className="text-white font-sans text-xs">
                Very severe cyclone warning — shelter indoors away from windows
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
              CRITICAL
            </span>
          </div>

          {/* Alert 2 */}
          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold">03:15</span>
              <span className="text-white font-sans text-xs">
                Storm surge expected along low-lying coastal areas
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
              EVACUATE
            </span>
          </div>

          {/* Alert 3 */}
          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold">02:18</span>
              <span className="text-white font-sans text-xs">
                NH-316 traffic restricted to emergency vehicles
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
              ADVISORY
            </span>
          </div>
        </div>
      </div>

      {/* Services Available */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold">
          {t.servicesHeader}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Service 1 */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <Building2 size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">{t.shelter1}</h3>
              <p className="text-xs text-white/40 mt-1">{t.shelter1Sub}</p>
            </div>
            <button
              onClick={() => onShowToast('Shelter details loaded')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 mt-4"
            >
              <span>{t.viewDetails}</span>
            </button>
          </div>

          {/* Service 2 */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
                <Hospital size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">{t.shelter2}</h3>
              <p className="text-xs text-white/40 mt-1">{t.shelter2Sub}</p>
            </div>
            <button
              onClick={() => onShowToast('Hospital emergency unit status: Operational')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 mt-4"
            >
              <span>{t.viewDetails}</span>
            </button>
          </div>

          {/* Service 3 */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <PhoneCall size={16} />
              </div>
              <h3 className="font-bold text-sm text-white">{t.emergency}</h3>
              <p className="text-xs text-white/40 mt-1">{t.emergencySub}</p>
            </div>
            <button
              onClick={() => onShowToast('Calling 112 (Simulated emergency dispatch hotline)')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 mt-4"
            >
              <span>{t.callNow}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="p-4 rounded-xl bg-[#0e121b] border border-white/5 text-xs text-white/40 leading-relaxed font-sans">
        {t.footer}
      </div>
    </div>
  );
}
