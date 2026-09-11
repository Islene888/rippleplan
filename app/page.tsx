'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluatePassportValidity } from '@/lib/passport-validity';

type RunState = 'ready' | 'running' | 'complete';
type GraphTone = 'mint' | 'risk' | 'amber' | 'blue';

type EvidenceSource = {
  title: string;
  description: string;
  domain: string;
  url: string;
};

type ScenarioDates = {
  departureDate: string;
  returnDate: string;
  passportExpiry: string;
};

type SemanticCheck = {
  evidenceSupport: 'supports_rule';
  summary: string;
  model: string;
  excerpt: {
    title: string;
    domain: string;
    text: string;
  };
  evidenceCount: number;
};

type AnalysisResult = {
  mode: 'reference' | 'partial' | 'live';
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
  semanticCheck: SemanticCheck | null;
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

function createReferenceAnalysis(dates: ScenarioDates): AnalysisResult {
  const plannedExit = new Date(`${dates.returnDate}T00:00:00Z`);
  const passportExpiry = new Date(`${dates.passportExpiry}T00:00:00Z`);
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
    semanticCheck: null,
  };
}

const scenarioPresets = {
  original: {
    departureDate: '2026-11-14',
    returnDate: '2026-11-28',
    passportExpiry: '2027-01-15',
  },
  shifted: {
    departureDate: '2026-09-30',
    returnDate: '2026-10-14',
    passportExpiry: '2027-01-15',
  },
} as const;

const initialAnalysis = createReferenceAnalysis(scenarioPresets.original);

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatUtcDate(value: string, short = false) {
  const formatter = short ? shortDateFormatter : dateFormatter;
  return formatter.format(new Date(`${value}T00:00:00Z`));
}

function shiftUtcDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function createScenarioView(dates: ScenarioDates) {
  return {
    ...dates,
    displayDates: `${formatUtcDate(dates.departureDate)} — ${formatUtcDate(dates.returnDate)}`,
    shortDates: `${formatUtcDate(dates.departureDate, true)}–${formatUtcDate(dates.returnDate, true)}, ${dates.returnDate.slice(0, 4)}`,
  };
}

function sameDates(first: ScenarioDates, second: ScenarioDates) {
  return first.departureDate === second.departureDate
    && first.returnDate === second.returnDate
    && first.passportExpiry === second.passportExpiry;
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const graphEdges = [
  { from: 'trip', to: 'passport', activeAt: 1 },
  { from: 'trip', to: 'rule', activeAt: 2 },
  { from: 'passport', to: 'eligibility', activeAt: 3 },
  { from: 'rule', to: 'eligibility', activeAt: 3 },
  { from: 'eligibility', to: 'renewal', activeAt: 4 },
  { from: 'eligibility', to: 'booking', activeAt: 5 },
  { from: 'renewal', to: 'readiness', activeAt: 6 },
  { from: 'booking', to: 'readiness', activeAt: 6 },
] as const;

const downstreamDecisionNodes = new Set(['renewal', 'booking', 'readiness']);

export default function Home() {
  const [runState, setRunState] = useState<RunState>('ready');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedNode, setSelectedNode] = useState('passport');
  const [analysis, setAnalysis] = useState<AnalysisResult>(initialAnalysis);
  const [actionOpen, setActionOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [draftDates, setDraftDates] = useState<ScenarioDates>({ ...scenarioPresets.original });
  const [evaluatedDates, setEvaluatedDates] = useState<ScenarioDates>({ ...scenarioPresets.original });
  const [scenarioError, setScenarioError] = useState('');
  const graphCanvasRef = useRef<HTMLDivElement>(null);
  const graphNodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [edgePaths, setEdgePaths] = useState<string[]>([]);

  const scenario = useMemo(() => createScenarioView(evaluatedDates), [evaluatedDates]);
  const hasRisk = runState === 'complete' && analysis.shortfallDays > 0;
  const isComparedWithSample = runState === 'complete' && !sameDates(evaluatedDates, scenarioPresets.original);
  const riskFlippedFromSample = isComparedWithSample && initialAnalysis.shortfallDays > 0 && analysis.shortfallDays === 0;
  const evaluatedRule = useMemo(
    () => evaluatePassportValidity(
      new Date(`${evaluatedDates.returnDate}T00:00:00Z`),
      new Date(`${evaluatedDates.passportExpiry}T00:00:00Z`),
    ),
    [evaluatedDates],
  );
  const sampleRule = useMemo(
    () => evaluatePassportValidity(
      new Date(`${scenarioPresets.original.returnDate}T00:00:00Z`),
      new Date(`${scenarioPresets.original.passportExpiry}T00:00:00Z`),
    ),
    [],
  );
  const graphNodes = useMemo(
    () => [
      { id: 'trip', eyebrow: 'Life event', title: 'Paris trip', detail: scenario.shortDates, x: 14, y: 50, tone: 'mint' as GraphTone, delay: 0 },
      { id: 'passport', eyebrow: 'Personal document', title: 'Passport validity', detail: `Expires ${formatUtcDate(evaluatedDates.passportExpiry)}`, x: 38, y: 28, tone: hasRisk ? 'risk' as GraphTone : 'mint' as GraphTone, delay: 1 },
      { id: 'rule', eyebrow: 'Official rule', title: 'Entry requirement', detail: '3 calendar months after exit', x: 38, y: 72, tone: runState === 'complete' ? (hasRisk ? 'amber' as GraphTone : 'mint' as GraphTone) : 'amber' as GraphTone, delay: 2 },
      { id: 'eligibility', eyebrow: 'Gate 1', title: 'Passport validity gate', detail: runState === 'complete' ? (hasRisk ? '3-month gate fails' : 'This gate passes') : 'Waiting for evidence', x: 62, y: 28, tone: hasRisk ? 'risk' as GraphTone : 'mint' as GraphTone, delay: 3 },
      { id: 'renewal', eyebrow: 'Decision', title: 'Renewal timing', detail: runState === 'complete' ? (hasRisk ? 'Needed before booking' : 'Can be scheduled later') : 'Depends on validity', x: 62, y: 72, tone: hasRisk ? 'blue' as GraphTone : 'mint' as GraphTone, delay: 4 },
      { id: 'booking', eyebrow: 'Gate 2', title: 'Booking records', detail: runState === 'complete' ? (hasRisk ? 'Hold non-refundable spend' : 'No document hold') : 'Depends on renewal', x: 86, y: 28, tone: hasRisk ? 'amber' as GraphTone : 'mint' as GraphTone, delay: 5 },
      { id: 'readiness', eyebrow: 'Final signal', title: 'Document readiness', detail: runState === 'complete' ? (hasRisk ? 'Blocked by this gate' : 'This gate clear; others unchecked') : 'Awaiting ripple', x: 86, y: 72, tone: hasRisk ? 'risk' as GraphTone : 'mint' as GraphTone, delay: 6 },
    ],
    [evaluatedDates.passportExpiry, hasRisk, runState, scenario.shortDates],
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

  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;

    let frame = 0;
    const updatePaths = () => {
      const canvasRect = canvas.getBoundingClientRect();
      const nextPaths = graphEdges.map(({ from, to }) => {
        const source = graphNodeRefs.current[from]?.getBoundingClientRect();
        const target = graphNodeRefs.current[to]?.getBoundingClientRect();
        if (!source || !target) return '';

        const sourceCenter = {
          x: source.left + source.width / 2 - canvasRect.left,
          y: source.top + source.height / 2 - canvasRect.top,
        };
        const targetCenter = {
          x: target.left + target.width / 2 - canvasRect.left,
          y: target.top + target.height / 2 - canvasRect.top,
        };
        const dx = targetCenter.x - sourceCenter.x;
        const dy = targetCenter.y - sourceCenter.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
          const direction = Math.sign(dx) || 1;
          const startX = sourceCenter.x + direction * (source.width / 2 + 2);
          const endX = targetCenter.x - direction * (target.width / 2 + 7);
          const controlOffset = Math.max(22, Math.abs(endX - startX) * 0.48) * direction;
          return `M ${startX} ${sourceCenter.y} C ${startX + controlOffset} ${sourceCenter.y}, ${endX - controlOffset} ${targetCenter.y}, ${endX} ${targetCenter.y}`;
        }

        const direction = Math.sign(dy) || 1;
        const startY = sourceCenter.y + direction * (source.height / 2 + 2);
        const endY = targetCenter.y - direction * (target.height / 2 + 7);
        const controlOffset = Math.max(22, Math.abs(endY - startY) * 0.48) * direction;
        return `M ${sourceCenter.x} ${startY} C ${sourceCenter.x} ${startY + controlOffset}, ${targetCenter.x} ${endY - controlOffset}, ${targetCenter.x} ${endY}`;
      });
      setEdgePaths(nextPaths);
    };

    const queueUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePaths);
    };
    const observer = new ResizeObserver(queueUpdate);
    observer.observe(canvas);
    Object.values(graphNodeRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });
    queueUpdate();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [graphNodes]);

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
        return { label: 'Synthetic document fact', detail: `The editable demo passport expiry is ${formatUtcDate(evaluatedDates.passportExpiry)}.`, provenance: 'User-supplied fact' };
      case 'rule':
        return { label: 'Official rule reference', detail: 'The passport-validity gate is checked against the linked official guidance.', provenance: `${selectedSources.length} source links` };
      case 'eligibility':
        return { label: hasRisk ? 'Deterministic passport gate failed' : 'Deterministic passport gate passed', detail: analysis.summary, provenance: `${selectedSources.length} sources + date engine` };
      case 'renewal':
        return { label: 'Human-reviewed decision', detail: analysis.nextAction, provenance: 'Conservative workflow' };
      case 'booking':
        return { label: 'Downstream planning guardrail', detail: hasRisk ? 'Non-refundable spending is held until the document issue is resolved.' : 'No passport-validity hold is needed for the shifted sample dates.', provenance: 'Derived product rule' };
      default:
        return { label: hasRisk ? 'Document signal: blocked' : 'Passport signal: clear', detail: hasRisk ? 'This passport gate propagates into renewal timing and booking readiness.' : 'The current itinerary clears this one passport gate; visa, stay-length, and other entry conditions are not evaluated.', provenance: `${selectedSources.length} sources + date engine` };
    }
  }, [analysis.nextAction, analysis.summary, evaluatedDates.passportExpiry, hasRisk, runState, scenario.displayDates, selected.id, selectedSources.length]);

  const liveIntegrationCount = Number(analysis.integrations.tavily) + Number(analysis.integrations.nemotron);
  const runModeLabel = analysis.mode === 'live' ? 'LIVE RUN' : analysis.mode === 'partial' ? 'PARTIAL LIVE' : 'REFERENCE RUN';
  const runModeClass = analysis.mode === 'live' ? 'mode-live' : analysis.mode === 'partial' ? 'mode-partial' : 'mode-reference';

  const handleDateChange = (field: 'returnDate' | 'passportExpiry', value: string) => {
    const nextDates = {
      ...draftDates,
      [field]: value,
      ...(field === 'returnDate' && isValidDateString(value)
        ? { departureDate: shiftUtcDate(value, -14) }
        : {}),
    };
    setDraftDates(nextDates);
    setScenarioError('');
    setActionOpen(false);
    setTraceOpen(false);
    setActiveIndex(-1);
    setRunState('ready');
    if (
      isValidDateString(nextDates.returnDate)
      && isValidDateString(nextDates.passportExpiry)
      && nextDates.returnDate <= nextDates.passportExpiry
    ) {
      setEvaluatedDates(nextDates);
      setAnalysis(createReferenceAnalysis(nextDates));
    }
  };

  const startCheck = async (nextDates: ScenarioDates = draftDates) => {
    if (!isValidDateString(nextDates.returnDate) || !isValidDateString(nextDates.passportExpiry)) {
      setScenarioError('Enter complete, valid dates before running the check.');
      return;
    }
    if (nextDates.returnDate > nextDates.passportExpiry) {
      setScenarioError('Passport expiry must be on or after the planned Schengen exit.');
      return;
    }

    setDraftDates(nextDates);
    setEvaluatedDates(nextDates);
    setActiveIndex(-1);
    setRunState('running');
    setSelectedNode('trip');
    setActionOpen(false);
    setTraceOpen(false);
    setScenarioError('');
    const minimumAnimation = new Promise((resolve) => window.setTimeout(resolve, 2600));
    let response: Response;
    try {
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination: 'France',
          departureDate: nextDates.departureDate,
          returnDate: nextDates.returnDate,
          passportExpiry: nextDates.passportExpiry,
          nationality: 'United States',
        }),
      });
    } catch {
      await minimumAnimation;
      setAnalysis(createReferenceAnalysis(nextDates));
      setActiveIndex(graphNodes.length - 1);
      setSelectedNode('eligibility');
      setRunState('complete');
      setScenarioError('Partner services were unreachable; showing a labeled deterministic reference run.');
      return;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { error?: unknown } | null;
      await minimumAnimation;
      setRunState('ready');
      setActiveIndex(-1);
      setScenarioError(typeof errorBody?.error === 'string' ? errorBody.error : 'The scenario could not be analyzed.');
      return;
    }

    const result = (await response.json()) as AnalysisResult;
    await minimumAnimation;
    setAnalysis(result);
    setActiveIndex(graphNodes.length - 1);
    setSelectedNode('eligibility');
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
          <h1>One change.<em>See the whole ripple.</em></h1>
          <p>
            A passport date can block a trip and non-refundable spend. RipplePlan uses Nemotron
            to normalize current official wording, then traces only consequences computed by reviewed rules.
          </p>
        </div>
        <div className="hero-proof" aria-label="RipplePlan decision boundary">
          <div><strong>01</strong><span>Official wording</span></div>
          <div><strong>02</strong><span>Nemotron judgment</span></div>
          <div><strong>03</strong><span>Deterministic date gate</span></div>
          <div><strong>04</strong><span>Your approval</span></div>
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
            <h2>Alex&apos;s France trip</h2>
            <p className="panel-intro">Edit the dates, then trace this reviewed passport rule.</p>

            <div className="passport-card">
              <div className="passport-head"><span>DEMO PASSPORT</span><span>✦</span></div>
              <div className="passport-person">
                <div className="avatar" aria-hidden="true">A</div>
                <div><strong>Alex Rivera</strong><span>Sample traveler</span></div>
              </div>
              <div className="passport-data">
                <span><small>EXPIRES</small>{isValidDateString(draftDates.passportExpiry) ? formatUtcDate(draftDates.passportExpiry) : 'Set a date'}</span>
                <span><small>COUNTRY</small>UNITED STATES</span>
              </div>
            </div>

            <label className="field-label" htmlFor="rule-pack">Active rule pack</label>
            <div className="rule-pack-field" id="rule-pack"><span>U.S. passport → France / Schengen</span><b>REVIEWED · V1</b></div>

            <div className="date-control-grid">
              <label htmlFor="planned-exit">
                <span>Planned Schengen exit</span>
                <input
                  id="planned-exit"
                  type="date"
                  min="2020-01-15"
                  max={draftDates.passportExpiry || '2100-12-31'}
                  value={draftDates.returnDate}
                  onChange={(event) => handleDateChange('returnDate', event.target.value)}
                  disabled={runState === 'running'}
                />
              </label>
              <label htmlFor="passport-expiry">
                <span>Passport expiry</span>
                <input
                  id="passport-expiry"
                  type="date"
                  min={draftDates.returnDate || '2020-01-01'}
                  max="2100-12-31"
                  value={draftDates.passportExpiry}
                  onChange={(event) => handleDateChange('passportExpiry', event.target.value)}
                  disabled={runState === 'running'}
                />
              </label>
            </div>
            <p className="trip-window">14-day sample trip · starts {isValidDateString(draftDates.returnDate) ? formatUtcDate(shiftUtcDate(draftDates.returnDate, -14)) : 'after a valid exit date is set'}</p>

            <button className="primary-action" onClick={() => void startCheck()} disabled={runState === 'running'}>
              {runState === 'running' ? <><span className="spinner" /> Tracing ripple…</> : <><span>✦</span> Trace this scenario</>}
            </button>
            {runState === 'complete' && (
              <button
                className="perturb-action"
                onClick={() => void startCheck(sameDates(evaluatedDates, scenarioPresets.shifted) ? { ...scenarioPresets.original } : { ...scenarioPresets.shifted })}
                disabled={runState === 'running'}
              >
                <span>↺</span>
                {sameDates(evaluatedDates, scenarioPresets.shifted) ? 'Restore at-risk sample' : 'Compare with the 1-day-cushion sample'}
              </button>
            )}
            {scenarioError && <p className="scenario-message" role="status">{scenarioError}</p>}
            <p className="privacy-note"><span>◆</span> No real identity data is used in this demo.</p>
          </aside>

          <section className="graph-panel" aria-labelledby="dependency-graph-heading">
            <div className="graph-heading">
              <div>
                <div className="panel-label">DEPENDENCY GRAPH</div>
                <h2 id="dependency-graph-heading" aria-live="polite">{runState === 'ready' ? 'Ready to trace dependencies' : runState === 'running' ? 'Tracing every consequence…' : hasRisk ? 'One issue cascades through three decisions' : 'The current dates clear this passport gate'}</h2>
              </div>
              {runState === 'complete' && (
                <div className={`risk-badge shown ${!hasRisk ? 'safe' : ''}`}>
                  <span>{hasRisk ? '!' : '✓'}</span> {hasRisk ? '1 critical risk' : '0 critical risks'}
                </div>
              )}
            </div>

            {isComparedWithSample && (
              <div className={`ripple-delta ${riskFlippedFromSample ? 'cleared' : ''}`} aria-label="Change compared with the at-risk sample">
                <div><small>EXIT</small><span>{formatUtcDate(scenarioPresets.original.returnDate, true)} <b>→</b> {formatUtcDate(evaluatedDates.returnDate, true)}</span></div>
                <div><small>RULE BOUNDARY</small><span>{formatUtcDate(sampleRule.requiredExpiryDate, true)} <b>→</b> {formatUtcDate(evaluatedRule.requiredExpiryDate, true)}</span></div>
                <div><small>SHORTFALL</small><span>{initialAnalysis.shortfallDays}d <b>→</b> {analysis.shortfallDays}d</span></div>
                <strong>{riskFlippedFromSample ? '3 downstream decisions cleared' : 'Ripple recomputed · risk state unchanged'}</strong>
              </div>
            )}

            <div ref={graphCanvasRef} className={`graph-canvas state-${runState}`}>
              <p className="sr-only">The trip connects to the passport fact and reviewed rule. Those determine the passport-validity gate, which affects renewal timing, booking records, and final document readiness.</p>
              <div className="graph-grid" />
              <svg className="graph-edges" width="100%" height="100%" aria-hidden="true">
                <defs>
                  <marker id="graph-arrow-muted" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" />
                  </marker>
                  <marker id="graph-arrow-active" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" />
                  </marker>
                </defs>
                {graphEdges.map((edge, index) => (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    className={`graph-edge-path ${activeIndex >= edge.activeAt ? 'active' : ''} ${selectedNode === edge.from || selectedNode === edge.to ? 'selected-edge' : ''} ${riskFlippedFromSample && (downstreamDecisionNodes.has(edge.from) || downstreamDecisionNodes.has(edge.to)) ? 'delta-edge' : ''}`}
                    d={edgePaths[index] ?? ''}
                    markerEnd={activeIndex >= edge.activeAt ? 'url(#graph-arrow-active)' : 'url(#graph-arrow-muted)'}
                  />
                ))}
              </svg>
              {graphNodes.map((node, index) => (
                <button
                  key={node.id}
                  className={`graph-node tone-${node.tone} ${activeIndex >= index ? 'active' : ''} ${selectedNode === node.id ? 'selected' : ''} ${riskFlippedFromSample && downstreamDecisionNodes.has(node.id) ? 'changed' : ''}`}
                  data-node-id={node.id}
                  ref={(element) => { graphNodeRefs.current[node.id] = element; }}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => setSelectedNode(node.id)}
                  aria-pressed={selectedNode === node.id}
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
                <div className="model-check-head">
                  <div><span>NEMOTRON SEMANTIC CHECK</span><strong>{analysis.integrations.nemotron ? 'VALIDATED OUTPUT' : 'FALLBACK'}</strong></div>
                  {analysis.semanticCheck && (
                    <button type="button" onClick={() => setTraceOpen((open) => !open)} aria-expanded={traceOpen}>
                      {traceOpen ? 'Hide trace' : 'Inspect AI trace'} <b>{traceOpen ? '↑' : '↓'}</b>
                    </button>
                  )}
                </div>
                <p>{analysis.integrations.nemotron
                  ? `${analysis.semanticCheck?.evidenceCount ?? selectedSources.length} qualified excerpts were normalized against the reviewed rule; dates and actions stayed outside the model.`
                  : 'Model output was unavailable or rejected; the inspected date result remains deterministic.'}</p>
                {traceOpen && analysis.semanticCheck && (
                  <div className="semantic-trace" role="region" aria-label="Validated Nemotron evidence transformation">
                    <section>
                      <small>01 · QUALIFIED INPUT · TREATED AS UNTRUSTED TEXT</small>
                      <strong>{analysis.semanticCheck.excerpt.title} · {analysis.semanticCheck.excerpt.domain}</strong>
                      <blockquote>{analysis.semanticCheck.excerpt.text}</blockquote>
                      <span>1 of {analysis.semanticCheck.evidenceCount} excerpts supplied to the model</span>
                    </section>
                    <div className="trace-arrow" aria-hidden="true">↓</div>
                    <section className="trace-output">
                      <small>02 · NEMOTRON SEMANTIC NORMALIZATION</small>
                      <strong>{analysis.semanticCheck.model}</strong>
                      <pre>{JSON.stringify({
                        evidenceSupport: analysis.semanticCheck.evidenceSupport,
                        summary: analysis.semanticCheck.summary,
                      }, null, 2)}</pre>
                    </section>
                    <div className="trace-arrow" aria-hidden="true">↓</div>
                    <section className="trace-boundary">
                      <small>03 · CODE BOUNDARY</small>
                      <strong>Date math, risk gates, and actions excluded</strong>
                      <span>Schema, numbers, polarity, and action language are validated before display.</span>
                    </section>
                  </div>
                )}
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
                    <li>Keep the current itinerary while the three-calendar-month gate remains clear.</li>
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
