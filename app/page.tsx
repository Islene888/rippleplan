'use client';

import { useEffect, useMemo, useState } from 'react';

type RunState = 'ready' | 'running' | 'complete';

type EvidenceSource = {
  title: string;
  description: string;
  domain: string;
  url: string;
};

type AnalysisResult = {
  mode: 'reference' | 'live';
  confidence: number;
  bufferDays: number;
  shortfallDays: number;
  summary: string;
  nextAction: string;
  sources: EvidenceSource[];
  integrations: { tavily: boolean; nemotron: boolean };
  elapsedMs: number;
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
    title: 'European Commission',
    description: 'Applying for a Schengen visa',
    domain: 'home-affairs.ec.europa.eu',
    url: 'https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en',
  },
];

const initialAnalysis: AnalysisResult = {
  mode: 'reference',
  confidence: 94,
  bufferDays: 48,
  shortfallDays: 42,
  summary: 'The sample passport remains valid for only 48 days after the planned departure—42 days short of the referenced rule.',
  nextAction: 'Begin passport renewal before booking non-refundable travel',
  sources: referenceSources,
  integrations: { tavily: false, nemotron: false },
  elapsedMs: 0,
};

const graphNodes = [
  { id: 'trip', eyebrow: 'Life event', title: 'Paris trip', detail: 'Nov 14–28, 2026', x: 8, y: 41, tone: 'mint', delay: 0 },
  { id: 'passport', eyebrow: 'Personal document', title: 'Passport validity', detail: 'Expires Jan 15, 2027', x: 34, y: 16, tone: 'risk', delay: 1 },
  { id: 'rule', eyebrow: 'Live official rule', title: 'Entry requirement', detail: '90 days after departure', x: 34, y: 67, tone: 'amber', delay: 2 },
  { id: 'boarding', eyebrow: 'Downstream impact', title: 'Boarding readiness', detail: 'Document risk detected', x: 67, y: 18, tone: 'risk', delay: 3 },
  { id: 'action', eyebrow: 'Safe next action', title: 'Renewal window', detail: 'Start before Sep 18', x: 67, y: 67, tone: 'blue', delay: 4 },
] as const;

const edges = [
  { left: 24, top: 49, width: 18, rotate: -24 },
  { left: 24, top: 52, width: 18, rotate: 24 },
  { left: 50, top: 29, width: 19, rotate: 3 },
  { left: 50, top: 72, width: 20, rotate: -3 },
  { left: 75, top: 48, width: 16, rotate: 90 },
];

export default function Home() {
  const [runState, setRunState] = useState<RunState>('ready');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedNode, setSelectedNode] = useState('passport');
  const [analysis, setAnalysis] = useState<AnalysisResult>(initialAnalysis);
  const [actionOpen, setActionOpen] = useState(false);

  useEffect(() => {
    if (runState !== 'running') return;
    const timers = graphNodes.map((node, index) =>
      window.setTimeout(() => setActiveIndex(index), 430 * (node.delay + 1)),
    );
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [runState]);

  const selected = useMemo(
    () => graphNodes.find((node) => node.id === selectedNode) ?? graphNodes[1],
    [selectedNode],
  );

  const startCheck = async () => {
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
          departureDate: '2026-11-14',
          returnDate: '2026-11-28',
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
      setAnalysis(initialAnalysis);
    }
    setActiveIndex(graphNodes.length - 1);
    setSelectedNode('passport');
    setRunState('complete');
  };

  const exportCalendar = () => {
    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RipplePlan//Travel Readiness Demo//EN',
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
          <div className="kicker"><span>●</span> PERSONAL AI · LIVE EVIDENCE GRAPH</div>
          <h1>One change.<br /><em>See the whole ripple.</em></h1>
          <p>
            RipplePlan connects your important documents to live official rules,
            reveals downstream risks, and gives you an evidence-backed path forward.
          </p>
        </div>
        <div className="hero-proof" aria-label="Product principles">
          <div><strong>01</strong><span>Private by design</span></div>
          <div><strong>02</strong><span>Every edge cited</span></div>
          <div><strong>03</strong><span>Actions stay yours</span></div>
        </div>
      </section>

      <section className="product-frame" id="how" aria-label="RipplePlan interactive demo">
        <div className="frame-topline">
          <div>
            <span className="live-dot" />
            <strong>Travel readiness workspace</strong>
            <span className="case-id">RP–TRAVEL–026</span>
          </div>
          <div className="engine-row">
          <span>NVIDIA Nemotron 3</span>
          <span>Nebius Token Factory</span>
          <span>Tavily Search</span>
          {runState === 'complete' && <span className={`mode-chip mode-${analysis.mode}`}>{analysis.mode === 'live' ? 'LIVE RUN' : 'REFERENCE RUN'}</span>}
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
            <div className="fake-field" id="dates"><span>Nov 14 — Nov 28, 2026</span><b>↗</b></div>

            <button className="primary-action" onClick={startCheck} disabled={runState === 'running'}>
              {runState === 'running' ? <><span className="spinner" /> Tracing ripple…</> : <><span>✦</span> Run evidence check</>}
            </button>
            <p className="privacy-note"><span>◆</span> No real identity data is used in this demo.</p>
          </aside>

          <section className="graph-panel" aria-label="Dependency graph">
            <div className="graph-heading">
              <div>
                <div className="panel-label">DEPENDENCY GRAPH</div>
                <h2>{runState === 'ready' ? 'Ready to trace dependencies' : runState === 'running' ? 'Tracing every consequence…' : 'One issue affects two outcomes'}</h2>
              </div>
              <div className={`risk-badge ${runState === 'complete' ? 'shown' : ''}`}>
                <span>!</span> 1 critical risk
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
              <div><span>Evidence confidence</span><strong>{runState === 'complete' ? `${analysis.confidence}%` : '—'}</strong></div>
              <div className="confidence-track"><i /></div>
              <small>{runState === 'complete' ? '3 official sources agree' : 'Run a check to verify this node'}</small>
            </div>

            <div className="reason-box">
              <span className="reason-icon">{runState === 'complete' ? '!' : '?'}</span>
              <div>
                <strong>{runState === 'complete' ? 'Validity buffer is too short' : 'Awaiting live verification'}</strong>
                <p>{runState === 'complete' ? analysis.summary : 'RipplePlan will compare the personal fact against current official guidance.'}</p>
              </div>
            </div>

            <div className="source-list">
              <div className="source-title"><span>Supporting sources</span><b>{runState === 'complete' ? '3' : '0'}</b></div>
              {analysis.sources.slice(0, 3).map((source, index) => (
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
                <ol>
                  <li>Confirm the latest rule on the linked official pages.</li>
                  <li>Check renewal timing with the passport authority.</li>
                  <li>Delay non-refundable bookings until documents are ready.</li>
                </ol>
                <button className="calendar-button" onClick={exportCalendar}>Download reminder (.ics)</button>
              </div>
            )}
            {runState === 'complete' && (
              <p className="run-provenance">
                {analysis.mode === 'live'
                  ? `Live partner run · ${analysis.elapsedMs} ms · Tavily + Nemotron`
                  : 'Reference run · live partner keys not configured'}
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="outcomes" aria-label="What RipplePlan proves">
        <div><span className="outcome-number">05</span><p>dependencies traced<br /><strong>in one run</strong></p></div>
        <div><span className="outcome-number">03</span><p>official sources<br /><strong>attached to claims</strong></p></div>
        <div><span className="outcome-number">01</span><p>critical issue<br /><strong>caught before travel</strong></p></div>
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
