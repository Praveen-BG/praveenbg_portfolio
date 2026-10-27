import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPortfolioServer } from '../server/app.mjs';
import { getConfig } from '../server/config.mjs';
import { loadFaqDataset } from '../server/faq.mjs';

async function startTestServer() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ask-praveen-'));
  const dataFile = path.join(directory, 'records.json');
  const config = getConfig({ port: 4173, storage: 'local', dataFile, rateLimitPerMinute: 1000 });
  const faqDataset = await loadFaqDataset();
  const { server } = createPortfolioServer({ config, faqDataset });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    base: `http://127.0.0.1:${address.port}`,
    dataFile,
    close: async () => {
      await new Promise(resolve => server.close(resolve));
      await fs.rm(directory, { recursive: true, force: true });
    }
  };
}

test('chat recording endpoints are disabled and create no storage file', async t => {
  const app = await startTestServer();
  t.after(app.close);
  for (const route of ['/api/chat/session', '/api/chat/record', '/api/chat/event']) {
    const response = await fetch(`${app.base}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consent: true, name: 'Synthetic Visitor', company: 'Synthetic Company' })
    });
    assert.equal(response.status, 410, route);
    assert.deepEqual(await response.json(), { error: 'Chat recording is disabled.' });
  }
  await assert.rejects(fs.access(app.dataFile));
});

test('deterministic FAQ remains available without storage', async t => {
  const app = await startTestServer();
  t.after(app.close);
  const response = await fetch(`${app.base}/data/portfolio-faq.json`);
  assert.equal(response.status, 200);
  const dataset = await response.json();
  assert.equal(dataset.total_questions, 21);
  for (const id of ['contact_003', 'hiring_001', 'ai_003', 'ai_004', 'work_005', 'experience_001', 'hiring_002']) {
    assert.equal(dataset.questions.some(item => item.id === id), false);
  }
});

test('status reports deterministic FAQ, disabled recording, and approved contact channels', async t => {
  const app = await startTestServer();
  t.after(app.close);
  const response = await fetch(`${app.base}/api/status`);
  assert.equal(response.status, 200);
  const status = await response.json();
  assert.equal(status.faq_mode, 'deterministic');
  assert.equal(status.ai_enabled, false);
  assert.equal(status.storage_mode, 'disabled');
  assert.equal(status.storage_configured, false);
  assert.deepEqual(status.contact, { linkedin: true, email: true, phone: false, resume: true });
});
