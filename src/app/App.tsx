import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  ClipboardList,
  Dumbbell,
  Home,
  Settings,
  Trophy,
  User,
  Utensils,
  X,
} from 'lucide-react';
import { ensureSeedData } from '@/db/seed';
import { useAppStore, type AppRoute } from '@/app/store';
import { syncEngine } from '@/lib/sync/syncEngine';
import { FitkonicLogo } from '@/components/ui/FitkonicComponents';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { HomeDashboard } from '@/features/dashboard/HomeDashboard';
import { WorkoutLoggerScreen } from '@/features/workouts/WorkoutLoggerScreen';
import { DietTrackerScreen } from '@/features/diet/DietTrackerScreen';
import {
  ChallengeDetailScreen,
  ChallengeMembersScreen,
  ChallengeSettingsScreen,
  ChallengesDirectoryScreen,
  CreateChallengeScreen,
} from '@/features/challenges/ChallengeSystemScreens';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { ProfileScreen, SettingsScreen } from '@/features/profile/ProfileAndSettingsScreen';
import { cn } from '@/lib/utils';

export function App() {
  const {
    currentUserId,
    currentRoute,
    navigate,
    setSyncState,
    recentToast,
    clearToast,
  } = useAppStore();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureSeedData()
      .then(() => {
        if (mounted) setReady(true);
        void syncEngine.syncAll();
      })
      .catch(() => {
        if (mounted) setReady(true);
      });

    const unsubscribe = syncEngine.subscribe((s) => {
      setSyncState(s);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setSyncState]);

  useEffect(() => {
    if (!recentToast) return;
    const t = setTimeout(() => clearToast(), 3800);
    return () => clearTimeout(t);
  }, [recentToast, clearToast]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#07090C] text-[#F5F7FA] flex flex-col items-center justify-center p-6">
        <FitkonicLogo size="lg" />
        <p className="mt-3 text-xs font-display tracking-widest uppercase text-[#8B98A8]">
          Loading Fitkonic...
        </p>
      </div>
    );
  }

  if (!currentUserId || currentRoute === 'login') {
    return <LoginScreen />;
  }

  const desktopNavItems: Array<{ id: AppRoute; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'log-workout', label: 'Workouts', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'log-diet', label: 'Diet', icon: <Utensils className="w-4 h-4" /> },
    { id: 'challenges', label: 'Challenges', icon: <Trophy className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const mobileNavItems: Array<{ id: AppRoute; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'challenges', label: 'Challenges', icon: <Trophy className="w-5 h-5" /> },
    { id: 'log-workout', label: 'Log', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  const isRouteActive = (navId: AppRoute) => {
    if (navId === 'challenges') {
      return [
        'challenges',
        'challenge-detail',
        'challenge-create',
        'challenge-members',
        'challenge-settings',
      ].includes(currentRoute);
    }
    if (navId === 'log-workout') {
      return currentRoute === 'log-workout';
    }
    return currentRoute === navId;
  };

  return (
    <div className="relative min-h-screen bg-transparent text-[#F5F7FA] flex flex-col overflow-x-hidden">
      {/* Ambient Glassmorphic Light Orbs for Phone & Desktop Depth */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-[#5EC8FF]/15 blur-[90px]" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#38BDF8]/10 blur-[100px]" />
        <div className="absolute bottom-16 left-1/4 w-72 h-72 rounded-full bg-[#4ADE80]/8 blur-[95px]" />
      </div>

      <div className="relative z-10 flex-1 flex">
        {/* Desktop Sidebar Navigation (Section 34 & 36 — NO Group Chat) */}
        <aside
          aria-label="Desktop Navigation"
          className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-white/10 bg-[#0D1117]/70 backdrop-blur-2xl p-5 justify-between"
        >
          <div className="space-y-6">
            <div className="px-2">
              <FitkonicLogo size="md" />
              <p className="mt-1 text-xs font-display uppercase tracking-widest text-[#8B98A8]">
                Discipline Today.
              </p>
            </div>

            <nav className="space-y-1.5">
              {desktopNavItems.map((item) => {
                const active = isRouteActive(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    data-testid={`desktop-nav-${item.id}`}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-sm font-display font-bold flex items-center gap-3 transition-all',
                      active
                        ? 'bg-[#5EC8FF] text-[#07090C] shadow-glow-cyan'
                        : 'text-[#8B98A8] hover:text-[#F5F7FA] hover:bg-white/5'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => navigate('settings')}
              data-testid="desktop-nav-settings"
              className={cn(
                'w-full px-3.5 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center gap-3 transition-colors',
                currentRoute === 'settings'
                  ? 'bg-white/10 text-[#5EC8FF]'
                  : 'text-[#8B98A8] hover:text-[#F5F7FA]'
              )}
            >
              <Settings className="w-4 h-4" />
              <span>Settings & PWA</span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 px-3.5 py-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          {currentRoute === 'home' && <HomeDashboard />}
          {currentRoute === 'log-workout' && <WorkoutLoggerScreen />}
          {currentRoute === 'log-diet' && <DietTrackerScreen />}
          {currentRoute === 'challenges' && <ChallengesDirectoryScreen />}
          {currentRoute === 'challenge-detail' && <ChallengeDetailScreen />}
          {currentRoute === 'challenge-create' && <CreateChallengeScreen />}
          {currentRoute === 'challenge-members' && <ChallengeMembersScreen />}
          {currentRoute === 'challenge-settings' && <ChallengeSettingsScreen />}
          {currentRoute === 'progress' && <ProgressScreen />}
          {currentRoute === 'calendar' && <CalendarScreen />}
          {currentRoute === 'profile' && <ProfileScreen />}
          {currentRoute === 'settings' && <SettingsScreen />}
        </main>
      </div>

      {/* Floating Glassmorphic Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 fk-glass-dock rounded-3xl px-2 py-2 flex items-center justify-around"
      >
        {mobileNavItems.map((item) => {
          const active = isRouteActive(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              data-testid={`mobile-nav-${item.id}`}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all min-w-[60px]',
                active
                  ? 'bg-[#5EC8FF]/20 text-[#5EC8FF] border border-[#5EC8FF]/40 shadow-[0_0_20px_rgba(94,200,255,0.25)]'
                  : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
              )}
            >
              {item.icon}
              <span className="mt-1 text-[11px] font-display font-semibold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Toast Notification */}
      {recentToast && (
        <div
          role="status"
          data-testid="app-toast"
          className={cn(
            'fixed top-12 right-4 z-50 max-w-sm rounded-2xl border p-3.5 shadow-card flex items-start justify-between gap-3 transition-all',
            recentToast.type === 'pr'
              ? 'bg-[#0D1117] border-[#5EC8FF] text-[#F5F7FA] shadow-glow-cyan'
              : recentToast.type === 'error'
              ? 'bg-[#0D1117] border-[#FF5C5C] text-[#FF5C5C]'
              : 'bg-[#0D1117] border-[#202A35] text-[#F5F7FA]'
          )}
        >
          <div>
            <p className="font-display font-bold text-xs uppercase tracking-wider text-[#5EC8FF]">
              {recentToast.title}
            </p>
            {recentToast.subtitle && (
              <p className="text-xs text-[#8B98A8] mt-0.5">{recentToast.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Dismiss notification"
            className="text-[#8B98A8] hover:text-[#F5F7FA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
