import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { generateAtomExplanation } from '../server/atom-ai.mjs';

const defaultBody = {
  question: 'If I turn this on and pick DuckDuckGo, will it also open an Incognito window?',
  state: { privateMode: true, provider: 'DuckDuckGo' }
};

test('Atom AI endpoint returns a labeled fixed fallback without an API key', async () => {
  const result = await generateAtomExplanation({ body: defaultBody, apiKey: '' });
  assert.equal(result.mode, 'fallback');
  assert.equal(result.label, 'Quick explanation');
  assert.match(result.answer, /DuckDuckGo/);
  assert.match(result.answer, /does not open an Incognito window/);
});

test('Atom AI endpoint sends only reviewed facts, state, and the submitted question', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, ...options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'DuckDuckGo would receive searches. This does not open Incognito. Apply remains your choice.' }] }] }) };
  };
  const result = await generateAtomExplanation({ body: defaultBody, apiKey: 'test-key', model: 'test-model', fetchImpl });
  assert.equal(result.mode, 'ai');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false);
  assert.equal(request.body.model, 'test-model');
  assert.match(request.body.input, /Private Mode: On/);
  assert.match(request.body.input, /Provider: DuckDuckGo/);
  assert.match(request.body.input, /VISITOR QUESTION/);
  assert.doesNotMatch(request.body.input, /browser history|search quer(y|ies)/i);
});

test('Atom case study presents the full suite and removes the AI-first page direction', async () => {
  const home = await fs.readFile('dist/index.html', 'utf8');
  const page = await fs.readFile('dist/atom-desktop.html', 'utf8');
  assert.match(home, /href="atom-desktop\.html" target="_blank" rel="noopener noreferrer">View Atom case study ↗<\/a>/);
  assert.match(page, /<h1>Atom Desktop Suite<\/h1>/);
  assert.match(page, /Media\.net · Senior UX Designer/);
  assert.match(page, /href="atom-desktop\.html" aria-current="page"[\s\S]*?<span>Media\.net<\/span>/);
  assert.match(page, /href="gain-credit\.html"[\s\S]*?<span>Gain Credit<\/span>/);
  assert.match(page, /href="idp\.html"[\s\S]*?<span>IDP<\/span>/);
  assert.match(page, /href="matrimony\.html"[\s\S]*?<span>Matrimony\.com<\/span>/);
  assert.equal((page.match(/<tr><td>/g) || []).length, 14);
  assert.match(page, /assets\/atom\/private-search-mode-popup\.svg/);
  assert.match(page, /Product website ↗/);
  assert.match(page, /View in Chrome Web Store ↗/);
  assert.doesNotMatch(page, /Try AI prototype|Independent AI prototype|id="privateMode"|Apply in demo|Static help versus AI help/);
  assert.doesNotMatch(page, /15–25% conversion lift/);
});
