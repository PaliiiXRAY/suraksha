# SURAKSHA — Decision Log

Every entry: what we chose, why, and what we rejected. Judges love teams that can defend a *negative* decision.

## D1. Rule-based scoring, not ML — 2026-10-29
**Choice:** transparent weighted 6-factor scoring with `reasons[]`.
**Why:** no validated cyclone-impact training data exists for our region; an uncalibrated ML model would be theater. A commander must be able to audit *why* a block is Priority 1. Deterministic rules also make the what-if re-rank instant and reproducible.
**Rejected:** XGBoost/neural risk models (insufficient data, non-explainable), LLM-generated scores (non-deterministic).
*Note:* FireSense's existing XGBoost classifier stays for the thermal-anomaly hazard, where it was trained and validated.

## D2. Replay-first demo (Cyclone Fani 2019) — 2026-10-29
**Choice:** default demo runs entirely from a pre-downloaded, timestamped Fani replay pack; live IMD/MOSDAC feeds are an optional toggle.
**Why:** venue wifi at hackathons fails constantly. A demo that white-screens on network loss loses competitions. Replay also gives a *known* event to validate against.
**Rejected:** live-only demo (fragile), pure synthetic demo (dishonest, fails judge scrutiny).
**Cost:** we maintain a 4-tier fallback cascade (IMD API → CAP RSS → cache → replay).

## D3. One authoritative backend (`backend/app/`) — 2026-10-29
**Choice:** all new work extends the FastAPI app under `backend/app/` (verified from code: routers, RBAC, models, alembic). Legacy `app.py` + flat `backend/*.py` modules are frozen.
**Why:** two divergent backends caused past bugs. The modern one has the auth/audit/test foundation the cyclone MVP needs.
**Rejected:** extending `app.py` (no RBAC/audit foundation), rewriting from scratch (throws away 119 passing tests).

## D4. Build-less frontend — 2026-10-29
**Choice:** command dashboard as static HTML + ES modules + CDN (Tailwind, MapLibre), served by FastAPI.
**Why:** no Node toolchain at the venue; `npm install`/Vite build failures are a classic demo-killer. Any laptop with Docker runs the full stack.
**Rejected:** React/Vite rebuild (build step + dependency risk), reusing the legacy JSX pages (would require the build chain we're avoiding).

## D5. IMD wins, always — 2026-10-29
**Choice:** deterministic interlock: when our model estimate disagrees with an official IMD warning, IMD governs and the UI displays the disagreement.
**Why:** this is a national-security decision-support tool. Overriding an official meteorological warning with an unvalidated estimate is dangerous and legally indefensible. Surfacing the disagreement is *more* informative than silently picking one.
**Rejected:** model-override (unsafe), silent merge (dishonest — hides conflict).

## D6. Depth over breadth: Odisha only — 2026-10-29
**Choice:** real block polygons, real Fani track/warning data, real strategic assets — for the Odisha coast + inland flood blocks only.
**Why:** all-India coverage in 24h means fake-precise data everywhere. Depth is judge-proof: every number traces to a source. The engine itself is region-agnostic — other states are config, not code.
**Rejected:** all-India demo (superficial), single-district demo (too small to show logistics value).

## D7. Route *exposure*, not routing — 2026-10-29
**Choice:** flag road/rail segments by intersection length with the hazard footprint (>50% = CUT, >10% = AT_RISK, else PASSABLE-with-evidence). No pathfinding, no convoy optimization.
**Why:** spatial intersection is honest and verifiable in PostGIS; real routing/scheduling is a different product that can't be built or validated in the window. A route is never called PASSABLE without evidence (absence of data ≠ safe).
**Rejected:** OSRM/graph routing (scope explosion), inventory/fleet optimization (off-mission, B2B framing).

## D8. Provenance tags on every number — 2026-10-29
**Choice:** every score/badge carries OFFICIAL_FORECAST / OBSERVED / MODEL_ESTIMATE / REPLAY / SIMULATED / INSUFFICIENT_DATA.
**Why:** the platform's credibility is its product. Judges and commanders must always know what kind of claim they're reading. Also structurally prevents the "is this live?" trap during demos.
**Rejected:** implicit provenance (context-only) — too easy to misread under time pressure.

## D9. Patterns from reference projects, code from scratch — 2026-10-29
**Choice:** adopt architecture *patterns* studied from comparable award-winning projects (fallback cascades, safety interlocks, documentation-as-craft); write all code originally.
**Why:** hackathon originality rules; also, copied code you can't defend in Q&A is a liability. The patterns — not the code — were the valuable part.
**Rejected:** vendoring external repos (disqualification risk), reimplementing their domain-specific machinery (mismatched stack, wasted hours).

## D10. Multi-hazard pitch, cyclone-only build — 2026-10-29
**Choice:** the platform is described as multi-hazard; only the cyclone workflow is built end-to-end for the demo. Post-landfall thermal anomalies reuse the existing (already working) FireSense FIRMS pipeline as the honest second hazard.
**Why:** claiming three working hazards before one is reliable is exactly the placeholder-as-complete failure mode. The existing thermal pipeline is real, tested code — reusing it costs nothing.
**Rejected:** building cyclone + flood + fire end-to-end in 24h (three shallow demos), claiming flood/earthquake support we can't show.
