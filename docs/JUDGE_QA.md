# SURAKSHA — Judge Q&A Defense Guide

Memorise the **bold** answers. Every claim here is backed by something demonstrable on screen.

## Theme fit (defence track)

**1. "How is this national security / defence?"**
→ Three ways: it's built on **satellite earth observation** (aerospace); disaster response in India is executed by **NDRF, SDRA and the armed forces** — we give those forces a prioritised operating picture (defence); and we protect **critical infrastructure** — fuel depots, ports, substations, telecom, relief stockpiles (national security). Our heritage: the thermal-intelligence core was originally built for an NTRO context.

**2. "How is this different from NDEM / IMD / SACHET?"**
→ They **disseminate** hazard information. We **convert** it into a ranked, explainable action queue — which block, which asset, which route, in what order, and why — with safety interlocks that refuse to act on stale data. We supplement official systems, never override them.

## Technical honesty

**3. "Is the 0–100 score a probability?"**
→ **No.** It is an operational priority score — a transparent prioritisation heuristic, stated on-screen and in the README. We do not claim calibrated probabilities because we have no validation dataset for that claim.

**4. "Why rule-based scoring instead of machine learning?"**
→ With no validated cyclone-impact training data, an uncalibrated ML model would be theater. Transparent weights plus an auditable `reasons[]` list beats a black box when a commander's decision is on the line. (Our *thermal anomaly* hazard does use the XGBoost classifier, where training data genuinely exists.)

**5. "Can you explain why Block X is ranked #1?"**
→ Click any row: the reasons drawer shows every contributing factor — weight, contribution, source. IMD wind forecast intersected with block geometry, population exposure, surge proximity, strategic assets within 10 km, time-to-impact. All traceable.

**6. "What happens when your data is wrong or stale?"**
→ The interlock refuses to auto-escalate, forces REVIEW_REQUIRED, and logs the event to the audit trail. IMD official warnings always win disagreements with our model, and the UI shows the conflict rather than hiding it. Demoed live in minute 4 of the demo.

## Reliability & data

**7. "Is this live right now?"**
→ The demo defaults to a **Cyclone Fani (May 2019) replay**, clearly badged REPLAY. A live toggle exists (4-tier cascade: IMD API → IMD CAP feed → cached snapshot → replay). Provenance badges on every number mean you always know which tier you're looking at.

**8. "What if the internet dies mid-demo?"**
→ Nothing changes. The replay pack is pre-seeded in PostGIS; the demo has zero required external calls. That's a design feature — disaster response sites have the same connectivity constraints.

**9. "Where does your data come from and is it legal to use?"**
→ IMD (official warnings), ISRO MOSDAC (satellite products), NASA FIRMS (thermal anomalies), OpenStreetMap (road network, ODbL attribution), census/LGD (administrative boundaries, population). All public or openly licensed; attribution in the README.

## Operations & safety

**10. "Do you dispatch real responders?"**
→ **No.** Every task and dispatch is `is_simulated: true`, visibly badged, and requires human approval through the state machine. Real dispatch requires MoUs and integrations we explicitly do not claim.

**11. "Why Odisha only? Is this a prototype, not a product?"**
→ Depth over breadth: real block polygons, real historical event, real strategic assets — every number auditable. The engine is region-agnostic; extending to another state is configuration, not a rewrite.

**12. "Can the system be gamed or go wrong silently?"**
→ Org-scoped RBAC on every endpoint, append-only audit trail, input validation at boundaries. Interlocks mean stale/conflicting data degrades the recommendation visibly (REVIEW_REQUIRED / INSUFFICIENT_DATA) rather than silently producing confident wrong answers.

## Team & process

**13. "Did you build this in the hackathon?"**
→ Yes — designed and built for this event around the SURAKSHA architecture. The team's prior work on the thermal-intelligence prototype informed the design; the cyclone workflow, risk engine, interlocks, and logistics layer are new.

**14. "What would you do with more time?"**
→ Calibrate the priority score against Fani damage records (documented in DECISIONS.md as future work), ingest live MOSDAC cyclone products, add flood-extent layers, and validate route status against ground-truthed road closures.
