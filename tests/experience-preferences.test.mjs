import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await fs.readFile('dist/assets/experience-preferences.js', 'utf8');

function createEnvironment({ saved = null, reduced = false, audioAvailable = true } = {}) {
  const values = new Map(saved == null ? [] : [['praveen-motion', saved]]);
  let audioContexts = 0;
  const classState = new Set();
  const mediaListeners = new Map();
  const media = {
    matches: reduced,
    addEventListener(type, listener) { mediaListeners.set(type, listener); }
  };
  const document = {
    body: null,
    documentElement: { classList: { toggle(name, on) { on ? classState.add(name) : classState.delete(name); } } },
    querySelectorAll() { return []; },
    addEventListener() {},
    dispatchEvent() {}
  };
  class MockAudioContext {
    constructor() { audioContexts += 1; this.state = 'running'; }
  }
  const window = { matchMedia: () => media };
  if (audioAvailable) window.AudioContext = MockAudioContext;
  const context = {
    window,
    document,
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    performance: { now: () => 100 },
    setTimeout,
    clearTimeout
  };
  window.window = window;
  vm.runInNewContext(source, context);
  return { api: window.PraveenExperience, values, classState, mediaListeners, audioContexts: () => audioContexts };
}

test('first visit follows reduced-motion preference without autoplay', () => {
  const regular = createEnvironment();
  assert.equal(regular.api.isEnabled(), true);
  assert.equal(regular.audioContexts(), 0);

  const reduced = createEnvironment({ reduced: true });
  assert.equal(reduced.api.isEnabled(), false);
  assert.equal(reduced.classState.has('motion-off'), true);
  assert.equal(reduced.audioContexts(), 0);
});

test('saved explicit choice overrides reduced motion and persists changes', () => {
  const environment = createEnvironment({ saved: 'on', reduced: true });
  assert.equal(environment.api.isEnabled(), true);
  environment.api.setEnabled(false);
  assert.equal(environment.api.isEnabled(), false);
  assert.equal(environment.values.get('praveen-motion'), 'off');
  assert.equal(environment.classState.has('motion-off'), true);
});

test('shared controller documents the gated Web Audio palette and cancellation path', () => {
  assert.match(source, /pointerdown/);
  assert.match(source, /event\.key === 'Enter'/);
  assert.match(source, /click: \[/);
  assert.match(source, /tap: \[/);
  assert.match(source, /chime: \[/);
  assert.match(source, /pop: \[/);
  assert.match(source, /if \(!enabled\) stopAll\(\)/);
  assert.match(source, /Motion and sound: \$\{enabled \? 'On' : 'Off'\}/);
  assert.match(source, /frequency: 720, duration: \.05, gain: \.034/);
  assert.match(source, /frequency: 920, duration: \.055, gain: \.03/);
  assert.match(source, /frequency: 1046\.5, duration: \.085, gain: \.032/);
});

test('turning the shared preference off cancels a queued reply sound', async () => {
  const environment = createEnvironment();
  assert.equal(await environment.api.unlock(), true);
  assert.equal(environment.api.play('pop', { delay: 100 }), true);
  assert.equal(environment.api.getDiagnostics().queued, 1);
  environment.api.setEnabled(false);
  assert.equal(environment.api.getDiagnostics().queued, 0);
  assert.equal(environment.api.getDiagnostics().active, 0);
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(environment.api.getDiagnostics().playCounts.pop, 0);
});

test('unavailable browser audio fails silently without disabling the interface', async () => {
  const environment = createEnvironment({ audioAvailable: false });
  assert.equal(await environment.api.unlock(), false);
  assert.equal(environment.api.play('click'), false);
  assert.equal(environment.api.isEnabled(), true);
});
