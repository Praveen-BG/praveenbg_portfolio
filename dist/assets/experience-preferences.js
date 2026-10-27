/*
 * Shared portfolio experience preference.
 * One persisted state controls decorative motion and the small Web Audio sound palette.
 * Sound triggers: generic link/button click, chatbot tap, launcher chime, answer pop, close click.
 */
(() => {
  const STORAGE_KEY = 'praveen-motion';
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
  let explicitChoice = saved === 'on' || saved === 'off';
  let enabled = explicitChoice ? saved === 'on' : !media.matches;
  let context = null;
  let unlocked = false;
  let lastStartedAt = 0;
  const active = new Set();
  const queued = new Set();
  const playCounts = { click: 0, tap: 0, chime: 0, pop: 0 };

  const palette = {
    click: [{ frequency: 720, duration: .05, gain: .034, type: 'triangle' }],
    tap: [{ frequency: 920, duration: .055, gain: .03, type: 'sine' }],
    chime: [
      { frequency: 659.25, duration: .14, gain: .036, type: 'sine', delay: 0 },
      { frequency: 880, duration: .18, gain: .028, type: 'sine', delay: .06 }
    ],
    pop: [{ frequency: 1046.5, duration: .085, gain: .032, type: 'triangle' }]
  };

  function updateControls() {
    document.documentElement.classList.toggle('motion-off', !enabled);
    document.body?.classList.toggle('motion-off', !enabled);
    document.querySelectorAll('#motionToggle').forEach(toggle => {
      const label = `Motion and sound: ${enabled ? 'On' : 'Off'}`;
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      const tip = toggle.querySelector('#motionTip, .motion-tip');
      if (tip) tip.textContent = label;
    });
  }

  function bindControls() {
    document.querySelectorAll('#motionToggle').forEach(toggle => {
      if (toggle.dataset.preferenceBound === 'true') return;
      toggle.dataset.preferenceBound = 'true';
      toggle.addEventListener('click', () => togglePreference());
    });
    updateControls();
  }

  function stopAll() {
    queued.forEach(timer => clearTimeout(timer));
    queued.clear();
    active.forEach(node => {
      try { node.stop(); } catch {}
    });
    active.clear();
  }

  async function unlock() {
    if (!enabled) return false;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context ||= new AudioContext();
      if (context.state === 'suspended') await context.resume();
      unlocked = context.state === 'running';
      return unlocked;
    } catch {
      return false;
    }
  }

  function play(name, { delay = 0 } = {}) {
    if (!enabled || !unlocked || !context || !palette[name]) return false;
    if (delay > 0) {
      const timer = setTimeout(() => {
        queued.delete(timer);
        if (enabled) play(name);
      }, delay);
      queued.add(timer);
      return true;
    }
    const nowMs = performance.now();
    if (nowMs - lastStartedAt < 42) return false;
    lastStartedAt = nowMs;
    stopAll();
    playCounts[name] += 1;
    const startAt = context.currentTime + .004;
    palette[name].forEach(note => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startAt + (note.delay || 0);
      const noteEnd = noteStart + note.duration;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);
      gain.gain.setValueAtTime(.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(note.gain, noteStart + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, noteEnd);
      oscillator.connect(gain).connect(context.destination);
      oscillator.addEventListener('ended', () => active.delete(oscillator), { once: true });
      active.add(oscillator);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + .01);
    });
    return true;
  }

  function setEnabled(value, { persist = true } = {}) {
    enabled = Boolean(value);
    if (persist) {
      explicitChoice = true;
      try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch {}
    }
    if (!enabled) stopAll();
    updateControls();
    document.dispatchEvent(new CustomEvent('praveen:experiencechange', { detail: { enabled } }));
  }

  function togglePreference() {
    setEnabled(!enabled);
  }

  function eligibleControl(target) {
    const control = target.closest?.('a[href],button');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return null;
    return control;
  }

  document.addEventListener('pointerdown', event => {
    if (event.isPrimary !== false && eligibleControl(event.target)) unlock();
  }, true);
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && eligibleControl(event.target)) unlock();
  }, true);
  document.addEventListener('click', event => {
    const control = eligibleControl(event.target);
    if (!control || control.dataset.sound === 'none') return;
    unlock().then(() => play(control.dataset.sound || 'click')).catch(() => {});
  });
  media.addEventListener('change', event => {
    if (!explicitChoice) setEnabled(!event.matches, { persist: false });
  });
  document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  updateControls();

  window.PraveenExperience = {
    isEnabled: () => enabled,
    setEnabled,
    toggle: togglePreference,
    unlock,
    play,
    stopAll,
    getDiagnostics: () => ({ enabled, explicitChoice, unlocked, active: active.size, queued: queued.size, playCounts: { ...playCounts } })
  };
})();
