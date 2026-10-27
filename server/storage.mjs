import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function safeEqual(left, right) {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class LocalJsonStorage {
  constructor(filePath, retentionDays = 90) {
    this.filePath = filePath;
    this.retentionDays = retentionDays;
    this.queue = Promise.resolve();
  }

  async read() {
    try {
      return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return { sessions: [], messages: [], events: [] };
      throw error;
    }
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(temporary, this.filePath);
  }

  mutate(operation) {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = await operation(data);
      await this.write(data);
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }

  async createSession(session) {
    return this.mutate(data => {
      data.sessions.push(session);
      return session;
    });
  }

  async authorised(sessionId, token) {
    const data = await this.read();
    const session = data.sessions.find(item => item.session_id === sessionId);
    return Boolean(session && safeEqual(session.access_token_hash, hashToken(token)));
  }

  async addMessages(messages) {
    return this.mutate(data => data.messages.push(...messages));
  }

  async addEvent(event) {
    return this.mutate(data => data.events.push(event));
  }

  async purgeExpired(now = new Date()) {
    const cutoff = now.getTime() - this.retentionDays * 86_400_000;
    return this.mutate(data => {
      const expired = new Set(data.sessions.filter(item => new Date(item.started_at).getTime() < cutoff).map(item => item.session_id));
      data.sessions = data.sessions.filter(item => !expired.has(item.session_id));
      data.messages = data.messages.filter(item => !expired.has(item.session_id));
      data.events = data.events.filter(item => !expired.has(item.session_id));
      return expired.size;
    });
  }
}

export class SupabaseStorage {
  constructor({ url, serviceRoleKey, retentionDays = 90 }) {
    if (!url || !serviceRoleKey) throw new Error('Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    this.url = url.replace(/\/$/, '');
    this.key = serviceRoleKey;
    this.retentionDays = retentionDays;
  }

  async request(tableAndQuery, options = {}) {
    const response = await fetch(`${this.url}/rest/v1/${tableAndQuery}`, {
      ...options,
      headers: {
        apikey: this.key,
        authorization: `Bearer ${this.key}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`Supabase request failed with status ${response.status}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  createSession(session) {
    return this.request('chat_sessions', { method: 'POST', body: JSON.stringify(session) });
  }

  async authorised(sessionId, token) {
    const query = `chat_sessions?select=session_id&session_id=eq.${encodeURIComponent(sessionId)}&access_token_hash=eq.${hashToken(token)}&limit=1`;
    const rows = await this.request(query, { headers: { prefer: 'return=representation' } });
    return Array.isArray(rows) && rows.length === 1;
  }

  addMessages(messages) {
    return this.request('chat_messages', { method: 'POST', body: JSON.stringify(messages) });
  }

  addEvent(event) {
    return this.request('chat_events', { method: 'POST', body: JSON.stringify(event) });
  }

  async purgeExpired(now = new Date()) {
    const cutoff = new Date(now.getTime() - this.retentionDays * 86_400_000).toISOString();
    await this.request(`chat_sessions?started_at=lt.${encodeURIComponent(cutoff)}`, { method: 'DELETE' });
    return null;
  }
}

export function createStorage(config) {
  if (config.storage === 'supabase') {
    return new SupabaseStorage({ url: config.supabaseUrl, serviceRoleKey: config.supabaseServiceRoleKey, retentionDays: config.retentionDays });
  }
  return new LocalJsonStorage(config.dataFile, config.retentionDays);
}
