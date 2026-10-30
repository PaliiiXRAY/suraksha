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

## D11. Agent workflow rules: mandatory doc-sync + standing push authorization — 2026-10-30
**Choice:** three additions to `AGENTS.md`: (1) **standing push authorization** — agents commit and push verified changes without prompting, under ownership-scoped staging discipline (stage only files you changed; never `.env`/secrets/teammates' work); (2) **pre-execution audit** — five questions (system impact, security/RBAC boundaries, determinism vs LLM bypass, visible degradation, doc-sync) before any non-trivial edit; (3) **documentation synchronization in the Definition of Done** — ARCHITECTURE.md in-session for design/contract/security changes, a DECISIONS.md ADR for architectural/security/scope decisions, README.md only for material user-facing changes.
**Why:** documentation drift was already a live problem (duplicate SRS copies and incorrect migration paths found and repaired on 2026-10-30). Four team members running multiple AI-agent sessions need identical operating rules or behavior diverges. Standing push removes approval friction now explicitly granted by the team lead, while the staging rule addresses a real observed hazard: a teammate's in-flight `ci.yml` sat uncommitted in the working tree during exactly this session, and blind `git add -A` would have swept it in. The audit's determinism question directly protects the interlocks: the LLM briefing must never be able to bypass stale-refuse/IMD-wins gates.
**Rejected:** mandatory collapsible quiz blocks inside ADRs (ceremony that breaks format consistency with D1–D10 and consumes decision-time at 24h — judges read the rationale, not self-tests); adopting the reference project's rules verbatim (they were written for a different stack — smart contracts, C++ safety firewalls, EXIF crop imagery, rural field telemetry — only the transferable principles apply); blind unconditional `git add -A && push` (unsafe in a shared working tree with concurrent teammates).

## D12. Branch + PR enforcement on `main` — 2026-10-30
**Choice:** all members and their agents work on short-lived feature branches (`feat/`, `fix/`, `docs/`) and merge to `main` only through a pull request with **1 approving review**, enforced mechanically by GitHub branch protection (free, since the repository is public). The repo owner keeps a narrow exception for verified docs/hotfix commits. Direct-to-main pushes by teammates were already eliminated as an AGENTS.md rule before being locked by GitHub settings.
**Why:** four members with autonomous agent sessions pushing straight to `main` means one untested commit can break the shared demo stack with no attributable cause — at the worst possible hour of a 24-hour event. The team's own history already follows this pattern organically (PRs #8–#10); enforcement converts habit into guarantee. Status-check gating was deliberately **deferred**: the CI workflow just gained a PostGIS service and has not yet been proven green — requiring checks that are still flaky would deadlock the team mid-hackathon. Add that gate once CI is verified passing.
**Rejected:** everyone pushing directly to `main` with no guard (single point of catastrophic failure); requiring CI status checks before merge *now* (CI not yet validated — a red build would block all merges); a two-level integration-branch flow (`suraksha-cyclone` as staging → `main`, as RUNBOOK previously implied) — one level is enough for a 24-hour window and the extra hop adds stall risk.

## D13. Self-contained offline data pack and zero-WiFi demo guarantee — 2026-10-30
**Choice:** package verified Cyclone Fani (May 2019) best track points, official IMD warning archive bulletins, 39 Odisha coastal block polygons with 2011 Census populations, OpenStreetMap arterial road corridors, and 42 curated strategic assets (hospitals, shelters, NDRF bases, relief depots, ports, fuel terminals) into `db/seed/data/` under 110 KB total uncompressed size, documented in `db/seed/sources.md`.
**Why:** dead venue WiFi is the #1 failure mode in hackathons. Relying on live external APIs for primary judge demonstrations introduces unacceptable flakiness and latency. A curated, self-contained offline dataset guarantees that the core risk engine, asset exposure, what-if track re-rank, and task lifecycle execute in sub-second time on local hardware with zero network calls.
**Rejected:** live-only data fetching (brittle, breaks on network drop); multi-gigabyte raw GIS dumps (slows down container startup and bind mounts); purely synthetic dummy coordinates (dishonest, fails judge geographic audit).

## D14. Deterministic situation briefing template fallback — 2026-10-30
**Choice:** implement a deterministic, slot-filled 6-line natural-language situation briefing engine (`backend/app/services/risk/briefing_template.py`) grounded exclusively in structured risk engine outputs (`hazard_event`, `reasons[]`, `cut_routes`, `staging_rec`, `interlock_flags`).
**Why:** external LLM API calls are non-deterministic, have variable network latency (1–5 seconds), can fail or rate-limit under dead venue WiFi, and can introduce subtle hallucinations into life-critical disaster advice. A deterministic template fallback guarantees < 5ms generation time, zero external socket calls, 100% adherence to safety interlocks, and reproducible operational briefings.
**Rejected:** requiring an active OpenAI/Anthropic/Gemini API key for the baseline demo (violates zero-external-calls requirement); ungrounded free-form text generation (violates safety interlock interlock-first principle).


## D15. Dual-tier real-time what-if simulation & provenance lifecycle — 2026-10-30
**Choice:** implement the 6-factor decision heuristic, distance decay, and what-if track perturbation calculations both in pure vanilla JavaScript (`static/cyclone-engine.js`) for instant browser execution (< 10 ms vs < 2 s requirement) and in authoritative FastAPI endpoints (`POST /what-if` in `backend/app/api/cyclone.py`).
**Why:** Continuous slider drag during live judge presentation requires sub-second responsiveness without frame drops. Running the mathematical model in the client provides instant visual feedback (< 10 ms), while keeping the API contract completely identical to backend calculation. Any what-if perturbation flips the active provenance tag across all influenced metrics, tables, and map layers to `SIMULATED`.
**Rejected:** Pure server-side polling during continuous mouse drag (creates network lag and potential stutter); complex client-side WASM dependencies (unnecessary overhead for geometric distance decay formulas).

## D16. Additive cyclone data model and PostGIS spatial schema (M1 T1/T2) — 2026-10-30
**Choice:** Implement additive Alembic migrations (`003_cyclone_schema.py`, `004_hazard_event_logs.py`) adding `organizations`, `hazard_events`, `areas`, `area_risk`, `strategic_assets`, `supply_routes`, and `hazard_event_logs` with PostgreSQL/PostGIS `Geometry(SRID=4326)` columns, integer `org_id` foreign keys, and idempotent CSV/GeoJSON seed loaders with upsert conflict handling.
**Why:** Preserves existing FireSense tables and test suite without destructive modifications. Integer `org_id` adheres to existing User model conventions and database constraints. Idempotent seed loaders allow repeated offline demo resets without primary key collisions or duplicate data accumulation.
**Rejected:** Destructive table refactoring (breaks legacy test suites); string UUID org keys (mismatches existing schema and breaks existing foreign keys); unindexed JSON geometry storage (fails PostGIS spatial index performance for intersection checks).

## D17. Six-factor explainable area risk scoring engine (M1 T3) — 2026-10-30
**Choice:** Implement a deterministic six-factor mathematical heuristic in `backend/app/services/risk/area_engine.py`: Wind Exposure (30%), Rainfall & Inundation (20%), Population Exposure (20%), Storm Surge & Coastal Vulnerability (15%), Critical Infrastructure (10%), and Urgency & Time to Landfall (5%). Every score returns structured, itemized `reasons[]` whose contributions sum to the total score.
**Why:** Operational commanders require transparent, audit-ready justification for life-critical evacuations and resource pre-positioning. Deterministic formulas compute in sub-millisecond time, produce identical outputs across platforms, and provide mathematical clarity during emergency post-mortems.
**Rejected:** Black-box neural ranking or uncalibrated machine learning (unacceptable hallucination risk, unverifiable under regulatory inquiry); unweighted arithmetic averages (misrepresents coastal surge and hurricane-force wind severity).

## D18. Multi-tenant RBAC isolation and transactional audit trail for hazard events (M2 T2) — 2026-10-30
**Choice:** Enforce strict organizational boundary isolation (`user.org_id == event.org_id`) across all hazard event CRUD and decision operations in `backend/app/api/hazard_events.py` and `backend/app/api/cyclone.py`. Deny cross-tenant read/write with HTTP 403 Forbidden; reject unassigned organization users. Automatically record all hazard lifecycle transitions and mutations into `hazard_event_logs` within the same database transaction.
**Why:** Cross-organization information leakage during inter-agency disaster operations poses severe security and public safety hazards. Transactional logging guarantees that no operational state transition can persist without an immutable audit record containing before/after state snapshots.
**Rejected:** Bypassing tenant boundaries for role="admin" (breaks multi-agency confidentiality; admin privileges must remain scoped to the tenant's own organization); asynchronous background audit logging (vulnerable to silent audit loss on process crash).

## D19. Non-persistent in-memory what-if re-ranking and consolidated dual-mode API routing (M2 T4) — 2026-10-30
**Choice:** Implement `POST /what-if` in `backend/app/api/cyclone.py` to calculate perturbed landfall tracks and intensity shifts entirely in-memory without database writes, returning `SIMULATED` provenance tags and re-ranked blocks in < 15ms. Consolidate M3 fixture routing and M2 database-backed decision routes into a single authoritative router with zero duplicate route paths.
**Why:** Real-time simulation sliders require instant responsiveness without database write locks, transaction overhead, or persistent pollution of operational hazard records. A unified router eliminates duplicate route handler collisions while serving both authenticated tenant-isolated queries and offline dashboard exploration.
**Rejected:** Writing simulated what-if perturbations to temporary database tables (causes disk churn and risks corrupting live operational data); maintaining separate conflicting routers mounted on overlapping paths.
