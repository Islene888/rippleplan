# RipplePlan

**One change. See the whole ripple.**

RipplePlan is an evidence-backed personal AI that maps how a change in an important document or plan affects every requirement downstream. The hackathon demo uses a synthetic passport and a France travel scenario: it calculates the passport-validity buffer, searches current official guidance, explains the risk, and creates a human-approved next-action plan.

> Demo data only. RipplePlan is an information-organizing prototype, not legal advice. Always verify requirements with the responsible authority.

## Why it is different

Most assistants return a checklist. RipplePlan returns a **cited dependency graph**:

- Personal facts and plans form the starting nodes.
- Tavily searches only selected official domains for current requirements.
- NVIDIA Nemotron on Nebius Token Factory turns retrieved evidence into constrained, structured explanations.
- Deterministic code owns date arithmetic and never delegates that calculation to a model.
- Every consequential action remains behind explicit human approval.

The application degrades honestly: without partner keys it runs a labeled reference snapshot, and with both keys configured it displays a labeled live run.

## Architecture

```text
Synthetic life event
        |
        v
Deterministic fact layer ---- computes dates and buffers
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

The evaluation script checks the deterministic passport buffer and risk decision across clean, boundary, at-risk, leap-year, and live-demo perturbation cases.

The interface includes a **45-day trip shift** control. It reruns the same API and exact date engine, changes the sample buffer from 48 to 93 days, and propagates the result across seven nodes and two decision gates. This is an inspectable counterfactual, not a second pre-recorded animation.

## Hackathon technology

- NVIDIA Nemotron 3 for constrained evidence reasoning
- Nebius Token Factory for OpenAI-compatible model inference
- Tavily Search for live, official-domain evidence retrieval
- Next.js / Vinext / TypeScript for the product experience
- Cloudflare-compatible deployment through Sites

## Privacy and safety

- The public demo contains no real identity documents.
- API credentials are never sent to the browser.
- Retrieved text cannot change the deterministic date calculation.
- Source links remain visible beside conclusions.
- The prototype does not submit applications or make bookings.

## License

[MIT](LICENSE)
