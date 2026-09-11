# RipplePlan — Devpost submission draft

> Status: draft only. The public demo and partner integration paths have been verified; the 2:39.48 v8 video candidate has been produced locally and matches the current product UI. The reviewed application, README, and Devpost draft files have been synchronized to the public GitHub repository. Public video upload, separate contribution confirmation from Mengyuan and Shubham, and final Devpost submission are still pending.

## Tagline

Personal AI that shows its work—trace one life change through every downstream decision with inspectable evidence.

## Track

Personal AI Track

## Additional prize

Best Use of Tavily

## Inspiration

Important life requirements rarely fail in isolation. A passport that expires too soon can invalidate a travel plan. A changed appointment window can make an otherwise valid document useless. The rules live across changing government pages, while the personal facts live in documents and calendars. Ordinary assistants produce lists, but they do not show which rule caused which consequence—or whether that rule is current.

RipplePlan was built to make those dependencies visible.

## What it does

RipplePlan turns a personal plan and a small set of document facts into an evidence-linked dependency graph. In the public demo, a completely synthetic U.S. passport holder plans a trip to France. The focused workflow evaluates one passport-validity rule; it does not claim to decide overall entry eligibility. RipplePlan:

1. accepts editable travel-exit and synthetic passport-expiry dates inside one reviewed U.S.-passport-to-France rule pack, then calculates the exact three-calendar-month boundary and remaining-day buffer;
2. retrieves current guidance from selected official domains in live mode, with a visibly labeled reference fallback;
3. links that evidence to a versioned, deterministic product rule and evaluates the sample dates;
4. propagates the risk through seven visual nodes and two downstream decision gates, with a before/after delta for changed inputs;
5. explains the conclusion beside its sources; and
6. proposes a conservative action plan that the user must review before exporting a reminder; and
7. reruns a counterfactual trip shift to show that the graph is driven by calculations rather than a fixed animation.

The product keeps three responsibilities separate: deterministic software owns dates and thresholds, retrieval owns evidence, and the model owns bounded explanation. This prevents fluent model output from silently changing the underlying calculation.

The evidence inspector also exposes the actual validated transformation: one qualified official excerpt, Nemotron's constrained two-field result, and the code boundary that excludes date math, risk gates, and actions. Failed or rejected model output never receives a synthetic replacement trace.

## How we built it

- **NVIDIA Nemotron-3.5 Lightning** (`nvidia/Nemotron-3_5-Lightning`) classifies whether varied, unstructured official excerpts semantically support the reviewed rule, then generates a constrained explanation from only the supplied scenario, calculation, and evidence. It cannot choose the date boundary or next action.
- **Nebius Token Factory** provides the OpenAI-compatible inference endpoint for the NVIDIA model.
- **Tavily Search + Extract** run in parallel: Search discovers current guidance, while Extract reads up to three vetted official pages. Results must pass both a server-side domain allowlist and a passport-validity relevance check before appearing as live evidence.
- **TypeScript and Next.js/Vinext** power the responsive interactive interface and server API.
- A shared deterministic UTC date engine calculates the validity buffer and exact three-calendar-month boundary.
- The public demo uses synthetic identity data and keeps all partner credentials on the server.

When credentials or a partner API are unavailable, RipplePlan falls back to an explicitly labeled reference snapshot. A 90-second credit-protection cache is also visible in the UI as cached partner evidence, including its age.

We exercised the Tavily and `nvidia/Nemotron-3_5-Lightning` partner paths in production. In the v8 recorded run, two qualified official excerpts passed the source gate and Nemotron returned a validated support judgment, so RipplePlan correctly displayed `mode=live`. The same UI and API explicitly downgrade to `partial` or `reference` when either partner path cannot satisfy its validation boundary. The original itinerary produced a deterministic 48-day buffer and 44-day calendar-boundary shortfall, while the 45-day-earlier itinerary produced a 93-day buffer, no shortfall, and a one-day cushion. These were functional checks, not a latency benchmark or a comparison with other models.

## Challenges we ran into

The hardest problem was deciding what the model should not control. Date arithmetic, threshold comparison, and source URLs must remain inspectable and reproducible. We therefore separated deterministic calculations from model-generated language and treated every retrieved webpage as untrusted evidence rather than instructions.

That boundary does not make the model decorative: official pages express the same requirement in inconsistent prose and page structures. Nemotron handles that fuzzy semantic layer by returning a strict support classification plus a bounded explanation; deterministic software owns the safety-critical calendar comparison and action mapping.

We also constrained the hackathon scope to one complete passport-readiness workflow. This made it possible to build a coherent product experience instead of several unfinished administrative agents.

During live verification we found that provider-side domain filtering can still return noisy links. We treated that as a security boundary, added independent URL validation, and paired discovery with targeted Tavily extraction rather than trusting the search response blindly.

## Accomplishments that we are proud of

- Built an end-to-end interactive ripple graph rather than another chat interface.
- Attached inspectable official sources directly to the affected graph node.
- Added an honest live/reference provenance label.
- Added a counterfactual control that shifts the trip 45 days earlier, recomputes the buffer from 48 to 93 days, and clears the affected passport-dependent gates.
- Added editable decision dates and an explicit delta strip showing the rule boundary, shortfall, and three downstream decisions before and after a change.
- Made the real Nemotron semantic trace inspectable without exposing credentials, prompts, or raw provider responses.
- Kept consequential actions behind a review step.
- Passed 13/13 cases against the same production calendar-month function, including leap-year, end-of-month, exact-boundary, and counterfactual dates.
- Passed 8/8 regression cases for the server-side model-output numeric guard; this tests our validation layer, not Nemotron's overall quality.
- Exercised both partner integration paths in production; the v8 capture shows a validated live run while the product preserves honest `partial` and `reference` fallback states.
- Produced a Cloudflare-compatible deployment with a server-side partner integration path.

## What we learned

Provenance is most useful when it is part of the interface, not a footnote. Users need to see the path from personal fact, to rule, to downstream effect. We also learned that reliable personal AI benefits from a hybrid architecture: models are valuable for interpreting evidence, while deterministic software should own calculations that can be expressed exactly.

## Product and business potential

Our initial market hypothesis stays close to what the demo proves: a private travel-readiness workspace for frequent travelers and people or families preparing for international moves. A future product could use a paid personal subscription. Employers or relocation providers could also sponsor access while each individual keeps control of their documents and chooses what status, if anything, to share.

This is a roadmap, not functionality claimed by the prototype. Today RipplePlan evaluates one synthetic U.S.-passport-to-France gate. Every additional workflow would need reviewed authoritative sources, deterministic decision logic, domain-specific evaluation, and human approval. We have not yet validated pricing, willingness to pay, savings, or broader market demand.

## What's next

- Interview frequent travelers and relocation coordinators to validate the workflow, privacy model, and willingness to pay.
- Expand from travel readiness to adjacent document and appointment workflows, one reviewed rule pack at a time.
- Monitor source changes and show graph diffs rather than silently replacing prior evidence.
- Add multilingual evidence explanations and accessibility testing.
- Build a larger evaluation set for retrieval quality, edge support, latency, and approval burden.

## Safety note

RipplePlan organizes information and links to responsible authorities. It is not legal advice, does not guarantee entry or eligibility, and does not submit applications, make purchases, or book travel. This demo supports only the shown U.S.-passport-to-France scenario and does not evaluate visas, stay length, passport age, or other entry conditions.

## Current local video candidate (v8, 2:39.48; not yet uploaded)

- **0:00–0:12 — Human stakes:** Alex's synthetic passport date puts a trip and non-refundable booking at risk.
- **0:12–0:31 — Product and exact result:** Show the dependency graph, 48-day buffer, and 44-day calendar-boundary shortfall.
- **0:31–0:53 — Propagation and provenance:** Show the failed gate ripple through the graph and the honest live/partial/reference labels.
- **0:53–1:24 — Technical boundary:** Show the Tavily official-domain gate, real messy legal wording, bounded Nemotron JSON, and model-output rejection rules.
- **1:24–1:50 — Deterministic decision:** Explain calendar-month arithmetic and rerun the same pipeline after a 45-day trip shift.
- **1:50–2:11 — Edge case and tests:** Show the one-day cushion, 13/13 calendar cases, and 8/8 output-safety regressions.
- **2:11–2:23 — Commercial roadmap:** Private global-mobility planning, one reviewed rule pack at a time; clearly labeled as future scope.
- **2:23–2:39 — Human control:** Sources remain inspectable and every next action requires approval.

The local candidate is `../RipplePlan_Demo_v8.mp4` (1280×720, H.264/AAC, 48 kHz mono). It uses a mono 96 kbps Jenny source without speech-rate stretching, denoising, low-pass filtering, or dynamic loudness processing; the lossless segment assembly receives one final AAC encode. It measures -21.1 LUFS with a -0.5 dBFS true peak and passed a complete decode check. v7 is discarded and must not be used. No public video URL exists yet, so v8 must not be described as uploaded or submitted.

## Submission metadata and approvals

- **Project name:** RipplePlan
- **Devpost draft ID:** `1177874`
- **Track:** Personal AI Track
- **Additional prize target:** Best Use of Tavily
- **Public demo:** https://rippleplan-life-2026.islenezhao.chatgpt.site
- **Public source repository:** https://github.com/Islene888/rippleplan
- **Public video URL:** Pending upload
- **Devpost state:** Draft; no final-submission confirmation has been recorded
- **Shubham Krishnakumar Nair:** Devpost project creator; specific project contribution statement pending Shubham's own review and confirmation
- **Mengyuan Zhao (`islenezhao`):** Devpost contributor; specific project contribution statement pending Mengyuan's own review and confirmation

Contribution drafts must remain placeholders until each person verifies them:

- **Mengyuan draft:** “I contributed [specific product, engineering, research, demo, and/or submission work—to be completed and confirmed by Mengyuan].”
- **Shubham draft:** “I contributed [specific engineering, research, testing, and/or team-coordination work—to be completed and confirmed by Shubham].”

## Submission checklist

- [x] Working local project
- [x] Public-safe synthetic demo data
- [x] Open-source license
- [x] README and setup instructions
- [x] Deterministic evaluation script
- [x] Partner API implementation
- [x] Verified live Tavily run
- [x] Verified live NVIDIA Nemotron-3.5 Lightning run on Nebius Token Factory
- [x] Public deployment URL: https://rippleplan-life-2026.islenezhao.chatgpt.site
- [x] Public GitHub repository: https://github.com/Islene888/rippleplan
- [x] Local validation rerun: 13/13 calendar cases, 8/8 model-output-safety cases, lint, and production build
- [x] Local v8 video candidate: 2:39.48, 1280×720, H.264/AAC, 48 kHz mono; complete decode passed
- [x] Reviewed application, README, and Devpost draft files synchronized to public GitHub `main` (content sync; local and browser-created commit histories differ)
- [ ] Public video, three minutes or shorter
- [ ] Mengyuan contribution statement completed and confirmed by Mengyuan
- [ ] Shubham contribution statement completed and confirmed by Shubham
- [ ] Devpost title, URLs, track, prize selection, team roster, and video URL reviewed in the logged-in draft
- [ ] Final Devpost submission clicked and confirmation page saved
