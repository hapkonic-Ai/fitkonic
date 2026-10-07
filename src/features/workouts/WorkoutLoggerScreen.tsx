import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  CheckCircle2,
  Dumbbell,
  Flame,
  History,
  Layers,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { db } from '@/db/dexie';
import {
  DEMO_TODAY,
  SQUAD_WORKOUT_TEMPLATES,
  type SquadWorkoutTemplate,
} from '@/db/seed';
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

const MUSCLE_FILTERS = [
  'Recent',
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Core',
  'Cardio',
] as const;

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

  const uid = currentUserId || 'user-harsh';

  // Split Mode Tab: PPL Week vs Full Body Week vs Boxing HIIT
  const [splitTab, setSplitTab] = useState<'PPL' | 'FULL_BODY' | 'BOXING_HIIT'>('PPL');

  // Search & 1-Step Quick Entry State
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<(typeof MUSCLE_FILTERS)[number]>('All');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex-bench-press');
  const [entryWeight, setEntryWeight] = useState<string>('40');
  const [entryReps, setEntryReps] = useState<string>('12');
  const [entrySetsCount, setEntrySetsCount] = useState<number>(3);
  const [saving, setSaving] = useState(false);

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

    // Map exercise_id -> best weight & reps lifted by this user
    const bestLiftByExercise = new Map<string, { weight: number; reps: number }>();
    const recentExerciseIds: string[] = [];

    for (const w of sortedWorkouts) {
      const wExs = userWEs.filter((we) => we.workout_id === w.id);
      for (const we of wExs) {
        if (!recentExerciseIds.includes(we.exercise_id)) {
          recentExerciseIds.push(we.exercise_id);
        }
        const weSets = userSets.filter((s) => s.workout_exercise_id === we.id);
        for (const s of weSets) {
          const prev = bestLiftByExercise.get(we.exercise_id);
          if (!prev || s.weight > prev.weight) {
            bestLiftByExercise.set(we.exercise_id, { weight: s.weight, reps: s.reps });
          }
        }
      }
    }

    const squadOrder = ['user-harsh', 'user-pranav', 'user-kavi', 'user-vijay'];
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
      recentExerciseIds,
    };
  }, [uid]);

  // Whenever selectedExerciseId changes, pre-fill weight & reps from user's previous best
  useEffect(() => {
    if (!data) return;
    const prevBest = data.bestLiftByExercise.get(selectedExerciseId);
    if (prevBest) {
      setEntryWeight(String(prevBest.weight));
      setEntryReps(String(prevBest.reps));
    }
  }, [selectedExerciseId, data]);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.exercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [data?.exercises]);

  const filteredExercises = useMemo(() => {
    if (!data?.exercises) return [];
    const q = searchQuery.trim().toLowerCase();

    let list = data.exercises;

    if (q) {
      return list
        .filter(
          (ex) =>
            ex.name.toLowerCase().includes(q) ||
            ex.muscle_group.toLowerCase().includes(q) ||
            ex.equipment.toLowerCase().includes(q)
        )
        .slice(0, 18);
    }

    if (muscleFilter === 'Recent') {
      const recentSet = new Set(data.recentExerciseIds);
      const recentItems = data.recentExerciseIds
        .map((id) => list.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e));
      const fallback = list.filter((e) => !recentSet.has(e.id)).slice(0, 8);
      return [...recentItems, ...fallback].slice(0, 10);
    }

    if (muscleFilter !== 'All') {
      list = list.filter(
        (ex) => ex.muscle_group.toLowerCase() === muscleFilter.toLowerCase()
      );
    }

    return list.slice(0, 18);
  }, [data?.exercises, data?.recentExerciseIds, searchQuery, muscleFilter]);

  if (!data) {
    return <div className="p-6 text-sm text-[#8B98A8]">Loading workout logger...</div>;
  }

  const selectedExercise = data.exercises.find((e) => e.id === selectedExerciseId);
  const selectedPrevBest = data.bestLiftByExercise.get(selectedExerciseId);
  const templatesForSplit = SQUAD_WORKOUT_TEMPLATES.filter(
    (t) => t.splitGroup === splitTab
  );

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

  // Load an entire PPL, Full Body, or Boxing HIIT template in 1 tap
  const handleLoadSquadTemplate = (tpl: SquadWorkoutTemplate) => {
    const draftExercises: ActiveDraftExercise[] = tpl.exercises.map((item) => {
      const prev = data.bestLiftByExercise.get(item.exerciseId);
      const defaultWeight = prev ? prev.weight : 0;

      return {
        id: createId('we'),
        exercise_id: item.exerciseId,
        notes: item.note || '',
        sets: item.repsPerSet.map((targetReps, idx) => ({
          id: createId('set'),
          set_number: idx + 1,
          weight: defaultWeight,
          weight_unit: 'kg' as const,
          reps: targetReps,
          rpe: 8,
          rir: 2,
          completed: true,
        })),
      };
    });

    setActiveWorkout({
      id: createId('w'),
      name: tpl.name,
      workout_date: DEMO_TODAY,
      challenge_id: activeChallengeId || 'challenge-winter-arc',
      startedAt: Date.now(),
      notes: tpl.focusSubtitle,
      exercises: draftExercises,
    });

    showToast({
      title: `Loaded ${tpl.name}`,
      subtitle: `${tpl.exercises.length} exercises ready — enter your weights (kg) & save!`,
      type: 'success',
    });
  };

  // 1-Step Add Exercise with Weight, Reps & Sets directly into Today's Workout
  const handleQuickLogExercise = (
    overrideExerciseId?: string,
    overrideWeight?: number,
    overrideReps?: number,
    overrideSets?: number
  ) => {
    const targetExId = overrideExerciseId || selectedExerciseId;
    if (!targetExId) return;

    const draft = ensureDraft();
    const prev = data.bestLiftByExercise.get(targetExId);
    const w =
      overrideWeight !== undefined
        ? overrideWeight
        : Number(entryWeight) || prev?.weight || 20;
    const r =
      overrideReps !== undefined ? overrideReps : Number(entryReps) || prev?.reps || 12;
    const count = overrideSets !== undefined ? overrideSets : Math.max(1, entrySetsCount);

    const existingEx = draft.exercises.find((e) => e.exercise_id === targetExId);

    if (existingEx) {
      const addedSets = Array.from({ length: count }, (_, idx) => ({
        id: createId('set'),
        set_number: existingEx.sets.length + idx + 1,
        weight: w,
        weight_unit: 'kg' as const,
        reps: r,
        rpe: 8,
        rir: 2,
        completed: true,
      }));

      setActiveWorkout({
        ...draft,
        exercises: draft.exercises.map((ex) =>
          ex.id === existingEx.id ? { ...ex, sets: [...ex.sets, ...addedSets] } : ex
        ),
      });
    } else {
      // Default to 15-12-10 if 3 sets are added
      const defaultPyramid = count === 3 ? [15, 12, 10] : null;
      const newSets = Array.from({ length: count }, (_, idx) => ({
        id: createId('set'),
        set_number: idx + 1,
        weight: w,
        weight_unit: 'kg' as const,
        reps: defaultPyramid && overrideReps === undefined ? defaultPyramid[idx] : r,
        rpe: 8,
        rir: 2,
        completed: true,
      }));

      const newEx: ActiveDraftExercise = {
        id: createId('we'),
        exercise_id: targetExId,
        notes: '',
        sets: newSets,
      };

      setActiveWorkout({
        ...draft,
        exercises: [...draft.exercises, newEx],
      });
    }

    setSearchQuery('');
  };

  const handleCreateAndSelectCustom = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const created = await createCustomExercise({
      userId: uid,
      name: trimmed,
      category: 'Full Body',
      muscle_group: 'Full Body',
      equipment: 'Barbell',
    });

    setSelectedExerciseId(created.id);
    setSearchQuery('');
    showToast({
      title: `Selected "${created.name}"`,
      subtitle: 'Enter your weight (kg) & reps and tap Add Lift',
      type: 'info',
    });
  };

  // 1-Tap Repeat Last Session
  const handleRepeatLastWorkout = () => {
    const lastWorkout = data.sortedWorkouts[0];
    if (!lastWorkout) {
      showToast({
        title: 'No previous workout found yet',
        subtitle: 'Pick a PPL or Full Body routine above for Day 1!',
        type: 'info',
      });
      return;
    }

    const lastWEs = data.userWEs
      .filter((we) => we.workout_id === lastWorkout.id)
      .sort((a, b) => a.order_index - b.order_index);

    const draftExercises: ActiveDraftExercise[] = lastWEs.map((we) => {
      const weSets = data.userSets
        .filter((s) => s.workout_exercise_id === we.id)
        .sort((a, b) => a.set_number - b.set_number);

      return {
        id: createId('we'),
        exercise_id: we.exercise_id,
        notes: we.notes || '',
        sets:
          weSets.length > 0
            ? weSets.map((s, idx) => ({
                id: createId('set'),
                set_number: idx + 1,
                weight: s.weight,
                weight_unit: 'kg' as const,
                reps: s.reps,
                rpe: 8,
                rir: 2,
                completed: true,
              }))
            : [
                {
                  id: createId('set'),
                  set_number: 1,
                  weight: 20,
                  weight_unit: 'kg' as const,
                  reps: 12,
                  rpe: 8,
                  rir: 2,
                  completed: true,
                },
              ],
      };
    });

    setActiveWorkout({
      id: createId('w'),
      name: lastWorkout.name || "Today's Workout",
      workout_date: DEMO_TODAY,
      challenge_id: activeChallengeId || 'challenge-winter-arc',
      startedAt: Date.now(),
      notes: '',
      exercises: draftExercises,
    });

    showToast({
      title: 'Loaded Last Workout!',
      subtitle: 'Adjust any weights you increased today and tap Save',
      type: 'success',
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
              weight: lastSet ? lastSet.weight : 20,
              weight_unit: 'kg',
              reps: lastSet ? lastSet.reps : 10,
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
        title: 'Add at least one exercise first',
        subtitle: 'Tap a PPL / Full Body routine or search an exercise above',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
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

  const hasExactSearchMatch =
    searchQuery.trim().length > 0 &&
    data.exercises.some(
      (ex) => ex.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

  return (
    <div data-testid="workout-logger-screen" className="max-w-4xl mx-auto pb-28 space-y-5">
      {/* Header + 4-User Switcher (Harsh, Pranav, Kavi, Vijay) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1117] border border-white/10 rounded-3xl p-4">
        <div>
          <span className="text-[10px] font-display uppercase tracking-widest text-[#5EC8FF] block">
            PPL WEEK • FULL BODY WEEK • BOXING HIIT • CUSTOM
          </span>
          <h1 className="text-xl font-display font-bold text-[#F5F7FA]">
            Log Today&apos;s Workout
          </h1>
          <p className="text-xs text-[#8B98A8]">
            1-tap load your PPL or Full Body day, or search &amp; add any exercise freely.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-[#121821] border border-white/10 rounded-2xl p-1.5 w-full sm:w-auto">
          {data.profiles.map((member) => {
            const active = member.id === uid;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setCurrentUser(member.id)}
                className={`px-2.5 py-2 rounded-xl text-xs font-display font-bold transition-all text-center truncate ${
                  active
                    ? 'bg-[#5EC8FF] text-[#07090C] shadow-[0_0_18px_rgba(94,200,255,0.4)]'
                    : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
                }`}
              >
                {member.display_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved Summary Banner */}
      {lastCompletedSummary && (
        <div
          data-testid="workout-saved-banner"
          className="rounded-3xl border border-[#4ADE80]/40 bg-[#4ADE80]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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

      {/* 1-TAP SQUAD SPLIT PICKER: WEEK A (PPL) vs WEEK B (FULL BODY) vs BOXING HIIT */}
      <div className="rounded-3xl border border-white/10 bg-[#0D1117] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5EC8FF]" />
            <span className="text-xs font-display font-bold uppercase tracking-wider text-[#F5F7FA]">
              1-Tap Squad Split Routines
            </span>
          </div>

          <button
            type="button"
            onClick={handleRepeatLastWorkout}
            className="px-3 py-1.5 rounded-xl bg-[#121821] border border-white/10 hover:border-[#5EC8FF]/50 text-xs font-display font-semibold text-[#5EC8FF] flex items-center gap-1.5 transition-all"
          >
            <History className="w-3.5 h-3.5" />
            <span>Copy Last Workout</span>
          </button>
        </div>

        {/* Split Mode Switcher: PPL Week | Full Body Week | Boxing HIIT */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#121821] border border-white/10 rounded-2xl p-1.5">
          <button
            type="button"
            onClick={() => setSplitTab('PPL')}
            className={`py-2 px-2.5 rounded-xl text-xs font-display font-bold transition-all ${
              splitTab === 'PPL'
                ? 'bg-[#5EC8FF] text-[#07090C] shadow-[0_0_16px_rgba(94,200,255,0.35)]'
                : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
            }`}
          >
            PPL Week (6 Days)
          </button>
          <button
            type="button"
            onClick={() => setSplitTab('FULL_BODY')}
            className={`py-2 px-2.5 rounded-xl text-xs font-display font-bold transition-all ${
              splitTab === 'FULL_BODY'
                ? 'bg-[#5EC8FF] text-[#07090C] shadow-[0_0_16px_rgba(94,200,255,0.35)]'
                : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
            }`}
          >
            Full Body Week (5 Days)
          </button>
          <button
            type="button"
            onClick={() => setSplitTab('BOXING_HIIT')}
            className={`py-2 px-2.5 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-center gap-1 ${
              splitTab === 'BOXING_HIIT'
                ? 'bg-[#F59E0B] text-[#07090C] shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Boxing HIIT</span>
          </button>
        </div>

        {/* Routine Day Cards for the Active Split */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {templatesForSplit.map((tpl) => {
            const isLoaded = activeWorkout?.name === tpl.name;
            return (
              <button
                key={tpl.id}
                type="button"
                data-testid={`load-template-${tpl.id}`}
                onClick={() => handleLoadSquadTemplate(tpl)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isLoaded
                    ? 'bg-[#5EC8FF]/15 border-[#5EC8FF] shadow-[0_0_18px_rgba(94,200,255,0.2)]'
                    : 'bg-[#121821] border-white/10 hover:border-[#5EC8FF]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm font-display font-bold text-[#F5F7FA] truncate">
                    {tpl.shortLabel}
                  </span>
                  <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-[#5EC8FF]/20 text-[#5EC8FF] shrink-0">
                    Load
                  </span>
                </div>
                <span className="text-[11px] text-[#8B98A8] line-clamp-1">
                  {tpl.focusSubtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAST SEARCH + 1-STEP LIFT ADDER (Add or Swap Any Exercise Freely) */}
      <div className="rounded-3xl border border-white/10 bg-[#0D1117] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold uppercase tracking-wider text-[#F5F7FA]">
            Or Search &amp; Add Any Exercise ({data.exercises.length}+ Available)
          </span>
          <span className="text-[11px] text-[#8B98A8]">Not limited to templates</span>
        </div>

        <div className="relative space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5EC8FF] absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              data-testid="exercise-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any lift (e.g. Bench, Arnold, Egyptian Lateral, Nordic, Tire Flip)..."
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-[#121821] border border-white/10 text-sm text-[#F5F7FA] placeholder:text-[#8B98A8] focus:outline-none focus:border-[#5EC8FF]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-[#8B98A8] hover:text-[#F5F7FA]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Muscle Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {MUSCLE_FILTERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMuscleFilter(m);
                  setSearchQuery('');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-display font-semibold shrink-0 transition-all ${
                  muscleFilter === m && !searchQuery
                    ? 'bg-[#5EC8FF] text-[#07090C]'
                    : 'bg-[#121821] text-[#8B98A8] hover:text-[#F5F7FA]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Compact Scrollable Exercise Picker List */}
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-[#121821] divide-y divide-white/5">
            {filteredExercises.map((ex) => {
              const isSelected = ex.id === selectedExerciseId;
              const prev = data.bestLiftByExercise.get(ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  data-testid={`quick-add-${ex.id}`}
                  onClick={() => {
                    setSelectedExerciseId(ex.id);
                    handleQuickLogExercise(
                      ex.id,
                      prev ? prev.weight : 20,
                      prev ? prev.reps : undefined,
                      3
                    );
                  }}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[#5EC8FF]/15 text-[#F5F7FA]'
                      : 'hover:bg-white/5 text-[#F5F7FA]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-display font-bold block truncate">
                      {ex.name}
                    </span>
                    <span className="text-[11px] text-[#8B98A8]">
                      {ex.muscle_group} • {ex.equipment}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {prev && (
                      <span className="text-[11px] font-display font-semibold text-[#5EC8FF]">
                        Best: {prev.weight}kg × {prev.reps}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-[#5EC8FF]/20 text-[#5EC8FF] text-xs font-display font-bold">
                      + Add 3 Sets
                    </span>
                  </div>
                </button>
              );
            })}

            {searchQuery.trim().length > 1 && !hasExactSearchMatch && (
              <button
                type="button"
                onClick={handleCreateAndSelectCustom}
                className="w-full px-3.5 py-2.5 text-left flex items-center justify-between bg-[#5EC8FF]/10 hover:bg-[#5EC8FF]/20 text-[#5EC8FF]"
              >
                <span className="text-xs font-display font-bold">
                  + Create &amp; Add Custom Exercise &ldquo;{searchQuery.trim()}&rdquo;
                </span>
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Exercise 1-Row Quick Set Builder */}
        {selectedExercise && (
          <div className="rounded-2xl border border-white/10 bg-[#121821] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-display uppercase tracking-wider text-[#5EC8FF] block">
                  SELECTED EXERCISE
                </span>
                <h3 className="text-sm font-display font-bold text-[#F5F7FA]">
                  {selectedExercise.name}
                </h3>
              </div>
              {selectedPrevBest && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#8B98A8]">
                    Last Best:{' '}
                    <strong className="text-[#5EC8FF] font-display">
                      {selectedPrevBest.weight} kg
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEntryWeight(String((Number(entryWeight) || selectedPrevBest.weight) + 2.5))
                    }
                    className="px-2 py-1 rounded-lg bg-[#5EC8FF]/15 border border-[#5EC8FF]/40 text-[11px] font-display font-bold text-[#5EC8FF]"
                  >
                    +2.5 kg
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="text-[10px] font-display uppercase tracking-wider text-[#8B98A8] block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={entryWeight}
                  onChange={(e) => setEntryWeight(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#0D1117] border border-white/10 px-3 text-sm font-display font-bold text-[#F5F7FA]"
                />
              </div>

              <div className="col-span-3">
                <label className="text-[10px] font-display uppercase tracking-wider text-[#8B98A8] block mb-1">
                  Reps / Sec
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={entryReps}
                  onChange={(e) => setEntryReps(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#0D1117] border border-white/10 px-3 text-sm font-display font-bold text-[#F5F7FA]"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-display uppercase tracking-wider text-[#8B98A8] block mb-1">
                  Sets
                </label>
                <select
                  value={entrySetsCount}
                  onChange={(e) => setEntrySetsCount(Number(e.target.value))}
                  className="w-full h-10 rounded-xl bg-[#0D1117] border border-white/10 px-2 text-sm font-display font-bold text-[#F5F7FA]"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <button
                  type="button"
                  onClick={() => handleQuickLogExercise()}
                  className="w-full h-10 rounded-xl bg-[#5EC8FF] hover:bg-[#7DD3FC] text-[#07090C] font-display font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Lift</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODAY'S WORKOUT — EXERCISES LOGGED SO FAR */}
      <div className="rounded-3xl border border-white/10 bg-[#0D1117] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-display uppercase tracking-widest text-[#5EC8FF] block">
              TODAY&apos;S SESSION ({data.currentUser?.display_name})
            </span>
            <h2 className="text-base font-display font-bold text-[#F5F7FA]">
              {activeWorkout?.name || "Today's Workout"} ({activeWorkout?.exercises.length || 0}{' '}
              exercises)
            </h2>
          </div>
          {activeWorkout && activeWorkout.exercises.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveWorkout(null)}
              className="text-xs text-[#8B98A8] hover:text-[#F87171]"
            >
              Clear All
            </button>
          )}
        </div>

        {!activeWorkout || activeWorkout.exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <Dumbbell className="w-6 h-6 text-[#8B98A8] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#F5F7FA]">
              Pick today&apos;s PPL or Full Body routine above
            </p>
            <p className="text-xs text-[#8B98A8] mt-1">
              Or search any exercise in the search bar to build a custom session.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeWorkout.exercises.map((exItem, exIdx) => {
              const exName = exerciseMap.get(exItem.exercise_id) || 'Exercise';
              const prevBest = data.bestLiftByExercise.get(exItem.exercise_id);

              return (
                <div
                  key={exItem.id}
                  data-testid={`workout-exercise-card-${exItem.exercise_id}`}
                  className="rounded-2xl border border-white/10 bg-[#121821] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-display font-bold text-[#F5F7FA]">
                        {exIdx + 1}. {exName}
                      </h3>
                      {exItem.notes && (
                        <p className="text-[11px] text-[#FBBF24] font-medium mt-0.5">
                          {exItem.notes}
                        </p>
                      )}
                      {prevBest && (
                        <p className="text-[11px] text-[#5EC8FF] flex items-center gap-1 mt-0.5">
                          <Trophy className="w-3 h-3" />
                          Previous Best: {prevBest.weight} kg × {prevBest.reps} reps
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddSet(exItem.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#0D1117] border border-white/10 text-xs font-display font-semibold text-[#5EC8FF]"
                      >
                        + Set
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exItem.id)}
                        className="p-1.5 rounded-lg text-[#8B98A8] hover:text-[#F87171]"
                        title="Remove exercise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Compact Set Rows */}
                  <div className="space-y-1.5">
                    {exItem.sets.map((s, idx) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-12 gap-2 items-center bg-[#0D1117] border border-white/10 rounded-xl px-2.5 py-1.5"
                      >
                        <div className="col-span-2">
                          <span className="text-xs font-display font-bold text-[#5EC8FF]">
                            Set {idx + 1}
                          </span>
                        </div>

                        <div className="col-span-4 flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            placeholder="0"
                            aria-label={`${exName} Set ${idx + 1} Weight`}
                            value={s.weight || ''}
                            onChange={(e) =>
                              handleUpdateSet(exItem.id, s.id, 'weight', e.target.value)
                            }
                            className="w-full h-8 rounded-lg bg-[#121821] border border-white/10 px-2 text-xs font-display font-bold text-[#F5F7FA]"
                          />
                          <span className="text-[10px] text-[#8B98A8]">kg</span>
                        </div>

                        <div className="col-span-4 flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="numeric"
                            aria-label={`${exName} Set ${idx + 1} Reps`}
                            value={s.reps || ''}
                            onChange={(e) =>
                              handleUpdateSet(exItem.id, s.id, 'reps', e.target.value)
                            }
                            className="w-full h-8 rounded-lg bg-[#121821] border border-white/10 px-2 text-xs font-display font-bold text-[#F5F7FA]"
                          />
                          <span className="text-[10px] text-[#8B98A8]">reps</span>
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exItem.id, s.id)}
                            className="p-1 text-[#8B98A8] hover:text-[#F87171]"
                            aria-label="Remove set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          data-testid="finish-workout-btn"
          disabled={saving || !activeWorkout || activeWorkout.exercises.length === 0}
          onClick={handleSaveWorkout}
          className="w-full min-h-[48px] rounded-2xl bg-[#5EC8FF] hover:bg-[#7DD3FC] disabled:opacity-40 text-[#07090C] font-display font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(94,200,255,0.28)]"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          {saving ? 'Saving Workout...' : "Save Today's Workout"}
        </button>
      </div>

      {/* Recent Logged Workouts for Current User */}
      <div className="rounded-3xl border border-white/10 bg-[#0D1117] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-display uppercase tracking-widest text-[#8B98A8] block">
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

        {data.sortedWorkouts.length === 0 ? (
          <p className="text-xs text-[#8B98A8] py-2">
            No workouts logged yet — today is Day 1 of your Winter Arc journey!
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.sortedWorkouts.slice(0, 5).map((w) => {
              const wExs = data.userWEs.filter((we) => we.workout_id === w.id);
              return (
                <div
                  key={w.id}
                  className="rounded-2xl border border-white/10 bg-[#121821] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                            className="px-2.5 py-1 rounded-lg bg-[#0D1117] border border-white/10 text-xs text-[#F5F7FA]"
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
        )}
      </div>
    </div>
  );
}
