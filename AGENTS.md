# Agent Instructions for FireSense / Disaster Intelligence (SURAKSHA)

These instructions apply to this repository. Follow them alongside installed agent skills, including Superpowers. If a general workflow conflicts with the project-specific rules below, follow these project rules unless they conflict with safety or an explicit user instruction.

## 1. Mission and locked direction

Build a credible, explainable disaster-intelligence decision-support prototype for the national-security, aerospace, and disaster-response context.

Direction is locked for the hackathon. Skip brainstorming. Keep planning under 10 minutes, then build. Ask only if a genuine blocker or high-impact ambiguity prevents safe progress.

For the MVP, prioritize one complete Odisha cyclone-impact and response-prioritization workflow. Describe the broader platform as multi-hazard capable, but do not implement multiple hazards end-to-end until the cyclone workflow is reliable and the team explicitly approves expanding scope.

The product helps people prioritize attention and coordinate response. It does not replace official warnings, emergency authorities, or human judgement.

Authoritative planning documents: `ARCHITECTURE.md`, `SRS.md` (canonical text in `docs/SRS.md`), and `RUNBOOK.md` at the repo root. Read them before non-trivial work.

## 1b. Team pre-authorizations (hackathon)

To avoid repeated approval pauses across the 4-person team:

- **Standing push authorization — do not ask for permission.** After completing and verifying a change (tests run, diff reviewed), proactively `git add` the relevant files, commit with a semantic message, and `git push origin main`. Do not prompt for push approval.
- **Staging discipline:** stage only files you created or modified for the task. Never blind `git add -A` in this shared 4-person repo — teammates may have in-flight edits (this has already happened once with `ci.yml`).
- Adding focused tests, docs, and local demo fixtures is pre-approved (see section 2).
- **Never stage or commit** `.env`, secrets, credentials, or another member's unfinished work.
- **Still requires explicit authorization:** deploying/publishing to production (e.g. Vercel), pushing tags, running destructive migrations, modifying production services, incurring costs, calling paid APIs, or any other external action.

Team ownership boundaries (who edits what) are defined in `RUNBOOK.md` section 2. Do not edit files owned by another member's area without coordination.

## 2. Inspect before changing

- Before editing, inspect the repository structure, README, dependency manifests, environment/configuration, current Git status, relevant tests, and deployment configuration.
- Preserve existing user changes and avoid unrelated refactors.
- Verify the current architecture from the code. Do not assume that a backend, route, data source, or deployment is authoritative based only on old notes.
- `backend/app/` is the confirmed authoritative FastAPI backend (verified from code: routers, RBAC, models, alembic migrations). Do not extend the legacy `app.py` / flat `backend/*.py` implementation without explicit approval. Legacy presentation artifacts live under `legacy/` and are frozen.
- Follow existing design documentation, including `design.md` if present, rather than inventing a competing visual system.
- Do not drop, rename, or destructively alter existing FireSense tables or existing user data.
- Ask before broad refactors, destructive operations, production-facing changes, or changing security/authentication behavior.

### Pre-execution audit (before any non-trivial edit or tool call)

Think through these five questions and be able to answer each briefly before acting:

1. **System impact:** which tables, API contracts, or downstream flows does this touch? What breaks downstream if this change fails?
2. **Security & hackability:** are inputs validated at the system boundary? Can this endpoint mutate state outside its role/org scope (`org_id`, RBAC)? Are spatial/coordinate parameters safe against malformed or injected values? Can anything leak secrets into logs or responses?
3. **Determinism & safety gates:** can any non-deterministic component (the LLM situation briefing) bypass a deterministic interlock? Safety gates — stale-refuse, IMD-wins, clamps — must live in deterministic code outside the LLM path; LLM output is advisory, grounded only in structured system output, with template fallback.
4. **Resilience:** malformed coordinates (NaN/None), missing or stale data, network loss — does this degrade *visibly* (`REVIEW_REQUIRED` / `INSUFFICIENT_DATA`) instead of crashing or silently succeeding? (The `osm_correlator` precedence bug fixed on 2026-10-30 is the cautionary example.)
5. **Documentation & sync:** does this change require an `ARCHITECTURE.md`, `DECISIONS.md`, or `README.md` update? (See section 12 — Definition of Done.)

### Pre-approved for this hackathon

To avoid repeated approval pauses, these specific changes are pre-approved if inspection shows they are needed for the cyclone MVP:

- Add new cyclone-domain tables/models for hazard_events, areas, area_risk, strategic_assets, and supply_routes.
- Use additive database migrations only. Never drop or destructively alter existing FireSense tables; do not rewrite or delete existing data.
- Add a narrowly scoped dependency required for geospatial intersection or validation, such as shapely, if justified by the implementation. Ask before adding large geospatial stacks such as geopandas, or any unrelated/new dependency.
- Add or update focused tests, project documentation, and local demo fixtures needed for the MVP.

Anything outside these pre-approved changes still requires approval when it materially expands scope, introduces cost, changes existing data/schema destructively, or affects production.

## 3. Run commands and verification

Do not guess commands. First inspect the README, package manifests, scripts, Makefile/task runner, Docker configuration, and CI workflow to identify the actual commands for:

- starting the backend (`docker compose up -d`; API at :8000, OpenAPI at :8000/docs);
- starting the frontend (static files served by FastAPI — no build step);
- running targeted and full tests (`python -m pytest`; CI runs the same on Python 3.12);
- running lint/type checks and builds;
- loading or selecting the cached Fani replay demo data.

Use the documented/project-defined commands. If a command is missing or unclear, state that and choose the safest verified alternative. Do not invent a replay loader or imply it exists before finding it.

For the final report, list the exact commands run and their results. Distinguish PASS, FAIL, NOT RUN, and BLOCKED.

## 4. Data provenance and uncertainty

The default demo path is a cached historical Cyclone Fani replay. The demo must work offline. Live feeds are optional bonuses, never a requirement for a successful demo.

Every important observation, estimate, and recommendation must make its provenance clear. Reuse existing schemas and UI conventions where possible. Distinguish at minimum:

- OFFICIAL FORECAST: information sourced from an official forecast or authority.
- OBSERVED: a sourced observation, with source and observation time.
- MODEL ESTIMATE: a derived or model-generated estimate, with method/version and input references where available.
- HISTORICAL / REPLAY: historical data used to replay an event or run an offline demo.
- SIMULATED: simulated scenarios, tasks, notifications, or dispatch.
- INSUFFICIENT DATA: evidence is missing, stale, conflicting, or too weak for a reliable conclusion.

For relevant data, preserve source, timestamp, freshness, and confidence when available. Never label historical/replay data as live. Do not invent official feeds, successful API access, current conditions, or data freshness.

### Source conflict and stale-data interlocks

- When official forecasts conflict, IMD takes precedence for the official cyclone forecast in this prototype. Preserve or surface the conflict where practical; do not silently merge conflicting values.
- When critical data is stale, missing, or conflicting, show REVIEW REQUIRED and/or INSUFFICIENT DATA as appropriate. Do not automatically escalate risk or trigger a consequential action based on stale data alone.
- A road/route must never be labelled PASSABLE without current, relevant evidence supporting passability. A geometric intersection check can flag exposure, not prove a road is blocked or open.
- If an official source cannot be reached, use the cached replay and clearly label it HISTORICAL / REPLAY; never imply the live source was checked successfully.

## 5. Risk and explainability

- A risk score is a transparent prioritization heuristic unless rigorously calibrated and validated. Do not describe it as the probability of a disaster.
- Every block/area/asset risk result must include a structured reasons[] list explaining the main contributing factors.
- Keep observed facts separate from inferred exposure and model estimates.
- Use relevant factors supported by available data, such as hazard intensity/footprint, exposed population and infrastructure, asset criticality, vulnerability, and data confidence.
- Do not invent precision. Missing data must be visible and must not silently become zero risk.
- Prefer deterministic, inspectable rules for the hackathon MVP over introducing a new ML model without a clear need, evaluation data, and verification plan.

## 6. Response and dispatch safety

- The system is decision support, not an autonomous emergency-response authority.
- Any dispatch, task assignment, alert delivery, or emergency action shown in the prototype must be clearly labelled SIMULATED unless a real integration is explicitly approved and implemented.
- Never send real dispatches, contact emergency services, or trigger external actions without explicit human authorization.
- Show a human review/approval step for consequential actions.
- Keep an audit trail for generated recommendations and simulated actions where the existing architecture supports it.
- Do not claim guaranteed hazard detection, guaranteed safety, or official endorsement.

## 7. MVP priorities

Prefer this order unless the user explicitly changes scope:

1. A reliable offline cyclone scenario using verified historical/replay data.
2. Transparent block-level risk ranking with reasons[].
3. Exposure of relevant strategic/civil assets, such as hospitals, shelters, relief stockpiles, ports, fuel facilities, and other assets only when sourced or clearly marked illustrative.
4. A route-exposure flag based on a documented spatial intersection check. Do not call it route optimization/navigation unless that capability is implemented and verified.
5. A what-if scenario control that updates derived rankings consistently.
6. A concise briefing summary grounded only in structured system output.
7. A repeatable offline demo path that can be rehearsed with network access disabled.

Treat additional hazards, complex multi-tenancy, extensive onboarding, autonomous dispatch, and speculative ML as out of scope unless explicitly approved after the core workflow works.

## 8. Engineering standards

- Make the smallest coherent change that satisfies the task.
- Reuse existing conventions and dependencies where reasonable.
- Validate untrusted inputs at system boundaries; handle errors explicitly.
- Do not hard-code credentials or commit secrets. Never print secrets into logs or responses.
- Avoid fake data presented as real, fake success responses, silent exception handling, and placeholder features described as complete.
- Keep UI labels, API contracts, persistence models, and documentation consistent.
- Add or update tests when behavior changes.
- Do not weaken or delete tests just to get a green run without explaining why and obtaining approval when intent changes.
- For consequential calculations, keep the scoring method and assumptions inspectable.

## 9. Required workflow

For non-trivial tasks:

1. Inspect: read relevant code/docs and check Git status.
2. Plan briefly: state intended files, approach, acceptance criteria, and material risks. Keep this under 10 minutes; the direction is already set.
3. Implement: make focused changes in small increments.
4. Verify: run relevant tests/checks that are available. Inspect actual output and exit status.
5. Review: inspect the final diff for accidental changes, secrets, unrelated edits, missing tests, and inconsistencies.
6. Report: summarize changes, exact checks run and results, and anything not tested or still uncertain.

For trivial changes, a short inspect-edit-test loop is enough; do not force a full six-step ceremony.

Never claim that tests, builds, APIs, integrations, or deployments work unless you actually verified them. Clearly mark checks as PASS, FAIL, NOT RUN, or BLOCKED.

## 10. Known-issue investigation

Do not treat old chat claims about bugs as confirmed facts. If `backend/osm_correlator.py` exists, inspect the relevant route/geometry logic and test it for operator-precedence or intersection errors before changing it. Only report a bug after reproducing it or establishing it from the code and tests. Do not assume a particular line number remains accurate.

(Resolved 2026-10-30: the operator-precedence defect in `fetch_live_context` was reproduced by `tests/test_osm_correlator.py` and fixed with parentheses. New geometry-related claims require the same reproduce-first standard.)

## 11. External actions and deployment

Do not deploy, publish, push tags, run destructive migrations, modify production services, incur costs, or trigger external actions unless the user explicitly authorizes that specific action. Before an authorized release, explain the target, expected effect, verification steps, and rollback plan.

## 12. Definition of done

A task is complete only when:

- its acceptance criteria have been checked against evidence;
- relevant tests/checks have actually run, or skipped checks are disclosed;
- the final diff has been reviewed;
- provenance and simulated-action labels remain correct;
- stale or conflicting data cannot silently trigger automatic escalation;
- **documentation synchronized** (mandatory, whenever applicable):
  - `ARCHITECTURE.md` updated in the same session as any change to system design, data flows, API contracts, sequence of operations, or security boundaries;
  - `DECISIONS.md` given a new numbered ADR entry for any **architectural, security-relevant, or scope-affecting** decision, using the established entry format (Title · Choice · Why/rationale · Rejected alternatives). Routine bugfixes, refactors that change no design, and typo fixes need no ADR — the semantic commit message is the record;
  - `README.md` updated when user-facing features, benchmarks, or workflows materially change (not for internal changes);
- unresolved limitations and assumptions are stated honestly.

If a requirement conflicts with these rules or the existing implementation, explain the conflict and ask before a high-impact decision.
