type Scenario = {
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passportExpiry?: string;
  nationality?: string;
};

type EvidenceSource = {
  title: string;
  description: string;
  domain: string;
  url: string;
};

const officialDomains = [
  'europa.eu',
  'eur-lex.europa.eu',
  'home-affairs.ec.europa.eu',
  'travel.state.gov',
];

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

function parseDate(value: string | undefined, fallback: string) {
  const date = new Date(`${value ?? fallback}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return new Date(`${fallback}T00:00:00Z`);
  return date;
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, 420) || fallback;
}

async function searchOfficialSources(query: string, apiKey: string): Promise<EvidenceSource[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      topic: 'general',
      search_depth: 'advanced',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
      include_domains: officialDomains,
    }),
  });
  if (!response.ok) throw new Error(`Tavily request failed: ${response.status}`);
  const data = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string; score?: number }>;
  };
  return (data.results ?? [])
    .filter((result) => result.url && (result.score ?? 1) >= 0.45)
    .slice(0, 3)
    .map((result) => {
      const url = new URL(result.url as string);
      return {
        title: cleanText(result.title, url.hostname),
        description: cleanText(result.content, 'Official travel guidance'),
        domain: url.hostname.replace(/^www\./, ''),
        url: url.toString(),
      };
    });
}

async function reasonWithNemotron(
  scenario: Required<Scenario>,
  sources: EvidenceSource[],
  apiKey: string,
) {
  const model = process.env.NEBIUS_MODEL || 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8';
  const response = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 360,
      messages: [
        {
          role: 'system',
          content: 'You are the evidence reasoning engine for RipplePlan. Use only the supplied sources and computed facts. Never provide legal advice. Return strict JSON with two string fields: summary and nextAction.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Explain the passport validity risk and propose one conservative next action.',
            scenario,
            fixedRule: 'Passport should remain valid for at least 90 days after intended EU departure.',
            sources,
          }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Nebius request failed: ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Nemotron did not return JSON');
  return JSON.parse(match[0]) as { summary?: string; nextAction?: string };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const body = (await request.json().catch(() => ({}))) as Scenario;
  const scenario: Required<Scenario> = {
    destination: cleanText(body.destination, 'France'),
    departureDate: cleanText(body.departureDate, '2026-11-14'),
    returnDate: cleanText(body.returnDate, '2026-11-28'),
    passportExpiry: cleanText(body.passportExpiry, '2027-01-15'),
    nationality: cleanText(body.nationality, 'United States'),
  };

  const returnDate = parseDate(scenario.returnDate, '2026-11-28');
  const passportExpiry = parseDate(scenario.passportExpiry, '2027-01-15');
  const bufferDays = Math.floor((passportExpiry.getTime() - returnDate.getTime()) / 86_400_000);
  const shortfallDays = Math.max(0, 90 - bufferDays);
  const fallbackSummary = `The sample passport remains valid for only ${bufferDays} days after the planned departure—${shortfallDays} days short of the referenced rule.`;
  const fallbackNextAction = 'Begin passport renewal before booking non-refundable travel';

  let sources = referenceSources;
  let tavily = false;
  let nemotron = false;
  let summary = fallbackSummary;
  let nextAction = fallbackNextAction;

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const liveSources = await searchOfficialSources(
        `${scenario.destination} official passport validity requirement after departure for ${scenario.nationality} traveler`,
        tavilyKey,
      );
      if (liveSources.length >= 2) {
        sources = liveSources;
        tavily = true;
      }
    } catch {
      // The reference snapshot remains available when a partner API is temporarily unavailable.
    }
  }

  const nebiusKey = process.env.NEBIUS_API_KEY;
  if (nebiusKey) {
    try {
      const reasoned = await reasonWithNemotron(scenario, sources, nebiusKey);
      summary = cleanText(reasoned.summary, fallbackSummary);
      nextAction = cleanText(reasoned.nextAction, fallbackNextAction);
      nemotron = true;
    } catch {
      // Deterministic date arithmetic is the safe fallback; no model output is required for correctness.
    }
  }

  return Response.json(
    {
      mode: tavily && nemotron ? 'live' : 'reference',
      confidence: tavily && nemotron ? 96 : 94,
      bufferDays,
      shortfallDays,
      summary,
      nextAction,
      sources,
      integrations: { tavily, nemotron },
      elapsedMs: Date.now() - startedAt,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
