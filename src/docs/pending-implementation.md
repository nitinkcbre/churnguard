# ChurnGuard AI — Pending Implementation

> Features identified from the research plan that are not yet built. Prioritised for hackathon prototype.

---

## Dashboard

| Feature | Plan Section | Priority |
|---|---|---|
| **Portfolio Health Index (PHI) bar** — avg survival score across all tenants, colour-coded (Green >80 / Amber 60–80 / Red <60) | §13, §14 | High |
| **Score band labels** — 5-band system: Monitor / Watch / Notify / Alert / Escalate (currently only 3 bands: GREEN / YELLOW / RED) | §6 | High |
| **Agent Reasoning Panel** — explains *why* score moved with per-signal point weights (e.g., "Repeat HVAC +18pts, Engagement drop +12pts, Lease proximity +8pts") | §14 | High |
| **"Last Scored" timestamp** per tenant row with tooltip showing full scoring event details | §14 | Medium |
| **Lease Proximity Filter** — one-click filter for tenants with lease expiry < 90 days | §14 | Medium |

---

## Escalation

| Feature | Plan Section | Priority |
|---|---|---|
| **Auto-trigger escalation** when score crosses a configured threshold (currently manual button only) | §6, §14 | High |
| **Pre-populated alert body** with top 3 signal drivers + suggested Margin-Aware Offer | §6, §14 | High |

---

## Margin-Aware Offer Library

| Feature | Plan Section | Priority |
|---|---|---|
| **Offer Library** — VIP Engineer Assignment, Amenity Passport, Network Spotlight, Team Re-Entry Event, Digital Concierge Orientation, Dedicated IP Upgrade, Deep-Clean Credit | §8 | High |
| **"Send Offer" / "Assign Task" buttons** on agent decision cards | §14 | High |
| **Offer rules config file** (`offer_rules.json`) — rules-driven, not hardcoded; maps trigger signals to offer IDs | §8 | Medium |
| **Offer history tab** on tenant portfolio page | §14 | Low |
| **Offer acceptance rate tracking** | §9 | Low |

---

## Outcome Feedback Loop

| Feature | Plan Section | Priority |
|---|---|---|
| **PM outcome logging** — PM marks intervention as "Resolved" or "Still at Risk" | §6 | High |
| **Score history storage** — persist historical scores per tenant for velocity tracking | §4, §14 | Medium |
| **Score velocity / delta indicator** on tenant rows (shows score change direction) | §14 | Medium |

---

## Risk Scoring Enhancements

| Feature | Plan Section | Priority |
|---|---|---|
| **Repeat ticket rate** — flag tenants with >15% reopen rate on same asset | §5 | Medium |
| **MTTR tracking** — Mean Time to Repair; flag if >2× the 30-day property average | §5, §9 | Medium |
| **SLA adherence rate** — flag if <85% resolved within contractual SLA | §5, §9 | Medium |
| **Engagement delta** — flag >20% drop in portal/app usage as Critical Watch trigger | §5 | Low |

---

## Quick Wins (Frontend-only, no backend changes needed)

| Feature | Effort |
|---|---|
| PHI bar at top of dashboard | Low |
| 5-band score labels on tenant rows | Low |
| Lease proximity filter button | Low |
| "Last Scored" timestamp column | Low |
