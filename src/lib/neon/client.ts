import { neon } from '@neondatabase/serverless';
import type { SyncQueueItem } from '@/types';

export interface NeonHealthStatus {
  online: boolean;
  serverReachable: boolean;
  engine: string;
  hasRemoteUrl: boolean;
}

export function getNeonDirectClient() {
  const url = import.meta.env.VITE_NEON_DATABASE_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('postgres')) {
    return null;
  }
  try {
    return neon(url);
  } catch {
    return null;
  }
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

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/neon/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        online: true,
        serverReachable: false,
        engine: 'neon-unreachable',
        hasRemoteUrl: false,
      };
    }
    const data = await res.json();
    return {
      online: true,
      serverReachable: Boolean(data.ok),
      engine: data.engine || 'neon-serverless-postgres',
      hasRemoteUrl: Boolean(data.hasRemoteUrl || import.meta.env.VITE_NEON_DATABASE_URL),
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

  // 1. Sync via Vite/Serverless Neon Endpoint (/api/neon/sync)
  const response = await fetch('/api/neon/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mutations }),
  });

  if (!response.ok) {
    throw new Error(`Neon sync HTTP ${response.status}`);
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
