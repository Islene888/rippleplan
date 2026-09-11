'use client';

import { useEffect, useMemo, useState } from 'react';
import { evaluatePassportValidity } from '@/lib/passport-validity';

type RunState = 'ready' | 'running' | 'complete';
type GraphTone = 'mint' | 'risk' | 'amber' | 'blue';

type EvidenceSource = {
  title: string;
  description: string;
  domain: string;
  url: string;
};

type AnalysisResult = {
  mode: 'reference' | 'live';
  bufferDays: number;
  shortfallDays: number;
  summary: string;
  nextAction: string;
  sources: EvidenceSource[];
  integrations: { tavily: boolean; nemotron: boolean };
  elapsedMs: number;
  fetchedAt: string;
  cacheStatus: 'fresh' | 'hit' | 'coalesced';
  evidenceAgeMs: number;
};

const referenceSources: EvidenceSource[] = [
  {
    title: 'Your Europe',
    description: 'Travel documents for non-EU nationals',
    domain: 'europa.eu',
    url: 'https://europa.eu/youreurope/citizens/travel/entry-exit/non-eu-nationals/index_en.htm',
  },
  {
    title: 'EUR-Lex',
    description: 'Schengen Borders Code, Article 6',
    domain: 'eur-lex.europa.eu',
    url: 'https://eur-lex.europa.eu/eli/reg/2016/399/oj/eng',
  },
  {
    title: 'France-Visas',
    description: 'Documents presented on arrival in France',
    domain: 'france-visas.gouv.fr',
    url: 'https://france-visas.gouv.fr/en/votre-arrivee-en-france',
  },
];

function createReferenceAnalysis(returnDate = '2026-11-28'): AnalysisResult {
  const plannedExit = new Date(`${returnDate}T00:00:00Z`);
  const passportExpiry = new Date('2027-01-15T00:00:00Z');
  const {
    bufferDays,
    shortfallDays,
    cushionDays,
    requiredExpiryDate,
  } = evaluatePassportValidity(plannedExit, passportExpiry);
  return {
    mode: 'reference',
    bufferDays,
    shortfallDays,
    summary: shortfallDays > 0
      ? `The sample passport remains valid for ${bufferDays} days after the planned Schengen exit, but expires ${shortfallDays} ${shortfallDays === 1 ? 'day' : 'days'} before the required ${requiredExpiryDate} calendar-month boundary.`
      : `The sample passport remains valid for ${bufferDays} days after the planned Schengen exit and clears the required ${requiredExpiryDate} calendar-month boundary by ${cushionDays} ${cushionDays === 1 ? 'day' : 'days'}.`,
    nextAction: shortfallDays > 0
      ? 'Begin passport renewal before booking non-refundable travel'
      : 'Keep the shifted itinerary and recheck official guidance before booking',
    sources: referenceSources,
    integrations: { tavily: false, nemotron: false },
    elapsedMs: 0,
    fetchedAt: new Date(0).toISOString(),
    cacheStatus: 'fresh',
    evidenceAgeMs: 0,
  };
}

const initialAnalysis = createReferenceAnalysis();

const scenarios = {
  original: {
    departureDate: '2026-11-14',
    returnDate: '2026-11-28',
    displayDates: 'Nov 14 — Nov 28, 2026',
    shortDates: 'Nov 14–28, 2026',
  },
  shifted: {
    departureDate: '2026-09-30',
    returnDate: '2026-10-14',
    displayDates: 'Sep 30 — Oct 14, 2026',
    shortDates: 'Sep 30–Oct 14, 2026',
  },
} as const;

const edges = [
  { left: 15, top: 44, width: 19, rotate: -28 },
  { left: 15, top: 57, width: 19, rotate: 27 },
  { left: 38, top: 24, width: 18, rotate: 0 },
  { left: 39, top: 64, width: 25, rotate: -48 },
  { left: 39, top: 34, width: 25, rotate: 48 },
  { left: 63, top: 24, width: 18, rotate: 0 },
  { left: 63, top: 65, width: 25, rotate: -48 },
  { left: 79, top: 37, width: 19, rotate: 90 },
];

export default function Home() {
  const [runState, setRunState] = useState<RunState>('ready');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedNode, setSelectedNode] = useState('passport');
  const [analysis, setAnalysis] = useState<AnalysisResult>(initialAnalysis);
  const [actionOpen, setActionOpen] = useState(false);
  const [scenarioShifted, setScenarioShifted] = useState(false);

  const scenario = scenarioShifted ? scenarios.shifted : scenarios.original;
  const hasRisk = runState === 'complete' && analysis.shortfallDays > 0;
  const graphNodes = useMemo(
    () => [
      { id: 'trip', eyebrow: 'Life event', title: 'Paris trip', detail: scenario.shortDates, x: 8, y: 50, tone: 'mint' as GraphTone, delay: 0 },
      { id: 'passport', eyebrow: 'Personal document', title: 'Passport validity', detail: 'Expires Jan 15, 2027', x: 31, y: 24, tone: hasRisk ? 'risk' as GraphTone : 'mint' as GraphTone, delay: 1 },
      { id: 'rule', eyebrow: 'Official rule', title: 'Entry requirement', detail: '3 calendar months after exit', x: 31, y: 75, tone: runState === 'complete' ? (hasRisk ? 'amber' as GraphTone : 'mint' as GraphTone) : 'amber' as GraphTone, delay: 2 },
      { id: 'eligibility', eyebrow: 'Gate 1', title: 'Passport validity gate', detail: runState === 'complete' ? (hasRisk ? '3-month gate fails' : 'This gate passes') : 'Waiting for evidence', x: 55, y: 24, tone: hasRisk ? 'risk' as GraphTone : 'mint' as GraphTone, delay: 3 },
      { id: 'renewal', eyebrow: 'Decision', title: 'Renewal timing', detail: runState === 'complete' ? (hasRisk ? 'Needed before booking' : 'Can be scheduled later') : 'Depends on validity', x: 55, y: 75, tone: hasRisk ? 'blue' as GraphTone : 'mint' as GraphTone, delay: 4 },
      { id: 'booking', eyebrow: 'Gate 2', title: 'Booking records', detail: runState === 'complete' ? (hasRisk ? 'Hold non-refundable spend' : 'No document hold') : 'Depends on renewal', x: 79, y: 24, tone: hasRisk ? 'amber' as GraphTone : 'mint' as GraphTone, delay: 5 },
      { id: 'readiness', eyebrow: 'Final signal', title: 'Document readiness', detail: runState === 'complete' ? (hasRisk ? 'Blocked by this gate' : 'This gate clear; others unchecked') : 'Awaiting ripple', x: 79, y: 75, tone: hasRisk ? 'risk' as GraphTone : 'mint' as GraphTone, delay: 6 },
    ],
    [hasRisk, runState, scenario.shortDates],
  );

  useEffect(() => {
    if (runState !== 'running') return;
    const timers = graphNodes.map((node, index) =>
      window.setTimeout(() => setActiveIndex(index), 430 * (node.delay + 1)),
    );
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [graphNodes, runState]);

  const selected = useMemo(
    () => graphNodes.find((node) => node.id === selectedNode) ?? graphNodes[1],
    [graphNodes, selectedNode],
  );

  const usesOfficialSources = ['rule', 'eligibility', 'readiness'].includes(selected.id);
  const selectedSources = runState === 'complete' && usesOfficialSources ? analysis.sources : [];
  const inspector = useMemo(() => {
    if (runState !== 'complete') {
      return {
        label: 'Awaiting evidence check',
        detail: 'RipplePlan will keep the personal fact, exact calculation, retrieved evidence, and human decision separate.',
        provenance: 'Not evaluated',
      };
    }
    switch (selected.id) {
      case 'trip':
        return { label: 'Synthetic plan input', detail: `Demo itinerary: ${scenario.displayDates}.`, provenance: 'User-supplied fact' };
      case 'passport':
        return { label: 'Synthetic document fact', detail: 'The demo passport expiry is January 15, 2027.', provenance: 'User-supplied fact' };
      case 'rule':
        return { label: 'Official rule reference', detail: 'The passport-validity gate is checked against the linked official guidance.', provenance: `${selectedSources.length} source links` };
      case 'eligibility':
        return { label: hasRisk ? 'Deterministic passport gate failed' : 'Deterministic passport gate passed', detail: analysis.summary, provenance: `${selectedSources.length} sources + date engine` };
      case 'renewal':
        return { label: 'Human-reviewed decision', detail: analysis.nextAction, provenance: 'Conservative workflow' };
      case 'booking':
        return { label: 'Downstream planning guardrail', detail: hasRisk ? 'Non-refundable spending is held until the document issue is resolved.' : 'No passport-validity hold is needed for the shifted sample dates.', provenance: 'Derived product rule' };
      default:
        return { label: hasRisk ? 'Document signal: blocked' : 'Passport signal: clear', detail: hasRisk ? 'This passport gate propagates into renewal timing and booking readiness.' : 'The shifted itinerary clears this one passport gate; visa, stay-length, and other entry conditions are not evaluated.', provenance: `${selectedSources.length} sources + date engine` };
    }
  }, [analysis.nextAction, analysis.summary, hasRisk, runState, scenario.displayDates, selected.id, selectedSources.length]);

  const liveIntegrationCount = Number(analysis.integrations.tavily) + Number(analysis.integrations.nemotron);
  const runModeLabel = liveIntegrationCount === 2 ? 'LIVE RUN' : liveIntegrationCount === 1 ? 'PARTIAL LIVE' : 'REFERENCE RUN';
  const runModeClass = liveIntegrationCount === 2 ? 'mode-live' : liveIntegrationCount === 1 ? 'mode-partial' : 'mode-reference';

  const startCheck = async (useShiftedScenario = scenarioShifted) => {
    const nextScenario = useShiftedScenario ? scenarios.shifted : scenarios.original;
    setScenarioShifted(useShiftedScenario);
    setActiveIndex(-1);
    setRunState('running');
    setSelectedNode('trip');
    setActionOpen(false);
    const minimumAnimation = new Promise((resolve) => window.setTimeout(resolve, 2600));
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination: 'France',
          departureDate: nextScenario.departureDate,
          returnDate: nextScenario.returnDate,
          passportExpiry: '2027-01-15',
          nationality: 'United States',
        }),
      });
      if (!response.ok) throw new Error('Analysis request failed');
      const result = (await response.json()) as AnalysisResult;
      await minimumAnimation;
      setAnalysis(result);
    } catch {
      await minimumAnimation;
      setAnalysis(createReferenceAnalysis(nextScenario.returnDate));
    }
    setActiveIndex(graphNodes.length - 1);
    setSelectedNode(useShiftedScenario ? 'readiness' : 'eligibility');
    setRunState('complete');
  };

  const exportCalendar = () => {
    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RipplePlan//Passport Readiness Demo//EN',
      'BEGIN:VEVENT',
      'UID:rippleplan-passport-renewal-demo',
      'DTSTART;VALUE=DATE:20260918',
      'SUMMARY:Review passport renewal — RipplePlan',
      'DESCRIPTION:Synthetic RipplePlan demo reminder. Verify requirements with the issuing authority.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rippleplan-passport-review.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="RipplePlan home">
          <span className="brand-mark"><span /></span>
          <span>RipplePlan</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#evidence">Evidence</a>
          <span className="private-pill"><i /> Synthetic demo</span>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>●</span> PERSONAL AI · EVIDENCE GRAPH</div>
          <h1>One change.<br /><em>See the whole ripple.</em></h1>
          <p>
            RipplePlan maps your important documents to current supporting evidence,
            reveals downstream risks, and keeps exact decisions in inspectable rules.
          </p>
        </div>
        <div className="hero-proof" aria-label="Product principles">
          <div><strong>01</strong><span>Private by design</span></div>
          <div><strong>02</strong><span>Every rule inspectable</span></div>
          <div><strong>03</strong><span>Actions stay yours</span></div>
        </div>
      </section>

      <section className="product-frame" id="how" aria-label="RipplePlan interactive demo">
        <div className="frame-topline">
          <div>
            <span className="live-dot" />
            <strong>Passport readiness workspace</strong>
            <span className="case-id">RP–TRAVEL–026</span>
          </div>
          <div className="engine-row">
          <span>NVIDIA Nemotron-3.5 Lightning</span>
          <span>Nebius Token Factory</span>
          <span>Tavily Search + Extract</span>
          {runState === 'complete' && <span className={`mode-chip ${runModeClass}`}>{runModeLabel}</span>}
          </div>
        </div>

        <div className="workspace-grid">
          <aside className="scenario-panel">
            <div className="panel-label">SCENARIO INPUT</div>
            <h2>Paris in November</h2>
            <p className="panel-intro">Check whether this synthetic traveler is document-ready.</p>

            <div className="passport-card">
              <div className="passport-head"><span>DEMO PASSPORT</span><span>✦</span></div>
              <div className="passport-person">
                <div className="avatar" aria-hidden="true">A</div>
                <div><strong>Alex Rivera</strong><span>Sample traveler</span></div>
              </div>
              <div className="passport-data">
                <span><small>EXPIRES</small>15 JAN 2027</span>
                <span><small>COUNTRY</small>UNITED STATES</span>
              </div>
            </div>

            <label className="field-label" htmlFor="destination">Destination</label>
            <div className="fake-field" id="destination"><span>France · Schengen Area</span><b>⌄</b></div>
            <label className="field-label" htmlFor="dates">Planned travel</label>
            <div className="fake-field" id="dates"><span>{scenario.displayDates}</span><b>↗</b></div>

            <button className="primary-action" onClick={() => void startCheck(scenarioShifted)} disabled={runState === 'running'}>
              {runState === 'running' ? <><span className="spinner" /> Tracing ripple…</> : <><span>✦</span> Run evidence check</>}
            </button>
            {runState === 'complete' && (
              <button
                className="perturb-action"
                onClick={() => void startCheck(!scenarioShifted)}
                disabled={runState === 'running'}
              >
                <span>↺</span>
                {scenarioShifted ? 'Restore original dates' : 'What if the trip moves 45 days earlier?'}
              </button>
            )}
            <p className="privacy-note"><span>◆</span> No real identity data is used in this demo.</p>
          </aside>

          <section className="graph-panel" aria-label="Dependency graph">
            <div className="graph-heading">
              <div>
                <div className="panel-label">DEPENDENCY GRAPH</div>
                <h2>{runState === 'ready' ? 'Ready to trace dependencies' : runState === 'running' ? 'Tracing every consequence…' : hasRisk ? 'One issue cascades through three decisions' : 'The shifted plan clears this passport gate'}</h2>
              </div>
              <div className={`risk-badge ${runState === 'complete' ? 'shown' : ''} ${runState === 'complete' && !hasRisk ? 'safe' : ''}`}>
                <span>{hasRisk ? '!' : '✓'}</span> {hasRisk ? '1 critical risk' : '0 critical risks'}
              </div>
            </div>

            <div className={`graph-canvas state-${runState}`}>
              <div className="graph-grid" />
              {edges.map((edge, index) => (
                <span
                  key={index}
                  className={`edge edge-${index} ${activeIndex >= index ? 'active' : ''}`}
                  style={{ left: `${edge.left}%`, top: `${edge.top}%`, width: `${edge.width}%`, transform: `rotate(${edge.rotate}deg)` }}
                ><i /></span>
              ))}
              {graphNodes.map((node, index) => (
                <button
                  key={node.id}
                  className={`graph-node tone-${node.tone} ${activeIndex >= index ? 'active' : ''} ${selectedNode === node.id ? 'selected' : ''}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => setSelectedNode(node.id)}
                  aria-label={`Inspect ${node.title}`}
                >
                  <span className="node-status" />
                  <small>{node.eyebrow}</small>
                  <strong>{node.title}</strong>
                  <span>{node.detail}</span>
                </button>
              ))}
              <div className={`ripple-ring ${runState === 'running' ? 'animating' : ''}`} />
            </div>

            <div className="graph-footer">
              <span><i className="legend-safe" /> Supported</span>
              <span><i className="legend-watch" /> Needs attention</span>
              <span><i className="legend-risk" /> At risk</span>
              <span className="graph-tip">Select a node to inspect its evidence</span>
            </div>
          </section>

          <aside className="evidence-panel" id="evidence">
            <div className="panel-label">EVIDENCE INSPECTOR</div>
            <div className="selection-label">Selected node</div>
            <h2>{selected.title}</h2>
            <div className={`confidence-card ${runState === 'complete' ? 'resolved' : ''}`}>
              <div><span>Provenance</span><strong>{runState === 'complete' ? inspector.provenance : '—'}</strong></div>
              <div className="confidence-track"><i style={{ width: runState === 'complete' ? '100%' : '0%' }} /></div>
              <small>{runState === 'complete' ? 'Inspectable evidence—not a legal confidence score' : 'Run a check to verify this node'}</small>
            </div>

            <div className="reason-box">
              <span className="reason-icon">{runState === 'complete' ? (hasRisk ? '!' : '✓') : '?'}</span>
              <div>
                <strong>{inspector.label}</strong>
                <p>{inspector.detail}</p>
              </div>
            </div>

            {runState === 'complete' && usesOfficialSources && (
              <div className={`model-check ${analysis.integrations.nemotron ? 'live' : 'fallback'}`}>
                <div><span>NEMOTRON SEMANTIC CHECK</span><strong>{analysis.integrations.nemotron ? 'SUPPORTED' : 'FALLBACK'}</strong></div>
                <p>{analysis.integrations.nemotron
                  ? 'Matched varied official wording to the reviewed rule; deterministic code kept control of dates and actions.'
                  : 'Model output was unavailable or rejected; the inspected date result remains deterministic.'}</p>
              </div>
            )}

            <div className="source-list">
              <div className="source-title"><span>Sources for this node</span><b>{selectedSources.length}</b></div>
              {selectedSources.slice(0, 3).map((source, index) => (
                <article key={source.url} className={runState === 'complete' ? 'source-visible' : ''} style={{ transitionDelay: `${index * 100}ms` }}>
                  <span>{index + 1}</span>
                  <div><strong>{source.title}</strong><p>{source.description}</p><a href={source.url} target="_blank" rel="noreferrer"><small>{source.domain} ↗</small></a></div>
                </article>
              ))}
            </div>

            <div className={`next-action ${runState === 'complete' ? 'shown' : ''}`}>
              <small>SAFEST NEXT ACTION</small>
              <strong>{analysis.nextAction}</strong>
              <button type="button" onClick={() => setActionOpen((open) => !open)}>Review action plan <span>→</span></button>
            </div>
            {actionOpen && (
              <div className="action-drawer" role="dialog" aria-label="Action plan">
                <div className="action-drawer-head"><strong>Human-approved plan</strong><button onClick={() => setActionOpen(false)} aria-label="Close action plan">×</button></div>
                {hasRisk ? (
                  <ol>
                    <li>Confirm the latest rule on the linked official pages.</li>
                    <li>Check renewal timing with the passport authority.</li>
                    <li>Hold non-refundable bookings until documents are ready.</li>
                    <li>After renewal, update the passport number on booking records.</li>
                  </ol>
                ) : (
                  <ol>
                    <li>Keep the shifted itinerary while the three-calendar-month gate remains clear.</li>
                    <li>Recheck official guidance before non-refundable booking.</li>
                    <li>Schedule a later passport renewal review.</li>
                  </ol>
                )}
                <button className="calendar-button" onClick={exportCalendar}>Download reminder (.ics)</button>
              </div>
            )}
            {runState === 'complete' && (
              <p className="run-provenance">
                {analysis.cacheStatus === 'hit' && liveIntegrationCount > 0
                  ? `Cached partner evidence · ${Math.round(analysis.evidenceAgeMs / 1000)}s old · ${analysis.integrations.tavily ? 'Tavily' : ''}${analysis.integrations.tavily && analysis.integrations.nemotron ? ' + ' : ''}${analysis.integrations.nemotron ? 'Nemotron' : ''}`
                  : analysis.cacheStatus === 'coalesced' && liveIntegrationCount > 0
                    ? `Shared fresh partner run · response ${analysis.elapsedMs} ms · ${analysis.integrations.tavily ? 'Tavily' : ''}${analysis.integrations.tavily && analysis.integrations.nemotron ? ' + ' : ''}${analysis.integrations.nemotron ? 'Nemotron' : ''}`
                    : liveIntegrationCount === 2
                    ? `Fresh partner run · response ${analysis.elapsedMs} ms · Tavily + Nemotron`
                    : liveIntegrationCount === 1
                      ? `Partial fresh run · ${analysis.integrations.tavily ? 'Tavily live; Nemotron fallback' : 'Nemotron live; reference sources'}`
                    : 'Reference run · partner services not configured or unavailable'}
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="outcomes" aria-label="What RipplePlan proves">
        <div><span className="outcome-number">07</span><p>graph nodes traced<br /><strong>across two decision gates</strong></p></div>
        <div><span className="outcome-number">{String(analysis.sources.length).padStart(2, '0')}</span><p>official sources<br /><strong>attached to this rule</strong></p></div>
        <div>
          <span className="outcome-number">{runState === 'complete' ? (hasRisk ? '01' : '00') : '—'}</span>
          <p>{runState === 'complete' ? (hasRisk ? 'critical issue' : 'issues in this gate') : 'risk result'}<br /><strong>{runState === 'complete' ? (hasRisk ? 'caught before travel' : 'after the date shift') : 'pending evidence check'}</strong></p>
        </div>
        <div className="outcome-statement">A personal AI should not just remember your life.<br /><strong>It should understand what changes next.</strong></div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><span /></span><span>RipplePlan</span></div>
        <p>Evidence-backed personal planning. Built for the Nebius × NVIDIA Global AI Hackathon.</p>
        <span>Demo data only · Not legal advice</span>
      </footer>
    </main>
  );
}
