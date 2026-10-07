import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Bell,
  Camera,
  Database,
  Edit3,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Sun,
} from 'lucide-react';
import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import { useAppStore } from '@/app/store';
import {
  calculateChallengeProgress,
  calculateStreak,
} from '@/lib/calculations';
import { updateUserProfile } from '@/lib/neon/repository';
import { syncEngine } from '@/lib/sync/syncEngine';
import { cn, fileToDataUrl } from '@/lib/utils';
import { PRBadge } from '@/components/ui/FitkonicComponents';

export function ProfileScreen() {
  const {
    currentUserId,
    activeChallengeId,
    navigate,
    showToast,
  } = useAppStore();

  const uid = currentUserId || 'user-harsh';
  const [activeTab, setActiveTab] = useState<'stats' | 'prs' | 'photos'>('stats');
  const [editOpen, setEditOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [profile, challenge, workouts, workoutExercises, sets, prs, exercises, bodyMetrics] =
      await Promise.all([
        db.profiles.get(uid),
        db.cached_challenges.get(activeChallengeId || 'challenge-winter-arc'),
        db.workouts.where('user_id').equals(uid).toArray(),
        db.workout_exercises.toArray(),
        db.sets.toArray(),
        db.personal_records.where('user_id').equals(uid).toArray(),
        db.exercises.toArray(),
        db.body_metrics.where('user_id').equals(uid).toArray(),
      ]);

    const exMap = new Map(exercises.map((e) => [e.id, e.name]));
    const completedWorkouts = workouts.filter((w) => w.completed);
    const streak = calculateStreak(
      completedWorkouts.map((w) => w.workout_date),
      DEMO_TODAY
    );

    const workoutIds = new Set(completedWorkouts.map((w) => w.id));
    const userWEIds = new Set(
      workoutExercises.filter((we) => workoutIds.has(we.workout_id)).map((we) => we.id)
    );
    const totalVolume = sets
      .filter((s) => userWEIds.has(s.workout_exercise_id) && s.completed)
      .reduce((sum, s) => sum + (s.weight > 0 && s.reps > 0 ? s.weight * s.reps : 0), 0);

    return {
      profile,
      challenge,
      workoutCount: completedWorkouts.length,
      totalVolume,
      streak,
      prs,
      exMap,
      bodyMetrics,
    };
  }, [uid, activeChallengeId]);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [height, setHeight] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('Strength & Muscle');
  const [primarySport, setPrimarySport] = useState('PPL & Full Body');

  if (!data || !data.profile) {
    return <div className="p-6 h-80 rounded-2xl bg-[#0D1117] animate-pulse" />;
  }

  const { profile, challenge, workoutCount, totalVolume, streak, prs, exMap } = data;
  const challengeProgress = challenge
    ? calculateChallengeProgress(challenge.start_date, challenge.end_date, DEMO_TODAY)
    : { percentage: 1, remainingDays: 89 };

  const openEditModal = () => {
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setBio(profile.bio || '');
    setWeight(profile.weight ? String(profile.weight) : '');
    setBodyFat(profile.body_fat_percentage ? String(profile.body_fat_percentage) : '');
    setHeight(profile.height ? String(profile.height) : '');
    setFitnessGoal(profile.fitness_goal || 'Strength & Muscle');
    setPrimarySport(profile.primary_sport || 'PPL & Full Body');
    setEditOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await updateUserProfile(profile.id, { avatar_url: dataUrl });
      showToast({ title: 'Avatar Updated', type: 'success' });
    } catch (err) {
      showToast({
        title: 'Invalid Image',
        subtitle: err instanceof Error ? err.message : 'Upload failed',
        type: 'error',
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile(profile.id, {
      display_name: displayName,
      username,
      bio,
      weight: parseFloat(weight) || profile.weight,
      body_fat_percentage: parseFloat(bodyFat) || profile.body_fat_percentage,
      height: parseFloat(height) || profile.height,
      fitness_goal: fitnessGoal,
      primary_sport: primarySport,
    });
    setEditOpen(false);
    showToast({
      title: 'Profile Updated',
      subtitle: 'Saved locally and queued for Neon DB sync',
      type: 'success',
    });
  };

  return (
    <div data-testid="profile-screen" className="pb-24 lg:pb-12 space-y-5 max-w-2xl mx-auto">
      {/* Header matching Screen 10 of UI Reference */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('home')}
            aria-label="Back to Home"
            className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] flex items-center justify-center text-[#F5F7FA]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-xl text-[#F5F7FA]">My Profile</h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('settings')}
          data-testid="open-settings-button"
          aria-label="Settings"
          className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] flex items-center justify-center text-[#F5F7FA]"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Centered Avatar & Identity (Matches Screen 10) */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-6 text-center space-y-3 shadow-card">
        <div className="relative inline-block">
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-[#5EC8FF]/30 bg-[#121821]"
          />
          <label
            title="Change profile photo"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#5EC8FF] text-[#07090C] flex items-center justify-center cursor-pointer shadow-lg"
          >
            <Camera className="w-4 h-4" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-center gap-2">
            <h2
              data-testid="profile-display-name"
              className="font-display font-extrabold text-2xl text-[#F5F7FA]"
            >
              {profile.display_name}
            </h2>
            <button
              type="button"
              onClick={openEditModal}
              aria-label="Edit Profile"
              className="text-[#8B98A8] hover:text-[#5EC8FF]"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#8B98A8]">
            @{profile.username} • {profile.primary_sport} • {profile.fitness_goal}
          </p>
          {profile.bio && <p className="text-xs text-[#F5F7FA]/80 mt-2 max-w-md mx-auto">{profile.bio}</p>}
        </div>

        {/* Profile Tabs: Stats | PRs | Photos */}
        <div className="flex border-b border-[#202A35] pt-2">
          {(
            [
              { id: 'stats', label: 'Stats' },
              { id: 'prs', label: 'PRs' },
              { id: 'photos', label: 'Progress' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-2.5 text-xs sm:text-sm font-display font-bold border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-[#5EC8FF] text-[#5EC8FF]'
                  : 'border-transparent text-[#8B98A8] hover:text-[#F5F7FA]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && (
          <div className="space-y-4 pt-2 text-left">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#121821] border border-[#202A35]">
                <p className="text-xs text-[#8B98A8]">Weight</p>
                <p className="font-display font-extrabold text-xl text-[#F5F7FA] mt-0.5">
                  {profile.weight ? `${profile.weight} kg` : '—'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#121821] border border-[#202A35]">
                <p className="text-xs text-[#8B98A8]">Body Fat</p>
                <p className="font-display font-extrabold text-xl text-[#F5F7FA] mt-0.5">
                  {profile.body_fat_percentage ? `${profile.body_fat_percentage}%` : '—'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#121821] border border-[#202A35]">
                <p className="text-xs text-[#8B98A8]">Workouts</p>
                <p className="font-display font-extrabold text-xl text-[#F5F7FA] mt-0.5">
                  {workoutCount}
                </p>
              </div>
            </div>

            {/* Total Volume & Streak Card */}
            <div className="p-4 rounded-xl bg-[#121821] border border-[#202A35] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#8B98A8]">Total Volume</p>
                <p className="font-display font-extrabold text-2xl text-[#F5F7FA] mt-0.5">
                  {totalVolume.toLocaleString()} kg
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#8B98A8]">Training Streak</p>
                <p className="font-display font-bold text-lg text-[#5EC8FF] mt-0.5">
                  {streak} {streak === 1 ? 'Day' : 'Days'}
                </p>
              </div>
            </div>

            {/* Current Challenge Progress Bar */}
            {challenge && (
              <div
                onClick={() => navigate('challenge-detail', { challengeId: challenge.id })}
                className="p-4 rounded-xl bg-[#121821] border border-[#202A35] hover:border-[#5EC8FF] cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#8B98A8] block">Current Challenge</span>
                    <strong className="font-display text-sm text-[#F5F7FA]">
                      {challenge.name}
                    </strong>
                  </div>
                  <span className="font-display font-bold text-sm text-[#F5F7FA]">
                    {challengeProgress.percentage}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#0D1117] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5EC8FF]"
                    style={{ width: `${challengeProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={openEditModal}
              data-testid="edit-profile-button"
              className="w-full py-3 rounded-xl bg-[#121821] border border-[#202A35] hover:border-[#5EC8FF] font-display font-bold text-xs uppercase tracking-wider text-[#F5F7FA] transition-colors"
            >
              Edit Profile
            </button>
          </div>
        )}

        {activeTab === 'prs' && (
          <div className="space-y-3 pt-2 text-left">
            {prs.length === 0 ? (
              <p className="text-xs text-[#8B98A8] text-center py-4">
                No PRs recorded yet — log your Day 1 workout to establish your starting PRs!
              </p>
            ) : (
              prs.map((pr) => (
                <PRBadge
                  key={pr.id}
                  exerciseName={exMap.get(pr.exercise_id) || 'Barbell Bench Press'}
                  weight={pr.weight}
                  reps={pr.reps}
                  estimated1RM={pr.estimated_1rm}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="pt-2 text-left space-y-3">
            <div className="p-4 rounded-xl bg-[#121821] border border-[#202A35] flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-sm text-[#F5F7FA]">
                  Body Transformation Metrics
                </p>
                <p className="text-xs text-[#8B98A8]">
                  Height: {profile.height ? `${profile.height} cm` : '—'} • Current Weight:{' '}
                  {profile.weight ? `${profile.weight} kg` : 'Not logged yet'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('progress')}
                className="px-3 py-1.5 rounded-lg bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs"
              >
                View Charts
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <form
            onSubmit={handleSaveProfile}
            className="bg-[#0D1117] border border-[#202A35] rounded-2xl max-w-md w-full p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#F5F7FA]">Edit Athlete Profile</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-xs text-[#8B98A8]"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#8B98A8] mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                data-testid="edit-profile-name-input"
                className="w-full px-3.5 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8B98A8] mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B98A8] mb-1">Primary Sport</label>
                <input
                  type="text"
                  value={primarySport}
                  onChange={(e) => setPrimarySport(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs text-[#8B98A8] mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B98A8] mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B98A8] mb-1">Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8B98A8] mb-1">Bio</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              />
            </div>

            <button
              type="submit"
              data-testid="save-profile-submit-button"
              className="w-full py-3 rounded-xl bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs uppercase tracking-wider"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * SETTINGS SCREEN (Section 33)
 */
export function SettingsScreen() {
  const {
    currentUserId,
    appearance,
    setAppearance,
    notificationsEnabled,
    setNotificationsEnabled,
    simulatedOffline,
    setSimulatedOffline,
    pendingSyncCount,
    syncStatus,
    setCurrentUser,
    navigate,
    showToast,
  } = useAppStore();

  const uid = currentUserId || 'user-harsh';
  const profile = useLiveQuery(() => db.profiles.get(uid), [uid]);

  const handleToggleOffline = () => {
    const next = !simulatedOffline;
    setSimulatedOffline(next);
    syncEngine.setSimulatedOffline(next);
  };

  const handleForceSync = async () => {
    const res = await syncEngine.flushQueue();
    showToast({
      title: 'Neon DB Sync Complete',
      subtitle: `${res.synced} queued operations synchronized`,
      type: 'success',
    });
  };

  const handleTestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification('FITKONIC — Winter Arc Reminder', {
          body: 'Push Day is scheduled today. Keep your 12-day streak alive.',
        });
      }
    }
    showToast({
      title: 'Workout Reminder Triggered',
      subtitle: 'Push Day is scheduled today. Keep your 12-day streak alive.',
      type: 'info',
    });
  };

  return (
    <div data-testid="settings-screen" className="pb-24 lg:pb-12 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('profile')}
          aria-label="Back to Profile"
          className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] flex items-center justify-center text-[#F5F7FA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-[#F5F7FA]">Settings</h1>
          <p className="text-xs text-[#8B98A8]">
            Account, Privacy, Appearance, PWA & Offline Neon Synchronization
          </p>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-3">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#F5F7FA] flex items-center gap-2">
          <Moon className="w-4 h-4 text-[#5EC8FF]" />
          <span>Appearance (Default: Dark Cinematic)</span>
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAppearance(mode)}
              className={cn(
                'py-2.5 rounded-xl text-xs font-display font-bold uppercase border flex items-center justify-center gap-1.5',
                appearance === mode
                  ? 'bg-[#5EC8FF] text-[#07090C] border-[#5EC8FF]'
                  : 'bg-[#121821] text-[#8B98A8] border-[#202A35]'
              )}
            >
              {mode === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Offline Data & Neon DB Sync Engine */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#F5F7FA] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5EC8FF]" />
            <span>Offline Data & Neon PostgreSQL Sync</span>
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-[#121821] text-xs font-semibold text-[#5EC8FF]">
            {syncStatus.toUpperCase()} ({pendingSyncCount} queued)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleOffline}
            className="px-4 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] hover:border-[#FBBF24] text-xs font-display font-bold uppercase text-[#F5F7FA]"
          >
            {simulatedOffline ? 'Disable Simulated Offline' : 'Simulate Gym Offline Mode'}
          </button>

          <button
            type="button"
            onClick={handleForceSync}
            className="px-4 py-2.5 rounded-xl bg-[#5EC8FF] text-[#07090C] text-xs font-display font-bold uppercase flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Privacy & Notifications */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#F5F7FA] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#5EC8FF]" />
          <span>Privacy & Notifications</span>
        </h3>

        <div className="flex items-center justify-between py-2 border-b border-[#202A35]">
          <div>
            <p className="text-sm font-semibold text-[#F5F7FA]">Profile Visibility</p>
            <p className="text-xs text-[#8B98A8]">Who can view your training stats</p>
          </div>
          <select
            value={profile?.profile_visibility || 'PUBLIC'}
            onChange={(e) =>
              profile &&
              updateUserProfile(profile.id, {
                profile_visibility: e.target.value as 'PUBLIC' | 'CHALLENGE_ONLY' | 'PRIVATE',
              })
            }
            className="bg-[#121821] border border-[#202A35] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA]"
          >
            <option value="PUBLIC">Public</option>
            <option value="CHALLENGE_ONLY">Challenge Members Only</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-[#F5F7FA]">Training & Streak Reminders</p>
            <p className="text-xs text-[#8B98A8]">Browser notifications for workouts and PRs</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestNotification}
              className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] text-xs text-[#5EC8FF]"
            >
              <Bell className="w-3.5 h-3.5 inline mr-1" />
              Test Alert
            </button>
            <button
              type="button"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold',
                notificationsEnabled
                  ? 'bg-[#4ADE80]/20 text-[#4ADE80]'
                  : 'bg-[#121821] text-[#8B98A8]'
              )}
            >
              {notificationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* PWA Status */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#5EC8FF]/15 text-[#5EC8FF] flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-[#F5F7FA]">
              Fitkonic Progressive Web App
            </p>
            <p className="text-xs text-[#8B98A8]">
              Standalone manifest & Workbox service worker active
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#4ADE80]/15 text-[#4ADE80] text-xs font-bold">
          READY
        </span>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={() => {
          setCurrentUser(null);
          navigate('login');
        }}
        data-testid="logout-button"
        className="w-full py-3.5 rounded-2xl bg-[#121821] border border-[#FF5C5C]/40 hover:bg-[#FF5C5C] hover:text-white text-[#FF5C5C] font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out</span>
      </button>
    </div>
  );
}
