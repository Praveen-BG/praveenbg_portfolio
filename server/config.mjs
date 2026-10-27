import fs from 'node:fs';
import path from 'node:path';

export function loadDotEnv(filePath = path.resolve('.env')) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function getConfig(overrides = {}) {
  const storage = overrides.storage || process.env.CHAT_STORAGE || 'local';
  if (!['local', 'supabase'].includes(storage)) throw new Error('CHAT_STORAGE must be local or supabase.');
  return {
    port: integer(overrides.port ?? process.env.PORT, 4173, 1, 65535),
    storage,
    dataFile: overrides.dataFile || path.resolve('.data/chat-records.json'),
    retentionDays: integer(overrides.retentionDays ?? process.env.CHAT_RETENTION_DAYS, 90, 1, 3650),
    rateLimitPerMinute: integer(overrides.rateLimitPerMinute ?? process.env.CHAT_RATE_LIMIT_PER_MINUTE, 60, 5, 1000),
    supabaseUrl: overrides.supabaseUrl ?? process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: overrides.supabaseServiceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    aiEnabled: String(overrides.aiEnabled ?? process.env.ASK_PRAVEEN_AI_ENABLED ?? 'false').toLowerCase() === 'true'
  };
}
