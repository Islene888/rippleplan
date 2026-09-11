# RipplePlan

**One change. See the whole ripple.**

RipplePlan is an evidence-backed personal AI concept that maps how a change in an important document or plan affects downstream decisions. The focused hackathon demo uses a synthetic U.S. passport and a France travel scenario: it evaluates one passport-validity gate, retrieves current supporting guidance, explains the result, and creates a human-reviewed next-action plan.

> Demo data only. RipplePlan is an information-organizing prototype, not legal advice. Always verify requirements with the responsible authority.

## Why it is different

Most assistants return a checklist. RipplePlan returns an **evidence-linked dependency graph**:

- Personal facts and plans form the starting nodes.
- Tavily Search discovers current guidance while targeted Tavily Extract reads three vetted official pages; the results are merged and a server-side allowlist rejects every off-domain link.
- NVIDIA Nemotron on Nebius Token Factory turns retrieved evidence into constrained, structured explanations.
- A versioned deterministic rule owns three-calendar-month arithmetic and never delegates that calculation or the next action to retrieval or a model.
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
        +---- Nebius Token Factory / NVIDIA Nemotron
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

To activate live partner calls, set `TAVILY_API_KEY`, `NEBIUS_API_KEY`, and the exact current `NEBIUS_MODEL` ID shown by the Token Factory model list. Keys remain server-side.

## Validate

```bash
npm run evaluate
npm run lint
npm run build
```

The evaluation script imports the same production calendar-month function used by the API and checks 13 clean, boundary, at-risk, end-of-month, leap-year, and demo-perturbation cases. It is a focused date-engine test, not an end-to-end partner API benchmark.

The interface includes a **45-day trip shift** control. It reruns the same API and exact date engine, changes the sample buffer from 48 to 93 days, and propagates the result across seven graph nodes and two passport-dependent decision gates. This is an inspectable counterfactual, not a second pre-recorded animation.

## Hackathon technology

- NVIDIA Nemotron 3 for constrained evidence reasoning
- Nebius Token Factory for OpenAI-compatible model inference
- Tavily Search + Extract for live evidence retrieval from server-verified official domains
- Next.js / Vinext / TypeScript for the product experience
- Cloudflare-compatible deployment through Sites

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
