import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  CheckCircle2,
  Dumbbell,
  Plus,
  Trash2,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import {
  useAppStore,
  type ActiveDraftExercise,
  type ActiveWorkoutDraft,
} from '@/app/store';
import {
  createCustomExercise,
  saveCompletedWorkout,
} from '@/lib/neon/repository';
import { createId } from '@/lib/utils';

export function WorkoutLoggerScreen() {
  const {
    currentUserId,
    activeChallengeId,
    activeWorkout,
    setActiveWorkout,
    lastCompletedSummary,
    setLastCompletedSummary,
    setCurrentUser,
    showToast,
    navigate,
  } = useAppStore();

  const [customExerciseName, setCustomExerciseName] = useState('');
  const [saving, setSaving] = useState(false);

  const uid = currentUserId || 'user-harsh';

  const data = useLiveQuery(async () => {
    const [profiles, exercises, workouts, workoutExercises, sets] = await Promise.all([
      db.profiles.toArray(),
      db.exercises.toArray(),
      db.workouts.where('user_id').equals(uid).toArray(),
      db.workout_exercises.toArray(),
      db.sets.toArray(),
    ]);

    const sortedWorkouts = workouts.sort((a, b) =>
      b.workout_date.localeCompare(a.workout_date)
    );

    const userWorkoutIds = new Set(workouts.map((w) => w.id));
    const userWEs = workoutExercises.filter((we) => userWorkoutIds.has(we.workout_id));
    const userWEIds = new Set(userWEs.map((we) => we.id));
    const userSets = sets.filter((s) => userWEIds.has(s.workout_exercise_id) && s.completed);

    // Map exercise_id -> best weight & last weight lifted by this user
    const bestLiftByExercise = new Map<string, { weight: number; reps: number }>();
    for (const we of userWEs) {
      const weSets = userSets.filter((s) => s.workout_exercise_id === we.id);
      for (const s of weSets) {
        const prev = bestLiftByExercise.get(we.exercise_id);
        if (!prev || s.weight > prev.weight) {
          bestLiftByExercise.set(we.exercise_id, { weight: s.weight, reps: s.reps });
        }
      }
    }

    const squadOrder = ['user-harsh', 'user-pranav', 'user-kavi'];
    const orderedProfiles = [...profiles].sort((a, b) => {
      const ia = squadOrder.indexOf(a.id);
      const ib = squadOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.display_name.localeCompare(b.display_name);
    });

    return {
      profiles: orderedProfiles,
      currentUser: profiles.find((p) => p.id === uid),
      exercises,
      sortedWorkouts,
      userWEs,
      userSets,
      bestLiftByExercise,
    };
  }, [uid]);

  // Automatically initialize an active draft if none exists so user can immediately log what they did today without templates
  useEffect(() => {
    if (!activeWorkout && data?.exercises && data.exercises.length > 0) {
      const bench = data.exercises.find((e) => e.id === 'ex-bench-press') || data.exercises[0];
      const prevBest = data.bestLiftByExercise.get(bench.id);
      const initialDraft: ActiveWorkoutDraft = {
        id: createId('w'),
        name: "Today's Workout",
        workout_date: DEMO_TODAY,
        challenge_id: activeChallengeId || 'challenge-winter-arc',
        startedAt: Date.now(),
        notes: '',
        exercises: [
          {
            id: createId('we'),
            exercise_id: bench.id,
            notes: '',
            sets: [
              {
                id: createId('set'),
                set_number: 1,
                weight: prevBest ? prevBest.weight : 60,
                weight_unit: 'kg',
                reps: prevBest ? prevBest.reps : 8,
                rpe: 8,
                rir: 2,
                completed: true,
              },
            ],
          },
        ],
      };
      setActiveWorkout(initialDraft);
    }
  }, [activeWorkout, data?.exercises, data?.bestLiftByExercise, activeChallengeId, setActiveWorkout]);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.exercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [data?.exercises]);

  if (!data) {
    return (
      <div className="p-6 text-sm text-[#8B98A8]">Loading workout logger...</div>
    );
  }

  const ensureDraft = (): ActiveWorkoutDraft => {
    if (activeWorkout) return activeWorkout;
    return {
      id: createId('w'),
      name: "Today's Workout",
      workout_date: DEMO_TODAY,
      challenge_id: activeChallengeId || 'challenge-winter-arc',
      startedAt: Date.now(),
      notes: '',
      exercises: [],
    };
  };

  const handleAddExerciseToToday = (exerciseId: string) => {
    const draft = ensureDraft();
    const prevBest = data.bestLiftByExercise.get(exerciseId);
    const defaultWeight = prevBest ? prevBest.weight : 40;
    const defaultReps = prevBest ? prevBest.reps : 8;

    const newEx: ActiveDraftExercise = {
      id: createId('we'),
      exercise_id: exerciseId,
      notes: '',
      sets: [
        {
          id: createId('set'),
          set_number: 1,
          weight: defaultWeight,
          weight_unit: 'kg',
          reps: defaultReps,
          rpe: 8,
          rir: 2,
          completed: true,
        },
      ],
    };

    setActiveWorkout({
      ...draft,
      exercises: [...draft.exercises, newEx],
    });
  };

  const handleAddCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customExerciseName.trim();
    if (!trimmed) return;

    // Check if an exercise with this name already exists
    const existing = data.exercises.find(
      (ex) => ex.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleAddExerciseToToday(existing.id);
      setCustomExerciseName('');
      return;
    }

    const created = await createCustomExercise({
      userId: uid,
      name: trimmed,
      category: 'Full Body',
      muscle_group: 'Full Body',
      equipment: 'Barbell',
    });
    handleAddExerciseToToday(created.id);
    setCustomExerciseName('');
    showToast({
      title: `Added "${created.name}"`,
      subtitle: 'Enter your weight (kg) and reps below',
      type: 'info',
    });
  };

  const handleUpdateSet = (
    exId: string,
    setId: string,
    field: 'weight' | 'reps',
    rawValue: string
  ) => {
    if (!activeWorkout) return;
    const numValue = rawValue === '' ? 0 : Number(rawValue);
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  [field]: Number.isFinite(numValue) ? numValue : 0,
                  completed: true,
                }
              : s
          ),
        };
      }),
    });
  };

  const handleAddSet = (exId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: createId('set'),
              set_number: ex.sets.length + 1,
              weight: lastSet ? lastSet.weight : 40,
              weight_unit: 'kg',
              reps: lastSet ? lastSet.reps : 8,
              rpe: 8,
              rir: 2,
              completed: true,
            },
          ],
        };
      }),
    });
  };

  const handleRemoveSet = (exId: string, setId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises
        .map((ex) => {
          if (ex.id !== exId) return ex;
          const remaining = ex.sets
            .filter((s) => s.id !== setId)
            .map((s, idx) => ({ ...s, set_number: idx + 1 }));
          return { ...ex, sets: remaining };
        })
        .filter((ex) => ex.sets.length > 0),
    });
  };

  const handleRemoveExercise = (exId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.filter((ex) => ex.id !== exId),
    });
  };

  const handleSaveWorkout = async () => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      showToast({
        title: 'Add at least one exercise',
        subtitle: 'Tap any exercise chip above or type what you did today',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      // Mark all entered sets as completed so user doesn't have to manually check every set box
      const readyDraft: ActiveWorkoutDraft = {
        ...activeWorkout,
        name: activeWorkout.name.trim() || "Today's Workout",
        exercises: activeWorkout.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({
            ...s,
            completed: true,
          })),
        })),
      };

      const summary = await saveCompletedWorkout({
        userId: uid,
        draft: readyDraft,
      });

      setLastCompletedSummary(summary);
      // Reset to a fresh empty draft ready for additional logging if needed
      setActiveWorkout({
        id: createId('w'),
        name: "Today's Workout",
        workout_date: DEMO_TODAY,
        challenge_id: activeChallengeId || 'challenge-winter-arc',
        startedAt: Date.now(),
        notes: '',
        exercises: [],
      });

      showToast({
        title: 'Workout Saved!',
        subtitle: `${summary.totalSets} sets logged • Strength progress updated`,
        type: summary.prsAchieved.length > 0 ? 'pr' : 'success',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="workout-logger-screen" className="max-w-4xl mx-auto px-4 pt-4 pb-28 space-y-6">
      {/* Header + 3-Login Switcher (Harsh, Pranav, Kavi) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1117] border border-[#202A35] rounded-2xl p-4">
        <div>
          <span className="text-[11px] font-display uppercase tracking-widest text-[#5EC8FF] block">
            SIMPLE WORKOUT LOG
          </span>
          <h1 className="text-xl font-display font-bold text-[#F5F7FA]">
            What Did You Do Today?
          </h1>
          <p className="text-xs text-[#8B98A8]">
            No templates needed — tap an exercise, enter your lifting weight (kg) & reps, and save.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {data.profiles.map((member) => {
            const active = member.id === uid;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setCurrentUser(member.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all ${
                  active
                    ? 'bg-[#5EC8FF] text-[#07090C]'
                    : 'bg-[#121821] text-[#8B98A8] border border-[#202A35] hover:text-[#F5F7FA]'
                }`}
              >
                {member.display_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Banner when a workout was just saved */}
      {lastCompletedSummary && (
        <div
          data-testid="workout-saved-banner"
          className="rounded-2xl border border-[#4ADE80]/40 bg-[#4ADE80]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#4ADE80] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-display font-bold text-[#F5F7FA]">
                Saved: {lastCompletedSummary.name} ({lastCompletedSummary.totalSets} sets)
              </h2>
              <p className="text-xs text-[#8B98A8] mt-0.5">
                Total Volume: {lastCompletedSummary.totalVolume.toLocaleString()} kg
                {lastCompletedSummary.prsAchieved.length > 0 &&
                  ` • ${lastCompletedSummary.prsAchieved.length} New Lifting PR!`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('progress')}
              className="px-3 py-1.5 rounded-xl bg-[#5EC8FF] text-[#07090C] text-xs font-display font-bold flex items-center gap-1"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              See Strength Progress
            </button>
            <button
              type="button"
              onClick={() => setLastCompletedSummary(null)}
              className="px-2.5 py-1.5 rounded-xl bg-[#121821] text-xs text-[#8B98A8] hover:text-[#F5F7FA]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Simple Logger Card */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-5">
        {/* Session Title */}
        <div>
          <label className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8] block mb-1.5">
            Today&apos;s Session Name (Optional)
          </label>
          <input
            type="text"
            aria-label="Workout session name"
            value={activeWorkout?.name ?? "Today's Workout"}
            onChange={(e) => {
              const draft = ensureDraft();
              setActiveWorkout({ ...draft, name: e.target.value });
            }}
            placeholder="e.g., Chest & Triceps, Leg Day, Push Day..."
            className="w-full h-11 rounded-xl bg-[#121821] border border-[#202A35] px-3.5 text-sm font-display font-semibold text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
          />
        </div>

        {/* 1-Tap Quick Add Exercise Chips */}
        <div>
          <label className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8] block mb-2">
            1. Tap Exercises You Did Today
          </label>
          <div className="flex flex-wrap gap-2">
            {data.exercises.map((ex) => {
              const isAdded = activeWorkout?.exercises.some(
                (item) => item.exercise_id === ex.id
              );
              return (
                <button
                  key={ex.id}
                  type="button"
                  data-testid={`quick-add-${ex.id}`}
                  onClick={() => handleAddExerciseToToday(ex.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-display font-semibold border transition-all flex items-center gap-1.5 ${
                    isAdded
                      ? 'bg-[#5EC8FF]/15 border-[#5EC8FF]/50 text-[#7DD3FC]'
                      : 'bg-[#121821] border-[#202A35] text-[#F5F7FA] hover:border-[#5EC8FF]/40'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-[#5EC8FF]" />
                  {ex.name}
                </button>
              );
            })}
          </div>

          {/* Type Any Custom Exercise */}
          <form onSubmit={handleAddCustomExercise} className="mt-3 flex gap-2">
            <input
              type="text"
              value={customExerciseName}
              onChange={(e) => setCustomExerciseName(e.target.value)}
              placeholder="Or type any other exercise you did today..."
              className="flex-1 h-10 rounded-xl bg-[#121821] border border-[#202A35] px-3.5 text-xs text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
            />
            <button
              type="submit"
              className="px-4 h-10 rounded-xl bg-[#121821] border border-[#202A35] hover:border-[#5EC8FF] text-xs font-display font-semibold text-[#5EC8FF] shrink-0"
            >
              + Add Custom
            </button>
          </form>
        </div>

        {/* Active Exercises & Weight/Reps Inputs */}
        <div className="space-y-4 pt-2 border-t border-[#202A35]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8]">
              2. Enter Lifting Weight (kg) & Reps
            </label>
            <span className="text-xs text-[#8B98A8]">
              Logging as <strong className="text-[#F5F7FA]">{data.currentUser?.display_name}</strong>
            </span>
          </div>

          {(!activeWorkout || activeWorkout.exercises.length === 0) ? (
            <div className="rounded-xl border border-dashed border-[#202A35] p-6 text-center">
              <Dumbbell className="w-6 h-6 text-[#8B98A8] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#F5F7FA]">
                No exercises added yet
              </p>
              <p className="text-xs text-[#8B98A8] mt-1">
                Tap any exercise button above (like Bench Press or Squat) to log your sets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeWorkout.exercises.map((exItem) => {
                const exName = exerciseMap.get(exItem.exercise_id) || 'Exercise';
                const prevBest = data.bestLiftByExercise.get(exItem.exercise_id);

                return (
                  <div
                    key={exItem.id}
                    data-testid={`workout-exercise-card-${exItem.exercise_id}`}
                    className="rounded-xl border border-[#202A35] bg-[#121821]/90 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-display font-bold text-[#F5F7FA]">
                          {exName}
                        </h3>
                        {prevBest ? (
                          <p className="text-xs text-[#5EC8FF] flex items-center gap-1 mt-0.5">
                            <Trophy className="w-3.5 h-3.5" />
                            Previous Best: <span className="font-display font-bold">{prevBest.weight} kg × {prevBest.reps} reps</span>
                          </p>
                        ) : (
                          <p className="text-xs text-[#8B98A8] mt-0.5">
                            First time logging {exName}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exItem.id)}
                        className="p-2 rounded-lg text-[#8B98A8] hover:text-[#F87171] hover:bg-[#0D1117]"
                        title="Remove exercise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Simple Set Rows: Set #, Weight (kg), Reps */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-display uppercase tracking-wider text-[#8B98A8] px-1">
                        <div className="col-span-2">SET</div>
                        <div className="col-span-4">WEIGHT (KG)</div>
                        <div className="col-span-4">REPS</div>
                        <div className="col-span-2 text-right">REMOVE</div>
                      </div>

                      {exItem.sets.map((s, idx) => (
                        <div
                          key={s.id}
                          className="grid grid-cols-12 gap-2 items-center bg-[#0D1117] border border-[#202A35] rounded-xl px-2.5 py-2"
                        >
                          <div className="col-span-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#121821] text-xs font-display font-bold text-[#5EC8FF]">
                              {idx + 1}
                            </span>
                          </div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              aria-label={`${exName} Set ${idx + 1} Weight`}
                              value={s.weight || ''}
                              onChange={(e) =>
                                handleUpdateSet(exItem.id, s.id, 'weight', e.target.value)
                              }
                              placeholder="kg"
                              className="w-full h-10 rounded-lg bg-[#121821] border border-[#202A35] px-3 text-sm font-display font-bold text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
                            />
                          </div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              inputMode="numeric"
                              aria-label={`${exName} Set ${idx + 1} Reps`}
                              value={s.reps || ''}
                              onChange={(e) =>
                                handleUpdateSet(exItem.id, s.id, 'reps', e.target.value)
                              }
                              placeholder="reps"
                              className="w-full h-10 rounded-lg bg-[#121821] border border-[#202A35] px-3 text-sm font-display font-bold text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
                            />
                          </div>

                          <div className="col-span-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exItem.id, s.id)}
                              className="p-2 rounded-lg text-[#8B98A8] hover:text-[#F87171]"
                              aria-label="Remove set"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSet(exItem.id)}
                      className="w-full py-2 rounded-xl border border-[#202A35] bg-[#0D1117] hover:border-[#5EC8FF]/40 text-xs font-display font-semibold text-[#5EC8FF] transition-colors"
                    >
                      + Add Another Set
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Today's Workout Button */}
        <button
          type="button"
          data-testid="finish-workout-btn"
          disabled={saving || !activeWorkout || activeWorkout.exercises.length === 0}
          onClick={handleSaveWorkout}
          className="w-full min-h-[50px] rounded-xl bg-[#5EC8FF] hover:bg-[#7DD3FC] disabled:opacity-40 text-[#07090C] font-display font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(94,200,255,0.25)]"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          {saving ? 'Saving Workout...' : "Save Today's Workout"}
        </button>
      </div>

      {/* Recent Logged Workouts for Current User */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8] block">
              RECENT SESSIONS
            </span>
            <h2 className="text-base font-display font-bold text-[#F5F7FA]">
              {data.currentUser?.display_name}&apos;s Logged Workouts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('progress')}
            className="text-xs font-medium text-[#5EC8FF] hover:text-[#7DD3FC]"
          >
            View Strength Progress →
          </button>
        </div>

        <div className="space-y-2.5">
          {data.sortedWorkouts.slice(0, 6).map((w) => {
            const wExs = data.userWEs.filter((we) => we.workout_id === w.id);
            return (
              <div
                key={w.id}
                className="rounded-xl border border-[#202A35] bg-[#121821]/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-display font-bold text-[#F5F7FA]">
                      {w.name}
                    </span>
                    <span className="text-xs text-[#8B98A8] font-display">
                      {w.workout_date}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {wExs.map((we) => {
                      const exSets = data.userSets.filter(
                        (s) => s.workout_exercise_id === we.id
                      );
                      const maxWeight = exSets.reduce(
                        (max, s) => (s.weight > max ? s.weight : max),
                        0
                      );
                      const bestReps =
                        exSets.find((s) => s.weight === maxWeight)?.reps ?? 0;
                      return (
                        <span
                          key={we.id}
                          className="px-2.5 py-1 rounded-lg bg-[#0D1117] border border-[#202A35] text-xs text-[#F5F7FA]"
                        >
                          {exerciseMap.get(we.exercise_id) || 'Lift'}:{' '}
                          <strong className="font-display text-[#5EC8FF]">
                            {maxWeight} kg × {bestReps}
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
