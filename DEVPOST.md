# RipplePlan — Devpost submission draft

> Status: public demo and Tavily live path verified; Nebius/Nemotron production verification and final submission are still pending.

## Tagline

Change one life event. See every downstream decision it affects—with inspectable evidence.

## Track

Personal AI Track

## Additional prize

Best Use of Tavily

## Inspiration

Important life requirements rarely fail in isolation. A passport that expires too soon can invalidate a travel plan. A changed appointment window can make an otherwise valid document useless. The rules live across changing government pages, while the personal facts live in documents and calendars. Ordinary assistants produce lists, but they do not show which rule caused which consequence—or whether that rule is current.

RipplePlan was built to make those dependencies visible.

## What it does

RipplePlan turns a personal plan and a small set of document facts into an evidence-linked dependency graph. In the public demo, a completely synthetic U.S. passport holder plans a trip to France. The focused workflow evaluates one passport-validity rule; it does not claim to decide overall entry eligibility. RipplePlan:

1. calculates the exact three-calendar-month boundary after the planned Schengen exit and the sample passport's remaining-day buffer;
2. retrieves current guidance from selected official domains in live mode, with a visibly labeled reference fallback;
3. links that evidence to a versioned, deterministic product rule and evaluates the sample dates;
4. propagates the risk through seven visual nodes and two downstream decision gates;
5. explains the conclusion beside its sources; and
6. proposes a conservative action plan that the user must review before exporting a reminder; and
7. reruns a counterfactual trip shift to show that the graph is driven by calculations rather than a fixed animation.

The product keeps three responsibilities separate: deterministic software owns dates and thresholds, retrieval owns evidence, and the model owns bounded explanation. This prevents fluent model output from silently changing the underlying calculation.

## How we built it

- **NVIDIA Nemotron 3** generates a constrained evidence explanation from only the supplied scenario, fixed calculation, and retrieved source excerpts. It cannot choose or change the next action.
- **Nebius Token Factory** provides the OpenAI-compatible inference endpoint for the NVIDIA model.
- **Tavily Search + Extract** run in parallel: Search discovers current guidance, while Extract reads up to three vetted official pages. Results must pass both a server-side domain allowlist and a passport-validity relevance check before appearing as live evidence.
- **TypeScript and Next.js/Vinext** power the responsive interactive interface and server API.
- A shared deterministic UTC date engine calculates the validity buffer and exact three-calendar-month boundary.
- The public demo uses synthetic identity data and keeps all partner credentials on the server.

When credentials or a partner API are unavailable, RipplePlan falls back to an explicitly labeled reference snapshot. A 90-second credit-protection cache is also visible in the UI as cached partner evidence, including its age.

## Challenges we ran into

The hardest problem was deciding what the model should not control. Date arithmetic, threshold comparison, and source URLs must remain inspectable and reproducible. We therefore separated deterministic calculations from model-generated language and treated every retrieved webpage as untrusted evidence rather than instructions.

We also constrained the hackathon scope to one complete passport-readiness workflow. This made it possible to build a coherent product experience instead of several unfinished administrative agents.

During live verification we found that provider-side domain filtering can still return noisy links. We treated that as a security boundary, added independent URL validation, and paired discovery with targeted Tavily extraction rather than trusting the search response blindly.

## Accomplishments that we are proud of

- Built an end-to-end interactive ripple graph rather than another chat interface.
- Attached inspectable official sources directly to the affected graph node.
- Added an honest live/reference provenance label.
- Added a counterfactual control that shifts the trip 45 days earlier, recomputes the buffer from 48 to 93 days, and clears the affected passport-dependent gates.
- Kept consequential actions behind a review step.
- Passed 13/13 cases against the same production calendar-month function, including leap-year, end-of-month, exact-boundary, and counterfactual dates.
- Produced a Cloudflare-compatible deployment with a server-side partner integration path.

## What we learned

Provenance is most useful when it is part of the interface, not a footnote. Users need to see the path from personal fact, to rule, to downstream effect. We also learned that reliable personal AI benefits from a hybrid architecture: models are valuable for interpreting evidence, while deterministic software should own calculations that can be expressed exactly.

## What's next

- Expand from travel readiness to licensing and household renewals, one verified domain at a time.
- Monitor source changes and show graph diffs rather than silently replacing prior evidence.
- Add multilingual evidence explanations and accessibility testing.
- Build a larger evaluation set for retrieval quality, edge support, latency, and approval burden.

## Safety note

RipplePlan organizes information and links to responsible authorities. It is not legal advice, does not guarantee entry or eligibility, and does not submit applications, make purchases, or book travel. This demo supports only the shown U.S.-passport-to-France scenario and does not evaluate visas, stay length, passport age, or other entry conditions.

## Three-minute video outline

- **0:00–0:18 — Problem:** One document change can quietly break an entire plan.
- **0:18–0:35 — Product:** Show the synthetic traveler, travel dates, and green starting graph.
- **0:35–1:10 — Run:** Click “Run evidence check”; show nodes propagating and turning red/amber.
- **1:10–1:38 — Evidence:** Inspect the passport-validity gate, 48-day buffer, 44-day calendar-boundary shortfall, and attached official sources.
- **1:38–1:58 — Counterfactual:** Move the trip 45 days earlier; show the buffer rise to 93 days and the graph clear both gates.
- **1:58–2:16 — Action control:** Restore the risky dates, open the human-approved plan, and export the calendar reminder.
- **2:16–2:40 — Architecture:** Versioned calendar-month rule + Tavily supporting evidence → Nemotron explanation on Nebius → evidence-linked graph.
- **2:40–2:50 — Evaluation:** Show the 13/13 focused date-engine result and separately disclose partner live/reference status.
- **2:50–3:00 — Close:** “A personal AI should not just remember your life. It should understand what changes next.”

## Submission checklist

- [x] Working local project
- [x] Public-safe synthetic demo data
- [x] Open-source license
- [x] README and setup instructions
- [x] Deterministic evaluation script
- [x] Partner API implementation
- [x] Verified live Tavily run
- [ ] Verified live NVIDIA Nemotron run on Nebius Token Factory
- [x] Public deployment URL: https://rippleplan-life-2026.islenezhao.chatgpt.site
- [x] Public GitHub repository: https://github.com/Islene888/rippleplan
- [ ] Public video, three minutes or shorter
- [ ] Team contribution statement reviewed by both members
- [ ] Final Devpost submission confirmed by both members
