// SURAKSHA / FireSense — Unified Disaster Intelligence Landing Page
// React 18 Component

const { useState, useEffect, useRef } = React;

function SURAKSHALanding() {
  const [scrolled, setScrolled] = useState(false);
  const [activeHazard, setActiveHazard] = useState('cyclone'); // 'cyclone' | 'thermal'
  const [activeView, setActiveView] = useState(0); // 0: Analyst, 1: Command, 2: Field
  const [whatIfShift, setWhatIfShift] = useState(0);
  const [whatIfWind, setWhatIfWind] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute what-if live
  const calculateWhatIf = () => {
    if (whatIfShift > 20) {
      return { block: "Gop (Puri)", score: 91, wind: 236 + Math.round(whatIfWind * 2), reason: "Inland track displacement directly towards high-density rural blocks" };
    }
    if (whatIfShift < -20) {
      return { block: "Brahmagiri (Chilika)", score: 89, wind: 228 + Math.round(whatIfWind * 2), reason: "Littoral storm surge breach across Chilika lagoon fishing settlements" };
    }
    return { block: "Puri Sadar (Coast)", score: 94 + Math.round(whatIfWind * 0.2), wind: 215 + Math.round(whatIfWind * 2.15), reason: "Direct Category 4 eye landfall with maximum littoral storm surge" };
  };

  const whatIfResult = calculateWhatIf();

  const responseViews = [
    {
      title: activeHazard === 'cyclone' ? 'Cyclone Fani — Warning Tier Active' : 'Industrial Fire — Classified',
      desc: activeHazard === 'cyclone'
        ? 'IMD Bulletin #14 confirmed. 39 blocks scored by 6-factor model. Landfall projected at Puri Coast in 14.5 hours.'
        : 'Evidence panel: facility proximity HIGH, persistence HIGH (48/60 passes), FRP 42.8 MW. Counter-evidence disclosed for analyst review.',
      stat: activeHazard === 'cyclone' ? '94.3' : '91%',
      statLabel: activeHazard === 'cyclone' ? 'TOP PRIORITY SCORE · PURI' : 'CLASSIFICATION CONFIDENCE',
      stateIdx: 1
    },
    {
      title: activeHazard === 'cyclone' ? 'Dispatch Pre-Positioning Convoys' : 'Dispatch NDRF Team 3/4',
      desc: activeHazard === 'cyclone'
        ? 'NH-316 arterial exposure checked: PASSABLE. Staging base: Cuttack Central Logistics Depot outside 90 km/h wind envelope.'
        : 'Assets at risk: 82K population, power corridor, NH-55. Downwind corridor 2.1 km. Authority: Odisha Disaster Management.',
      stat: activeHazard === 'cyclone' ? '12 Depots' : '87',
      statLabel: activeHazard === 'cyclone' ? 'STAGING SITES READY' : 'RISK SCORE · CRITICAL',
      stateIdx: 2
    },
    {
      title: activeHazard === 'cyclone' ? 'Field Pre-Deployment — En Route' : 'En Route — ETA 14 min',
      desc: activeHazard === 'cyclone'
        ? 'ODRAF Unit 04 moving to Puri District Headquarters Hospital with 500kVA emergency generators. Route verified.'
        : 'Field terminal: safest approach via NH-55, water point at plant gate, wind NE 16 km/h. Acknowledge → Arrived → Contained.',
      stat: activeHazard === 'cyclone' ? '08:30' : '14',
      statLabel: activeHazard === 'cyclone' ? 'IST PROJECTED IMPACT' : 'MINUTES TO SCENE',
      stateIdx: 3
    }
  ];

  const currentView = responseViews[activeView];

  return (
    <div className="landing-wrapper">
      {/* ===================== NAV ===================== */}
      <nav id="nav" className={scrolled ? 'scrolled' : ''}>
        <div className="inner">
          <a className="brand" href="#">
            <span className="dot"></span>
            <span>SURAKSHA</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--gray)', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: '99px' }}>
              FIRESENSE PLATFORM
            </span>
          </a>

          <div className="nav-links">
            <a href="#hazards">Multi-Hazard</a>
            <a href="#whatif">What-If Engine</a>
            <a href="#interlocks">Safety Gates</a>
            <a href="#portals">5 Command Portals</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span className="status-chip">
              <span className="pulse" style={{ width: '7px', height: '7px' }}></span>
              NRT &bull; 100% OFFLINE READY
            </span>
            <a className="nav-cta" href="/dashboard?portal=cyclone">
              Launch Console <span className="arrow">&rarr;</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/static/media/hero_india_night.jpg"
            src="/static/media/viirs_earth_night_720p.mp4"
            className="ready"
          ></video>
          <div className="hero-signal">
            <div className="hv-scan"></div>
            <svg className="hv-terrain" viewBox="0 0 1200 460" preserveAspectRatio="xMidYMid slice">
              <path d="M-20,340 C160,300 300,360 460,330 C640,296 760,352 940,316 C1060,292 1150,320 1220,300" />
              <path d="M-20,380 C180,340 320,400 500,368 C680,336 800,390 980,352 C1090,330 1160,352 1220,336" />
              <path d="M-20,420 C200,384 340,440 540,404 C720,372 840,428 1020,392 C1120,372 1170,392 1220,380" />
            </svg>

            <div className="hv-crosshair">
              <div className="hv-glow"></div>
              <div className="hv-ring"></div>
              <div className="hv-ring r2"></div>
              <div className="hv-dot"></div>
            </div>

            <div className="hv-tag">
              <div className="t1">
                {activeHazard === 'cyclone' ? 'IMD · CYCLONE FANI RADAR' : 'VIIRS · THERMAL ANOMALY'}
              </div>
              <div className="t2">
                {activeHazard === 'cyclone' ? 'Puri Landfall — 215 km/h' : 'Industrial Fire — 91%'}
              </div>
              <div className="t3">
                {activeHazard === 'cyclone' ? 'VSCS Category 4 · 19.78°N 85.82°E' : 'FRP 42.8 MW · 30.70°N 76.71°E'}
              </div>
            </div>

            <div className="hv-meta">
              <div>
                <div className="k">TARGET SECTOR</div>
                <div className="v">{activeHazard === 'cyclone' ? 'Odisha Coastal Littoral' : '30.7046° N · 76.7104° E'}</div>
              </div>
              <div>
                <div className="k">SOURCE TELEMETRY</div>
                <div className="v">{activeHazard === 'cyclone' ? 'IMD Best Track 2019' : 'VIIRS · 375 m Sensor'}</div>
              </div>
              <div>
                <div className="k">PROVENANCE</div>
                <div className="v">{activeHazard === 'cyclone' ? 'REPLAY (OFFICIAL)' : 'OBSERVED NRT'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container hero-content">
          <div className="hero-eyebrow kicker">
            <span className="idx">SURAKSHA</span>
            <span style={{ width: '36px', height: '1px', background: 'var(--line)' }}></span>
            <span>NATIONAL DISASTER INTELLIGENCE PLATFORM</span>
          </div>

          <h1>
            From orbital signal<br />
            <span className="dim">to field command.</span>
          </h1>

          <p className="body-lg hero-sub">
            SURAKSHA unifies satellite thermal surveillance with physics-grounded cyclone landfall modeling. Turning raw telemetry into auditable, 6-factor risk triage before disasters strike.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="/dashboard?portal=cyclone">
              Launch Cyclone Command <span className="arrow">&rarr;</span>
            </a>
            <a className="btn btn-ghost" href="#whatif">
              Explore What-If Simulation
            </a>
          </div>

          {/* Active Hazard Quick Switcher */}
          <div style={{ marginTop: '50px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--gray-2)' }}>MISSION THEATRE:</span>
            <button
              onClick={() => setActiveHazard('cyclone')}
              style={{
                background: activeHazard === 'cyclone' ? 'var(--fire-soft)' : 'transparent',
                borderColor: activeHazard === 'cyclone' ? 'var(--fire)' : 'var(--line)',
                color: activeHazard === 'cyclone' ? 'var(--fire)' : 'var(--gray)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '99px',
                padding: '6px 16px',
                fontSize: '12px',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🌀 Cyclone Landfall (Odisha)
            </button>
            <button
              onClick={() => setActiveHazard('thermal')}
              style={{
                background: activeHazard === 'thermal' ? 'var(--ice-soft)' : 'transparent',
                borderColor: activeHazard === 'thermal' ? 'var(--ice)' : 'var(--line)',
                color: activeHazard === 'thermal' ? 'var(--ice)' : 'var(--gray)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '99px',
                padding: '6px 16px',
                fontSize: '12px',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔥 Thermal Anomalies (VIIRS)
            </button>
          </div>
        </div>
      </header>

      {/* ===================== 01 DUAL TELEMETRY ===================== */}
      <section id="hazards">
        <div className="container">
          <div className="section-head reveal in">
            <div className="kicker"><span className="idx">01 /</span> DUAL ORBITAL SENSORS</div>
            <h2>Every incident begins as an orbital signal.</h2>
            <p className="body-lg">
              NASA satellites scan India on every pass, while IMD atmospheric radars track cyclonic vortexes. SURAKSHA ingests both feeds the moment they update.
            </p>
          </div>

          <div className="stat-row reveal in">
            <div className="stat fire">
              <div className="n">215<span className="unit">km/h</span></div>
              <div className="l">Peak wind envelope tracking for Cyclone Fani across 39 coastal Odisha blocks.</div>
            </div>
            <div className="stat ice">
              <div className="n">375<span className="unit">m</span></div>
              <div className="l">VIIRS native resolution — every thermal hotspot located to a specific industrial plot or forest compartment.</div>
            </div>
            <div className="stat">
              <div className="n">&lt; 10<span className="unit">ms</span></div>
              <div className="l">Real-time what-if recalculation time with zero external network dependencies.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial media moment */}
      <div className="editorial reveal in" aria-label="Earth at night seen from space">
        <img
          src="/static/media/earth_at_night.jpg"
          alt="Earth at night from orbit: city lights tracing coastlines and river valleys"
          loading="lazy"
        />
        <div className="ed-cap">EARTH AT NIGHT &middot; VIIRS DNB &middot; NASA EARTH OBSERVATORY &middot; PUBLIC DOMAIN</div>
      </div>

      {/* ===================== 02 WHAT-IF RE-RANKING ENGINE ===================== */}
      <section id="whatif" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="section-head reveal in">
            <div className="kicker"><span className="idx">02 /</span> WHAT-IF SIMULATION LAYER</div>
            <h2>Drag the track.<br />The entire state re-ranks in 4 milliseconds.</h2>
            <p className="body-lg">
              During an escalating cyclone, command officers cannot wait for static reports. Slide the projected eye inland or intensify peak winds to see priorities, supply routes, and hospital exposures recalculate live.
            </p>
          </div>

          {/* Interactive Slider Widget in React */}
          <div className="classify-board reveal in" style={{ alignItems: 'stretch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    <span style={{ color: 'var(--white)' }}>Projected Track Offset (Coast vs. Inland)</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--fire)' }}>
                      {whatIfShift > 0 ? `+${whatIfShift} km Inland` : `${whatIfShift} km Littoral`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="5"
                    value={whatIfShift}
                    onChange={(e) => setWhatIfShift(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--fire)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontFamily: 'var(--mono)', color: 'var(--gray-2)', marginTop: '4px' }}>
                    <span>-50km (Chilika)</span>
                    <span>0km (Puri Landfall)</span>
                    <span>+50km (Khurda)</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    <span style={{ color: 'var(--white)' }}>Hazard Intensity Delta</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--ice)' }}>
                      {whatIfWind > 0 ? `+${whatIfWind}%` : `${whatIfWind}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="5"
                    value={whatIfWind}
                    onChange={(e) => setWhatIfWind(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--ice)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontFamily: 'var(--mono)', color: 'var(--gray-2)', marginTop: '4px' }}>
                    <span>-20% (Cat 3)</span>
                    <span>Baseline (215 km/h)</span>
                    <span>+20% (Super Cyclone)</span>
                  </div>
                </div>

                <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--gray-2)', marginBottom: '4px' }}>
                    RE-RANKED TOP PRIORITY ACTION:
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--white)' }}>
                    {whatIfResult.block}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>
                    {whatIfResult.reason}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', fontFamily: 'var(--mono)' }}>
                    <span style={{ color: 'var(--fire)' }}>SCORE: {whatIfResult.score}/100</span>
                    <span style={{ color: 'var(--ice)' }}>WIND: {whatIfResult.wind} km/h</span>
                    <span style={{ color: 'var(--gray)' }}>TAG: SIMULATED</span>
                  </div>
                </div>
              </div>

              {/* 6-Factor Breakdown */}
              <div className="evidence" style={{ margin: 0, maxWidth: '100%' }}>
                <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--gray)', marginBottom: '8px' }}>
                  6-FACTOR DECISION HEURISTIC WEIGHTS:
                </div>
                <div className="ev hot">
                  <div className="row"><span className="n">1. Peak Wind Decay</span><span className="v">30% WEIGHT</span></div>
                  <div className="track"><div className="fill" style={{ width: '95%' }}></div></div>
                </div>
                <div className="ev cool">
                  <div className="row"><span className="n">2. Rainfall &amp; Inundation</span><span className="v">20% WEIGHT</span></div>
                  <div className="track"><div className="fill" style={{ width: '85%' }}></div></div>
                </div>
                <div className="ev hot">
                  <div className="row"><span className="n">3. Storm Surge Littoral Proximity</span><span className="v">15% WEIGHT</span></div>
                  <div className="track"><div className="fill" style={{ width: '75%' }}></div></div>
                </div>
                <div className="ev cool">
                  <div className="row"><span className="n">4. Census Population &amp; Vulnerability</span><span className="v">20% WEIGHT</span></div>
                  <div className="track"><div className="fill" style={{ width: '80%' }}></div></div>
                </div>
                <div className="ev">
                  <div className="row"><span className="n">5. Critical Infrastructure Density</span><span className="v">10% WEIGHT</span></div>
                  <div className="track"><div className="fill" style={{ width: '70%' }}></div></div>
                </div>
                <div className="ev">
                  <div className="row"><span className="n">6. Urgency Window (&lt;6 hrs)</span><span className="v">5% WEIGHT</span></div>
                  <div className="track"><div className="fill" style={{ width: '100%' }}></div></div>
                </div>
                <div className="ev-note">
                  OPERATIONAL PRIORITY HEURISTIC &bull; SUPPLEMENTS, NEVER REPLACES, OFFICIAL IMD WARNINGS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 03 CONTEXT & SUPPLY ROUTES ===================== */}
      <section id="context">
        <div className="container">
          <div className="section-head reveal in">
            <div className="kicker"><span className="idx">03 /</span> LOGISTICS &amp; CORRIDORS</div>
            <h2>Know what routes are cut.<br />Know where to stage.</h2>
            <p className="body-lg">
              Official forecasts tell you a storm is arriving. SURAKSHA computes which highway corridors intersect destructive winds, and automatically selects the nearest safe staging depot outside the 90 km/h wind envelope.
            </p>
          </div>

          <div className="context-panel reveal in">
            <div className="context-map">
              <div className="hv-scan"></div>
              <div className="cm-node incident" style={{ left: '50%', top: '55%' }}>
                <div className="pin"></div>
                <div className="lbl">CYCLONE EYE · PURI COAST</div>
              </div>
              <div className="cm-node facility" style={{ left: '26%', top: '28%' }}>
                <div className="pin"></div>
                <div className="lbl">SAFE STAGING · CUTTACK DEPOT</div>
              </div>
              <div className="cm-node settlement" style={{ left: '74%', top: '35%' }}>
                <div className="pin"></div>
                <div className="lbl">AIIMS BHUBANESWAR · MONITORING</div>
              </div>
              <div className="cm-node settlement" style={{ left: '68%', top: '78%' }}>
                <div className="pin"></div>
                <div className="lbl">NH-316 ARTERY · CUT RATIO 68%</div>
              </div>
            </div>

            <div className="context-legend">
              <div className="cl-item">
                <div className="k">STRATEGIC ASSETS</div>
                <div className="v">42 Facilities <span className="lv lv-high">17 AT RISK</span></div>
              </div>
              <div className="cl-item">
                <div className="k">SUPPLY CORRIDOR</div>
                <div className="v">NH-316 to Puri <span className="lv lv-high">SEVERED</span></div>
              </div>
              <div className="cl-item">
                <div className="k">OPTIMAL STAGING</div>
                <div className="v">Cuttack Depot <span className="lv lv-med">SAFE (&lt;90 km/h)</span></div>
              </div>
              <div className="cl-item">
                <div className="k">HONESTY CONTRACT</div>
                <div className="v">Spatial check only <span className="lv lv-med">EVIDENCE REQ</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 04 SAFETY INTERLOCKS ===================== */}
      <section id="interlocks" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="risk-wrap">
            <div className="reveal in">
              <div className="kicker" style={{ marginBottom: '18px' }}>
                <span className="idx">04 /</span> ARCHITECTURAL SAFETY GATES
              </div>
              <div className="risk-number" style={{ fontSize: 'clamp(90px, 14vw, 180px)' }}>
                ARMED
              </div>
              <div className="risk-label">ZERO SILENT ESCALATIONS &bull; STRICT INTERLOCKS</div>
            </div>

            <div className="reveal in">
              <div className="risk-bars">
                <div className="rb">
                  <div className="row">
                    <span style={{ fontWeight: 600, color: 'var(--white)' }}>Stale-Data Refusal Gate</span>
                    <span className="pc">FEED &gt; 6 HRS REFUSED</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>
                    If incoming telemetry is stale, automated escalation is refused and the console forces REVIEW_REQUIRED.
                  </p>
                </div>

                <div className="rb">
                  <div className="row">
                    <span style={{ fontWeight: 600, color: 'var(--white)' }}>IMD Precedence Interlock</span>
                    <span className="pc">IMD OVERRIDES AI</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>
                    Whenever model estimates disagree with official meteorological alerts, official warnings strictly govern.
                  </p>
                </div>

                <div className="rb">
                  <div className="row">
                    <span style={{ fontWeight: 600, color: 'var(--white)' }}>Human Authorization Gate</span>
                    <span className="pc">SHA-256 AUDIT LOG</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>
                    Every consequential simulated dispatch requires explicit human operator sign-off before state transitions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 05 RESPONSE VIEW SWITCHER ===================== */}
      <section id="respond">
        <div className="container">
          <div className="section-head reveal in">
            <div className="kicker"><span className="idx">05 /</span> RESPOND</div>
            <h2>One incident.<br />One unified operational truth.</h2>
            <p className="body-lg">
              The same disaster event moves across intelligence analysts, government incident commanders, and field responder terminals without loss of provenance or telemetry detail.
            </p>
          </div>

          <div className="response-stage reveal in">
            <div className="rs-tabs">
              <div
                className={`rs-tab ${activeView === 0 ? 'active' : ''}`}
                onClick={() => setActiveView(0)}
              >
                ANALYST DOSSIER
              </div>
              <div
                className={`rs-tab ${activeView === 1 ? 'active' : ''}`}
                onClick={() => setActiveView(1)}
              >
                COMMAND CENTER
              </div>
              <div
                className={`rs-tab ${activeView === 2 ? 'active' : ''}`}
                onClick={() => setActiveView(2)}
              >
                FIELD RESPONDER
              </div>
            </div>

            <div className="rs-body">
              <div className="rs-main">
                <div className="rs-id">
                  {activeHazard === 'cyclone' ? 'OD-PUR-CYCLONE-FANI · PURI SECTOR' : 'INC-2847 · ANGUL INDUSTRIAL COMPLEX'}
                </div>
                <div className="t" id="rs-title">{currentView.title}</div>
                <div className="d" id="rs-desc">{currentView.desc}</div>
              </div>

              <div className="rs-side">
                <div className="big" id="rs-stat">{currentView.stat}</div>
                <div className="k" id="rs-stat-k">{currentView.statLabel}</div>
              </div>
            </div>

            <div className="rs-timeline">
              <div className={`rs-state ${currentView.stateIdx >= 0 ? 'done' : ''} ${currentView.stateIdx === 0 ? 'active' : ''}`}>
                DETECTED
              </div>
              <div className={`rs-state ${currentView.stateIdx >= 1 ? 'done' : ''} ${currentView.stateIdx === 1 ? 'active' : ''}`}>
                WARNING / ASSESSED
              </div>
              <div className={`rs-state ${currentView.stateIdx >= 2 ? 'done' : ''} ${currentView.stateIdx === 2 ? 'active' : ''}`}>
                DISPATCHED / APPROVED
              </div>
              <div className={`rs-state ${currentView.stateIdx >= 3 ? 'done' : ''} ${currentView.stateIdx === 3 ? 'active' : ''}`}>
                EN ROUTE
              </div>
              <div className={`rs-state ${currentView.stateIdx >= 4 ? 'done' : ''} ${currentView.stateIdx === 4 ? 'active' : ''}`}>
                CONTAINED / RESOLVED
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 06 FIVE PORTALS ===================== */}
      <section id="portals" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="section-head reveal in">
            <div className="kicker"><span className="idx">PLATFORM CONSOLES</span></div>
            <h2>Five experiences.<br />One national mission.</h2>
          </div>

          <div className="portal-grid">
            <a className="portal reveal in" href="/dashboard?portal=cyclone">
              <div className="pk">01</div>
              <h3>Cyclone Command</h3>
              <div className="pv">Prioritize &amp; Simulate.</div>
              <p>
                39 coastal block choropleths, what-if track drag re-ranking, highway severance detection, and Cuttack staging recommendations.
              </p>
              <span className="link-arrow">ENTER CONSOLE <span className="arrow">&rarr;</span></span>
            </a>

            <a className="portal reveal in" href="/dashboard?portal=command">
              <div className="pk">02</div>
              <h3>Incident Command</h3>
              <div className="pv">Coordinate &amp; Dispatch.</div>
              <p>
                Multi-agency response coordination, NDRF unit utilization meters, human-authorized simulated dispatches, and inter-state relief.
              </p>
              <span className="link-arrow">ENTER CONSOLE <span className="arrow">&rarr;</span></span>
            </a>

            <a className="portal intel reveal in" href="/dashboard?portal=ntro">
              <div className="pk">03</div>
              <h3>NTRO Intelligence</h3>
              <div className="pv">Detect &amp; Verify.</div>
              <p>
                NASA FIRMS VIIRS Day/Night passes, 60-day baseline temporal recurrence, FRP heat output, and AI anomaly classification.
              </p>
              <span className="link-arrow">ENTER CONSOLE <span className="arrow">&rarr;</span></span>
            </a>

            <a className="portal reveal in" href="/dashboard?portal=responder">
              <div className="pk">04</div>
              <h3>First Responders</h3>
              <div className="pv">Navigate &amp; Act.</div>
              <p>
                Field terminal for deployed units: tactical checklist, site GPS coordinates, verified access routes, and progressive lifecycle states.
              </p>
              <span className="link-arrow">ENTER CONSOLE <span className="arrow">&rarr;</span></span>
            </a>

            <a className="portal reveal in" href="/dashboard?portal=citizen">
              <div className="pk">05</div>
              <h3>Citizen Safety</h3>
              <div className="pv">Alert &amp; Protect.</div>
              <p>
                Multi-lingual public warnings, nearest cyclone shelter finder, zero-data SMS broadcast routing, and simulated emergency SOS triage.
              </p>
              <span className="link-arrow">ENTER CONSOLE <span className="arrow">&rarr;</span></span>
            </a>
          </div>

          {/* Tech Flow Diagram */}
          <div style={{ marginTop: '90px' }} className="reveal in">
            <div className="kicker" style={{ justifyContent: 'center', marginBottom: '30px' }}>
              <span className="idx">BUILT ON</span>&nbsp;VERIFIED DATA PIPELINES
            </div>
            <div className="tech-flow">
              <div className="tf-node hot">IMD BEST TRACK &amp; VIIRS</div>
              <div className="tf-arrow">&rarr;</div>
              <div className="tf-node">SPATIAL POSTGIS INTERSECT</div>
              <div className="tf-arrow">&rarr;</div>
              <div className="tf-node hot">6-FACTOR HEURISTIC</div>
              <div className="tf-arrow">&rarr;</div>
              <div className="tf-node">SAFETY INTERLOCK GATE</div>
              <div className="tf-arrow">&rarr;</div>
              <div className="tf-node hot">WHAT-IF RE-RANK</div>
              <div className="tf-arrow">&rarr;</div>
              <div className="tf-node">HUMAN DISPATCH</div>
            </div>
            <div className="tech-drawer">
              <span>Census 2011 Data</span> &middot; OpenStreetMap Roads &middot; OSDMA Strategic Assets &middot; Fast Leaflet GIS &middot; Zero-WiFi Guarantee
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="cta-band">
        <div className="container reveal in">
          <h2>See what matters.<br /><span style={{ color: 'var(--gray-2)' }}>Before landfall arrives.</span></h2>
          <p className="body-lg">The 100% offline simulation environment is operational right now.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/dashboard?portal=cyclone">
              Launch SURAKSHA Console <span className="arrow">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer>
        <div className="f-main">
          <div className="f-brand">
            <div className="brand"><span className="dot"></span>SURAKSHA / FireSense</div>
            <div className="tag">National satellite disaster intelligence &amp; cyclone prioritization decision support.</div>
            <div className="live">
              <span className="pulse" style={{ width: '7px', height: '7px' }}></span>
              SIH-26162 &bull; NTRO MISSION &bull; 100% OFFLINE READY
            </div>
          </div>

          <div className="f-col">
            <div className="h">CYCLONE INTEL</div>
            <a href="/dashboard?portal=cyclone">Cyclone Command</a>
            <a href="/dashboard?portal=cyclone">What-If Simulation</a>
            <a href="/dashboard?portal=cyclone">Reasons Drawer</a>
          </div>

          <div className="f-col">
            <div className="h">ORBITAL HEAT</div>
            <a href="/dashboard?portal=ntro">NTRO Intelligence</a>
            <a href="/dashboard?portal=ntro">VIIRS 375m Telemetry</a>
            <a href="/dashboard?portal=ntro">Temporal Persistence</a>
          </div>

          <div className="f-col">
            <div className="h">RESPONSE</div>
            <a href="/dashboard?portal=command">Government Command</a>
            <a href="/dashboard?portal=responder">Responder Console</a>
            <a href="/dashboard?portal=citizen">Citizen Emergency SOS</a>
          </div>

          <div className="f-col">
            <div className="h">RESOURCES</div>
            <a href="/api/area-risk">Area Risk API</a>
            <a href="/api/what-if">What-If Recompute API</a>
            <a href="/briefing">6-Line Situation Briefing</a>
          </div>
        </div>

        <div className="f-bottom">
          <span className="meta">
            &copy; 2026 SURAKSHA / FireSense &bull; Built for SIH-26162 (NTRO Collaboration) &bull; Provenance: IMD Official, NASA FIRMS &amp; OSM.
          </span>
          <span className="meta">
            <a href="/dashboard">Launch Platform &rarr;</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

// Mount to DOM Root
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<SURAKSHALanding />);
}
