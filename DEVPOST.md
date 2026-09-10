# RipplePlan — Devpost submission draft

> Status: submission copy in progress. Do not claim live partner execution until production keys are configured and verified.

## Tagline

Change one life event. See every deadline and requirement it affects—with live evidence.

## Track

Personal AI Track

## Additional prize

Best Use of Tavily

## Inspiration

Important life requirements rarely fail in isolation. A passport that expires too soon can invalidate a travel plan. A changed appointment window can make an otherwise valid document useless. The rules live across changing government pages, while the personal facts live in documents and calendars. Ordinary assistants produce lists, but they do not show which rule caused which consequence—or whether that rule is current.

RipplePlan was built to make those dependencies visible.

## What it does

RipplePlan turns a personal plan and a small set of document facts into a cited dependency graph. In the public demo, a completely synthetic traveler plans a trip to France. RipplePlan:

1. calculates the number of days the sample passport remains valid after the planned return;
2. retrieves relevant guidance from selected official domains;
3. compares the deterministic fact with the cited requirement;
4. propagates the risk through seven visual nodes and two downstream decision gates;
5. explains the conclusion beside its sources; and
6. proposes a conservative action plan that the user must review before exporting a reminder; and
7. reruns a counterfactual trip shift to show that the graph is driven by calculations rather than a fixed animation.

The product keeps three responsibilities separate: deterministic software owns dates and thresholds, retrieval owns evidence, and the model owns bounded explanation. This prevents fluent model output from silently changing the underlying calculation.

## How we built it

- **NVIDIA Nemotron 3** generates a constrained evidence explanation from only the supplied scenario, fixed calculation, and retrieved source excerpts.
- **Nebius Token Factory** provides the OpenAI-compatible inference endpoint for the NVIDIA model.
- **Tavily Search** performs advanced, domain-constrained retrieval across official EU and U.S. government sources.
- **TypeScript and Next.js/Vinext** power the responsive interactive interface and server API.
- A deterministic UTC date engine calculates the validity buffer and risk threshold.
- The public demo uses synthetic identity data and keeps all partner credentials on the server.

When credentials or a partner API are unavailable, RipplePlan falls back to an explicitly labeled reference snapshot. It never presents cached evidence as a live search.

## Challenges we ran into

The hardest problem was deciding what the model should not control. Date arithmetic, threshold comparison, and source URLs must remain inspectable and reproducible. We therefore separated deterministic calculations from model-generated language and treated every retrieved webpage as untrusted evidence rather than instructions.

We also constrained the hackathon scope to one complete travel-readiness workflow. This made it possible to build a coherent product experience instead of several unfinished administrative agents.

## Accomplishments that we are proud of

- Built an end-to-end interactive ripple graph rather than another chat interface.
- Attached inspectable official sources directly to the affected graph node.
- Added an honest live/reference provenance label.
- Added a counterfactual control that shifts the trip 45 days earlier, recomputes the buffer from 48 to 93 days, and clears the affected gates.
- Kept consequential actions behind a review step.
- Passed 13/13 deterministic boundary tests, including leap-year, exact 90-day, and counterfactual demo cases.
- Produced a Cloudflare-compatible deployment with a server-side partner integration path.

## What we learned

Provenance is most useful when it is part of the interface, not a footnote. Users need to see the path from personal fact, to rule, to downstream effect. We also learned that reliable personal AI benefits from a hybrid architecture: models are valuable for interpreting evidence, while deterministic software should own calculations that can be expressed exactly.

## What's next

- Expand from travel readiness to licensing and household renewals, one verified domain at a time.
- Monitor source changes and show graph diffs rather than silently replacing prior evidence.
- Add multilingual evidence explanations and accessibility testing.
- Build a larger evaluation set for retrieval quality, edge support, latency, and approval burden.

## Safety note

RipplePlan organizes information and links to responsible authorities. It is not legal advice, does not guarantee entry or eligibility, and does not submit applications, make purchases, or book travel.

## Three-minute video outline

- **0:00–0:18 — Problem:** One document change can quietly break an entire plan.
- **0:18–0:35 — Product:** Show the synthetic traveler, travel dates, and green starting graph.
- **0:35–1:10 — Run:** Click “Run evidence check”; show nodes propagating and turning red/amber.
- **1:10–1:38 — Evidence:** Inspect the passport node, 48-day buffer, 42-day shortfall, and three official sources.
- **1:38–1:58 — Counterfactual:** Move the trip 45 days earlier; show the buffer rise to 93 days and the graph clear both gates.
- **1:58–2:16 — Action control:** Restore the risky dates, open the human-approved plan, and export the calendar reminder.
- **2:16–2:40 — Architecture:** Deterministic calculation → Tavily official-domain search → Nemotron on Nebius → cited graph.
- **2:40–2:50 — Evaluation:** Show 13/13 boundary tests and disclose reference/live status.
- **2:46–3:00 — Close:** “A personal AI should not just remember your life. It should understand what changes next.”

## Submission checklist

- [x] Working local project
- [x] Public-safe synthetic demo data
- [x] Open-source license
- [x] README and setup instructions
- [x] Deterministic evaluation script
- [x] Partner API implementation
- [ ] Verified live Tavily run
- [ ] Verified live NVIDIA Nemotron run on Nebius Token Factory
- [ ] Public deployment URL
- [ ] Public GitHub repository
- [ ] Public video, three minutes or shorter
- [ ] Team contribution statement reviewed by both members
- [ ] Final Devpost submission confirmed by both members
