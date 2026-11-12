const APPROVED_FACTS = [
  'Private Search Mode is a browser toolbar extension.',
  'When Private Mode is off, Yahoo is the provider.',
  'When Private Mode is on, the user can choose Brave, DuckDuckGo, Startpage, or Mojeek.',
  'Changing Private Mode or the provider does not open an Incognito window.',
  'Incognito is a separate browser feature with its own history and cookie behavior.',
  'This portfolio simulator cannot install an extension or change real browser settings.',
  'The model may explain settings but must never apply them.'
];

const MAX_QUESTION_LENGTH = 320;

function quickExplanation(state) {
  if (state.privateMode) {
    return `Turning Private Mode on routes searches in this demo to ${state.provider}. It does not open an Incognito window. Incognito is a separate browser feature with its own history and cookie behavior.`;
  }
  return 'Private Mode is off, so Yahoo remains the provider in this demo. Changing the simulated setting does not open Incognito or alter your real browser.';
}

function validState(value) {
  const providers = new Set(['Yahoo', 'DuckDuckGo', 'Brave', 'Startpage', 'Mojeek']);
  if (!value || typeof value.privateMode !== 'boolean' || !providers.has(value.provider)) return null;
  return { privateMode: value.privateMode, provider: value.privateMode ? value.provider : 'Yahoo' };
}

export async function readJsonBody(req, maxBytes = 4096) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > maxBytes) {
      const error = new Error('Request is too large.');
      error.status = 413;
      throw error;
    }
  }
  try { return JSON.parse(raw || '{}'); }
  catch {
    const error = new Error('Request body must be valid JSON.');
    error.status = 400;
    throw error;
  }
}

function parseOutputText(payload) {
  return (payload.output || [])
    .filter(item => item.type === 'message')
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 900);
}

export async function generateAtomExplanation({ body, apiKey = '', model = 'gpt-5-mini', fetchImpl = fetch }) {
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const state = validState(body?.state);
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    const error = new Error(`Question must be between 1 and ${MAX_QUESTION_LENGTH} characters.`);
    error.status = 400;
    throw error;
  }
  if (!state) {
    const error = new Error('The simulated setting state is invalid.');
    error.status = 400;
    throw error;
  }
  if (!apiKey) return { mode: 'fallback', label: 'Quick explanation', answer: quickExplanation(state) };

  const instructions = [
    'You explain a simulated browser-extension setting for a portfolio case study.',
    'Use only the approved facts supplied in the user input.',
    'Answer in 2 to 4 short sentences.',
    'State clearly that Private Mode does not open Incognito.',
    'Never imply that you changed a setting. Preview and Apply are user-controlled.',
    'If the facts are insufficient, say you do not have enough information.'
  ].join(' ');
  const input = `SIMULATED STATE\nPrivate Mode: ${state.privateMode ? 'On' : 'Off'}\nProvider: ${state.provider}\n\nAPPROVED FACTS\n- ${APPROVED_FACTS.join('\n- ')}\n\nVISITOR QUESTION\n${question}`;

  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, store: false, instructions, input, max_output_tokens: 220 }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error(`AI request failed with ${response.status}`);
    const answer = parseOutputText(await response.json());
    if (!answer) throw new Error('AI response did not include text.');
    return { mode: 'ai', label: 'AI explanation', answer };
  } catch {
    return { mode: 'fallback', label: 'Quick explanation', answer: quickExplanation(state) };
  }
}

export function createRateLimiter(maxPerMinute = 10) {
  const buckets = new Map();
  return key => {
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now - current.startedAt >= 60_000) {
      buckets.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= maxPerMinute;
  };
}
