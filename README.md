# RipplePlan

**One change. See the whole ripple.**

[Live demo](https://rippleplan-life-2026.islenezhao.chatgpt.site) · [Public source](https://github.com/Islene888/rippleplan)

RipplePlan is an evidence-backed personal AI concept that maps how a change in an important document or plan affects downstream decisions. The focused hackathon demo uses a synthetic U.S. passport and a France travel scenario: it evaluates one passport-validity gate, retrieves current supporting guidance, explains the result, and creates a human-reviewed next-action plan.

> Demo data only. RipplePlan is an information-organizing prototype, not legal advice. Always verify requirements with the responsible authority.

## Why it is different

Most assistants return a checklist. RipplePlan returns an **evidence-linked dependency graph**:

- Personal facts and plans form the starting nodes.
- Tavily Search discovers current guidance while targeted Tavily Extract reads up to three vetted official pages; the results are merged, relevance-checked, and a server-side allowlist rejects every off-domain link.
- NVIDIA Nemotron-3.5 Lightning (`nvidia/Nemotron-3_5-Lightning`) on Nebius Token Factory performs a bounded semantic support check over varied official excerpts, then produces a constrained explanation.
- A versioned deterministic rule owns three-calendar-month arithmetic and never delegates that calculation or the next action to retrieval or a model.
- The interface exposes the validated evidence transformation—qualified excerpt, constrained Nemotron JSON, and code-owned boundary—without exposing prompts, credentials, or raw provider responses.
- Users can edit the planned Schengen exit and synthetic passport expiry inside the reviewed U.S.-passport-to-France rule pack; every run recomputes the graph from those dates.
- Every consequential action remains behind explicit human approval.

The application degrades honestly: without partner keys it runs a labeled reference snapshot; fresh and short-lived cached partner evidence are labeled separately.

## Architecture

```text
Synthetic life event
        |
        v
Versioned deterministic rule ---- computes the calendar-month gate
        |
        +---- Tavily Search ---- official-domain evidence
        |                              |
        +---- Nebius Token Factory / Nemotron-3.5 Lightning
                                       |
                                       v
                          constrained explanation JSON
                                       |
                                       v
                          cited ripple graph + action gate
```

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The interactive demo is available at `http://localhost:3000`.

To activate live partner calls, set `TAVILY_API_KEY`, `NEBIUS_API_KEY`, and `NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning`. This exact model ID was verified in the production demo; keys remain server-side.

## Validate

```bash
npm run evaluate
npm run lint
npm run build
```

The evaluation script imports the same production calendar-month function used by the API and passes 13/13 clean, boundary, at-risk, end-of-month, leap-year, and demo-perturbation cases. It also passes 8/8 regression cases for the server-side guard that permits the trusted three-month phrase while rejecting additional numeric claims in model summaries. These are focused deterministic and output-safety checks, not a model-quality or performance benchmark.

The Tavily and `nvidia/Nemotron-3_5-Lightning` partner paths were exercised in production. In the current v7 recorded run, two qualified official excerpts passed the source gate and Nemotron returned a validated support judgment, so RipplePlan correctly displayed `mode=live`. The product still downgrades visibly to `partial` or `reference` when either partner path fails its validation boundary. The original itinerary produced a deterministic 48-day buffer and a 44-day calendar-boundary shortfall; the 45-day-earlier itinerary produced a 93-day buffer, no shortfall, and a one-day cushion. These are functional checks, not claims about latency, comparative model quality, or broader task accuracy.

The interface accepts editable dates and includes a **45-day trip shift** shortcut. It reruns the same API and exact date engine, changes the sample buffer from 48 to 93 days, and propagates the result across seven graph nodes and two passport-dependent decision gates. A delta strip shows the boundary and shortfall before and after the change, so the counterfactual is inspectable rather than a second pre-recorded animation.

## Hackathon technology

- NVIDIA Nemotron-3.5 Lightning (`nvidia/Nemotron-3_5-Lightning`) for semantic evidence-support classification and constrained explanation
- Nebius Token Factory for OpenAI-compatible model inference
- Tavily Search + Extract for live evidence retrieval from server-verified official domains
- Next.js / Vinext / TypeScript for the product experience
- Cloudflare-compatible deployment through Sites

## Product direction

This demo validates a narrow personal workflow. Our initial product hypothesis is a private travel-readiness workspace for frequent travelers and people or families preparing for an international move. It could remember document and appointment dependencies, monitor selected official sources, and surface changes for user approval.

A possible commercial path is a consumer subscription, or employer- or relocation-provider-sponsored access in which each person keeps control of their documents and chooses what status to share. This is a roadmap, not current functionality. Every added rule pack would require authoritative sources, deterministic logic, domain-specific evaluation, and human review. The prototype has not validated pricing or demand and does not support user accounts or real-document ingestion.

## Privacy and safety

- The public demo contains no real identity documents.
- API credentials are never sent to the browser.
- Partner calls use timeouts, short-lived request coalescing/cache, and a per-IP warm-isolate rate limit to protect demo credits.
- Retrieved text cannot change the deterministic date calculation.
- Source links remain visible beside conclusions.
- The prototype does not submit applications or make bookings.
- The focused demo supports only the shown U.S.-passport-to-France scenario and does not evaluate visas, length of stay, passport age, or other entry conditions.

## License

[MIT](LICENSE)
