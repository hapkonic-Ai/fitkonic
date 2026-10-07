import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DetectedPR } from '@/lib/calculations';
import type { SyncStatus } from '@/types';

export type AppRoute =
  | 'login'
  | 'home'
  | 'challenges'
  | 'challenge-detail'
  | 'challenge-create'
  | 'challenge-members'
  | 'challenge-settings'
  | 'log-workout'
  | 'log-diet'
  | 'progress'
  | 'calendar'
  | 'profile'
  | 'settings';

export interface ActiveDraftSet {
  id: string;
  set_number: number;
  weight: number;
  weight_unit: 'kg' | 'lb';
  reps: number;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
}

export interface ActiveDraftExercise {
  id: string;
  exercise_id: string;
  notes: string;
  sets: ActiveDraftSet[];
}

export interface ActiveWorkoutDraft {
  id: string;
  name: string;
  workout_date: string;
  challenge_id: string | null;
  startedAt: number;
  notes: string;
  exercises: ActiveDraftExercise[];
}

export interface CompletedWorkoutSummary {
  workoutId: string;
  name: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  prsAchieved: DetectedPR[];
  streakDays: number;
}

interface FitkonicStoreState {
  currentUserId: string | null;
  activeChallengeId: string;
  currentRoute: AppRoute;
  selectedDate: string;
  appearance: 'dark' | 'light' | 'system';
  notificationsEnabled: boolean;
  isOnline: boolean;
  isServerReachable: boolean;
  simulatedOffline: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  activeWorkout: ActiveWorkoutDraft | null;
  lastCompletedSummary: CompletedWorkoutSummary | null;
  recentToast: { id: string; title: string; subtitle?: string; type: 'info' | 'success' | 'pr' | 'error' } | null;

  // Actions
  setCurrentUser: (userId: string | null) => void;
  setActiveChallengeId: (challengeId: string) => void;
  navigate: (route: AppRoute, params?: { challengeId?: string; date?: string }) => void;
  setSelectedDate: (date: string) => void;
  setAppearance: (mode: 'dark' | 'light' | 'system') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSyncState: (state: {
    isOnline: boolean;
    isServerReachable: boolean;
    syncStatus: SyncStatus;
    pendingCount: number;
    lastSyncedAt: string | null;
    lastError: string | null;
  }) => void;
  setSimulatedOffline: (offline: boolean) => void;
  setActiveWorkout: (draft: ActiveWorkoutDraft | null) => void;
  setLastCompletedSummary: (summary: CompletedWorkoutSummary | null) => void;
  showToast: (toast: { title: string; subtitle?: string; type?: 'info' | 'success' | 'pr' | 'error' }) => void;
  clearToast: () => void;
}

export const useAppStore = create<FitkonicStoreState>()(
  persist(
    (set) => ({
      currentUserId: 'user-harsh',
      activeChallengeId: 'challenge-winter-arc',
      currentRoute: 'home',
      selectedDate: new Date().toISOString().slice(0, 10),
      appearance: 'dark',
      notificationsEnabled: true,
      isOnline: true,
      isServerReachable: true,
      simulatedOffline: false,
      syncStatus: 'synced',
      pendingSyncCount: 0,
      lastSyncedAt: new Date().toISOString(),
      lastSyncError: null,
      activeWorkout: null,
      lastCompletedSummary: null,
      recentToast: null,

      setCurrentUser: (userId) =>
        set((state) => ({
          currentUserId: userId,
          currentRoute: userId ? (state.currentRoute === 'login' ? 'home' : state.currentRoute) : 'login',
        })),

      setActiveChallengeId: (challengeId) => set({ activeChallengeId: challengeId }),

      navigate: (route, params) =>
        set((state) => ({
          currentRoute: route,
          activeChallengeId: params?.challengeId ?? state.activeChallengeId,
          selectedDate: params?.date ?? state.selectedDate,
        })),

      setSelectedDate: (date) => set({ selectedDate: date }),

      setAppearance: (mode) => {
        if (typeof document !== 'undefined') {
          const isLight = mode === 'light';
          document.documentElement.classList.toggle('dark', !isLight);
          document.documentElement.classList.toggle('light', isLight);
        }
        set({ appearance: mode });
      },

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setSyncState: (s) =>
        set({
          isOnline: s.isOnline,
          isServerReachable: s.isServerReachable,
          syncStatus: s.syncStatus,
          pendingSyncCount: s.pendingCount,
          lastSyncedAt: s.lastSyncedAt,
          lastSyncError: s.lastError,
        }),

      setSimulatedOffline: (offline) => set({ simulatedOffline: offline }),

      setActiveWorkout: (draft) => set({ activeWorkout: draft }),

      setLastCompletedSummary: (summary) => set({ lastCompletedSummary: summary }),

      showToast: ({ title, subtitle, type = 'info' }) =>
        set({
          recentToast: {
            id: `${Date.now()}`,
            title,
            subtitle,
            type,
          },
        }),

      clearToast: () => set({ recentToast: null }),
    }),
    {
      name: 'fitkonic_app_store_v5_clean',
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        activeChallengeId: state.activeChallengeId,
        selectedDate: state.selectedDate,
        appearance: state.appearance,
        notificationsEnabled: state.notificationsEnabled,
        activeWorkout: state.activeWorkout,
      }),
    }
  )
);
