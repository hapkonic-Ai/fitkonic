import { db } from '@/db/dexie';
import { checkNeonServerHealth, syncMutationsToNeon } from '@/lib/neon/client';
import { createId } from '@/lib/utils';
import type { SyncQueueItem, SyncStatus } from '@/types';

type SyncListener = (state: {
  isOnline: boolean;
  isServerReachable: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}) => void;

class FitkonicSyncEngine {
  private listeners = new Set<SyncListener>();
  private simulatedOffline = false;
  private isFlushing = false;
  private currentUserId = 'user-harsh';
  private lastSyncedAt: string | null = new Date().toISOString();
  private lastError: string | null = null;
  private syncStatus: SyncStatus = 'synced';
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isServerReachable = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        void this.flushQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.isServerReachable = false;
        void this.notifyListeners();
      });
    }
  }

  public setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  public setSimulatedOffline(offline: boolean) {
    this.simulatedOffline = offline;
    if (offline) {
      this.isOnline = false;
      this.isServerReachable = false;
      void this.notifyListeners();
    } else {
      this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      void this.flushQueue();
    }
  }

  public isSimulatedOffline(): boolean {
    return this.simulatedOffline;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const pendingCount = await db.sync_queue.count();
    const effectiveStatus: SyncStatus =
      this.syncStatus === 'syncing'
        ? 'syncing'
        : this.lastError
        ? 'failed'
        : pendingCount > 0
        ? 'pending'
        : 'synced';

    for (const listener of this.listeners) {
      listener({
        isOnline: !this.simulatedOffline && this.isOnline,
        isServerReachable: !this.simulatedOffline && this.isServerReachable,
        syncStatus: effectiveStatus,
        pendingCount,
        lastSyncedAt: this.lastSyncedAt,
        lastError: this.lastError,
      });
    }
  }

  private getTableForEntity(entity: SyncQueueItem['entity']) {
    switch (entity) {
      case 'profiles':
        return db.profiles;
      case 'challenges':
        return db.cached_challenges;
      case 'challenge_members':
        return db.challenge_members;
      case 'challenge_invites':
        return db.challenge_invites;
      case 'exercises':
        return db.exercises;
      case 'workouts':
        return db.workouts;
      case 'workout_exercises':
        return db.workout_exercises;
      case 'sets':
        return db.sets;
      case 'diet_logs':
        return db.diet_logs;
      case 'body_metrics':
        return db.body_metrics;
      case 'personal_records':
        return db.personal_records;
    }
  }

  public async enqueueMutation(params: {
    entity: SyncQueueItem['entity'];
    recordId: string;
    operation: 'upsert' | 'delete';
    payload: Record<string, unknown>;
  }): Promise<void> {
    const existing = await db.sync_queue
      .where('recordId')
      .equals(params.recordId)
      .first();

    const item: SyncQueueItem = {
      id: existing?.id || createId('sq'),
      entity: params.entity,
      recordId: params.recordId,
      operation: params.operation,
      payload: params.payload,
      createdAt: Date.now(),
      retryCount: existing?.retryCount || 0,
      status: 'pending',
    };

    await db.sync_queue.put(item);
    await this.notifyListeners();

    if (!this.simulatedOffline && (typeof navigator === 'undefined' || navigator.onLine)) {
      void this.flushQueue();
    }
  }

  public async flushQueue(): Promise<{ synced: number; remaining: number }> {
    if (this.isFlushing) {
      const remaining = await db.sync_queue.count();
      return { synced: 0, remaining };
    }

    const health = await checkNeonServerHealth(this.simulatedOffline);
    this.isOnline = health.online;
    this.isServerReachable = health.serverReachable;

    const queueItems = await db.sync_queue.orderBy('createdAt').toArray();
    if (queueItems.length === 0) {
      this.syncStatus = 'synced';
      this.lastError = null;
      await this.notifyListeners();
      return { synced: 0, remaining: 0 };
    }

    if (!health.online || !health.serverReachable) {
      this.syncStatus = 'pending';
      await this.notifyListeners();
      return { synced: 0, remaining: queueItems.length };
    }

    this.isFlushing = true;
    this.syncStatus = 'syncing';
    this.lastError = null;
    await this.notifyListeners();

    try {
      const result = await syncMutationsToNeon(queueItems, this.currentUserId);
      if (result.ok) {
        for (const item of queueItems) {
          const table = this.getTableForEntity(item.entity);
          if (table && item.operation === 'upsert') {
            await table.update(item.recordId, {
              _syncStatus: 'synced',
              _serverVersion: Date.now(),
            } as never);
          }
          await db.sync_queue.delete(item.id);
        }
        this.syncStatus = 'synced';
        this.lastSyncedAt = new Date().toISOString();
        this.lastError = null;
      }
    } catch (err) {
      this.syncStatus = 'failed';
      this.lastError = err instanceof Error ? err.message : 'Sync failed';
      for (const item of queueItems) {
        await db.sync_queue.update(item.id, {
          status: 'failed',
          retryCount: item.retryCount + 1,
          lastError: this.lastError,
        });
        const table = this.getTableForEntity(item.entity);
        if (table && item.operation === 'upsert') {
          await table.update(item.recordId, {
            _syncStatus: 'failed',
          } as never);
        }
      }
    } finally {
      this.isFlushing = false;
      await this.notifyListeners();
    }

    const remaining = await db.sync_queue.count();
    return { synced: queueItems.length - remaining, remaining };
  }
}

export const syncEngine = new FitkonicSyncEngine();
