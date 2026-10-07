import { db } from '@/db/dexie';
import {
  checkNeonServerHealth,
  pullAllRecordsFromNeon,
  syncMutationsToNeon,
} from '@/lib/neon/client';
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
  private isPulling = false;
  private hasBackfilled = false;
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
        void this.syncAll();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.isServerReachable = false;
        void this.notifyListeners();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void this.syncAll();
        }
      });
      // Poll Neon DB every 15 seconds so squad members see each other's updates automatically
      window.setInterval(() => {
        if (!this.simulatedOffline && navigator.onLine) {
          void this.syncAll();
        }
      }, 15000);
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
      void this.syncAll();
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

  /**
   * Ensure any locally logged workouts, sets, diet logs, or body metrics that were logged
   * before Neon sync connected are queued and pushed to Neon.
   */
  private async backfillLocalRecordsIfNeeded(): Promise<void> {
    if (this.hasBackfilled) return;
    this.hasBackfilled = true;

    const existingQueueIds = new Set(
      (await db.sync_queue.toArray()).map((q) => q.recordId)
    );

    const tablesToBackfill: Array<{
      entity: SyncQueueItem['entity'];
      rows: Array<{ id: string }>;
    }> = [
      { entity: 'workouts', rows: await db.workouts.toArray() },
      { entity: 'workout_exercises', rows: await db.workout_exercises.toArray() },
      { entity: 'sets', rows: await db.sets.toArray() },
      { entity: 'diet_logs', rows: await db.diet_logs.toArray() },
      { entity: 'body_metrics', rows: await db.body_metrics.toArray() },
      { entity: 'personal_records', rows: await db.personal_records.toArray() },
    ];

    const itemsToAdd: SyncQueueItem[] = [];
    for (const { entity, rows } of tablesToBackfill) {
      for (const row of rows) {
        if (!existingQueueIds.has(row.id)) {
          itemsToAdd.push({
            id: createId('sq'),
            entity,
            recordId: row.id,
            operation: 'upsert',
            payload: row as unknown as Record<string, unknown>,
            createdAt: Date.now(),
            retryCount: 0,
            status: 'pending',
          });
        }
      }
    }

    if (itemsToAdd.length > 0) {
      await db.sync_queue.bulkPut(itemsToAdd);
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
      void this.syncAll();
    }
  }

  /**
   * Pull all squad records from Neon PostgreSQL and merge them into Dexie IndexedDB
   */
  public async pullFromNeon(): Promise<number> {
    if (this.isPulling || this.simulatedOffline) return 0;
    this.isPulling = true;
    try {
      const remoteRows = await pullAllRecordsFromNeon();
      if (remoteRows.length === 0) return 0;

      const pendingRecordIds = new Set(
        (await db.sync_queue.toArray()).map((q) => q.recordId)
      );

      let applied = 0;
      for (const row of remoteRows) {
        // Don't overwrite a record that currently has an unsynced local edit in the outbox
        if (pendingRecordIds.has(row.record_id)) continue;

        const table = this.getTableForEntity(row.entity);
        if (!table) continue;

        if (row.deleted) {
          await table.delete(row.record_id);
          applied += 1;
        } else if (row.payload && typeof row.payload === 'object') {
          await table.put({
            ...row.payload,
            id: row.record_id,
            _syncStatus: 'synced',
            _serverVersion: row.updated_at,
          } as never);
          applied += 1;
        }
      }
      return applied;
    } catch {
      return 0;
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Full 2-way synchronization:
   * 1. Backfill any existing local records into outbox
   * 2. Push outbox queue to Neon PostgreSQL
   * 3. Pull squad updates from Neon PostgreSQL into local IndexedDB
   */
  public async syncAll(): Promise<{ synced: number; remaining: number }> {
    await this.backfillLocalRecordsIfNeeded();
    const res = await this.flushQueue();
    await this.pullFromNeon();
    return res;
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
