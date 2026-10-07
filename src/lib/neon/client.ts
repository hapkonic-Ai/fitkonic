import { neon } from '@neondatabase/serverless';
import type { SyncQueueItem } from '@/types';

export interface NeonHealthStatus {
  online: boolean;
  serverReachable: boolean;
  engine: string;
  hasRemoteUrl: boolean;
}

export interface RemoteSyncRow {
  entity: SyncQueueItem['entity'];
  record_id: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  updated_at: number;
  deleted: boolean;
}

let tableInitialized = false;

export function getNeonDirectClient() {
  const url = import.meta.env.VITE_NEON_DATABASE_URL;
  if (
    !url ||
    typeof url !== 'string' ||
    !url.startsWith('postgres') ||
    url.includes('ep-cool-mountain-123456') ||
    url.includes('YOUR_NEON_PASSWORD')
  ) {
    return null;
  }
  try {
    return neon(url);
  } catch {
    return null;
  }
}

async function ensureNeonSyncStoreTable(
  sql: NonNullable<ReturnType<typeof getNeonDirectClient>>
) {
  if (tableInitialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS fitkonic_sync_store (
      entity TEXT NOT NULL,
      record_id TEXT NOT NULL,
      user_id TEXT,
      payload JSONB NOT NULL,
      updated_at BIGINT NOT NULL,
      deleted BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (entity, record_id)
    )
  `;
  tableInitialized = true;
}

export async function checkNeonServerHealth(simulatedOffline = false): Promise<NeonHealthStatus> {
  if (simulatedOffline) {
    return {
      online: false,
      serverReachable: false,
      engine: 'offline-simulated',
      hasRemoteUrl: false,
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      online: false,
      serverReachable: false,
      engine: 'device-offline',
      hasRemoteUrl: false,
    };
  }

  // 1. Direct Neon Serverless HTTP Driver (Production Vercel / Browser)
  const sql = getNeonDirectClient();
  if (sql) {
    try {
      await ensureNeonSyncStoreTable(sql);
      return {
        online: true,
        serverReachable: true,
        engine: 'neon-serverless-direct',
        hasRemoteUrl: true,
      };
    } catch {
      return {
        online: true,
        serverReachable: false,
        engine: 'neon-direct-error',
        hasRemoteUrl: true,
      };
    }
  }

  // 2. Fallback to /api/neon/health (Serverless API or Vite Dev Middleware)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/neon/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return {
        online: true,
        serverReachable: false,
        engine: 'neon-unconfigured',
        hasRemoteUrl: false,
      };
    }
    const data = await res.json();
    return {
      online: true,
      serverReachable: Boolean(data.ok),
      engine: data.engine || 'neon-serverless-postgres',
      hasRemoteUrl: Boolean(data.hasRemoteUrl),
    };
  } catch {
    return {
      online: typeof navigator !== 'undefined' ? navigator.onLine : false,
      serverReachable: false,
      engine: 'network-error',
      hasRemoteUrl: false,
    };
  }
}

export async function syncMutationsToNeon(
  mutations: SyncQueueItem[],
  userId: string
): Promise<{ ok: boolean; processedIds: string[]; error?: string }> {
  if (mutations.length === 0) {
    return { ok: true, processedIds: [] };
  }

  // 1. Direct Neon Serverless PostgreSQL over HTTPS
  const sql = getNeonDirectClient();
  if (sql) {
    await ensureNeonSyncStoreTable(sql);
    const processedIds: string[] = [];
    const now = Date.now();

    for (const m of mutations) {
      const isDelete = m.operation === 'delete';
      const payloadJson = JSON.stringify(m.payload || {});
      await sql`
        INSERT INTO fitkonic_sync_store (entity, record_id, user_id, payload, updated_at, deleted)
        VALUES (${m.entity}, ${m.recordId}, ${userId}, ${payloadJson}::jsonb, ${now}, ${isDelete})
        ON CONFLICT (entity, record_id)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at,
          deleted = EXCLUDED.deleted
      `;
      processedIds.push(m.id);
    }

    return { ok: true, processedIds };
  }

  // 2. Fallback to /api/neon/sync
  const response = await fetch('/api/neon/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mutations }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error(`Neon sync endpoint not configured or returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'Neon sync rejected payload');
  }

  return {
    ok: true,
    processedIds: Array.isArray(data.processedIds)
      ? data.processedIds
      : mutations.map((m) => m.id),
  };
}

export async function pullAllRecordsFromNeon(): Promise<RemoteSyncRow[]> {
  const sql = getNeonDirectClient();
  if (sql) {
    await ensureNeonSyncStoreTable(sql);
    const rows = await sql`
      SELECT entity, record_id, user_id, payload, updated_at, deleted
      FROM fitkonic_sync_store
      ORDER BY updated_at ASC
    `;
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      entity: String(r.entity) as SyncQueueItem['entity'],
      record_id: String(r.record_id),
      user_id: r.user_id ? String(r.user_id) : null,
      payload: (typeof r.payload === 'string'
        ? JSON.parse(r.payload)
        : r.payload) as Record<string, unknown>,
      updated_at: Number(r.updated_at) || Date.now(),
      deleted: Boolean(r.deleted),
    }));
  }

  // Fallback to /api/neon/mirror
  try {
    const res = await fetch('/api/neon/mirror', { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return [];
    const data = await res.json();
    if (!data.ok || !data.store) return [];
    const result: RemoteSyncRow[] = [];
    for (const [entity, items] of Object.entries(data.store as Record<string, unknown[]>)) {
      if (!Array.isArray(items)) continue;
      for (const raw of items) {
        const obj = raw as Record<string, unknown>;
        if (!obj || !obj.id) continue;
        result.push({
          entity: entity as SyncQueueItem['entity'],
          record_id: String(obj.id),
          user_id: obj.user_id ? String(obj.user_id) : null,
          payload: obj,
          updated_at: Number(obj._serverVersion || obj._lastModified || Date.now()),
          deleted: false,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}
