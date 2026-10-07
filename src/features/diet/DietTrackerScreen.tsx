import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  Plus,
  Trash2,
  Utensils,
} from 'lucide-react';
import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import { useAppStore } from '@/app/store';
import {
  createDietLogRecord,
  deleteDietLogRecord,
  queryChallengeDietLogsWithRLS,
} from '@/lib/neon/repository';
import type { MealType } from '@/types';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

const QUICK_FOOD_SUGGESTIONS: Record<MealType, string[]> = {
  Breakfast: [
    '4 Boiled Eggs, 2 Multigrain Toast & Black Coffee',
    'Oats Bowl with Milk, Banana & Almonds',
    'Paneer Bhurji & 2 Roti',
    '3 Whole Eggs Omelette & Fruit',
  ],
  Lunch: [
    'Grilled Chicken Breast, Rice, Dal & Salad',
    'Rajma Rice, Paneer Sabzi & Curd',
    '3 Roti, Dal Tadka, Mix Veg & Curd',
    'Egg Curry, Steamed Rice & Cucumber Salad',
  ],
  Snack: [
    'Whey Protein Shake & 1 Banana',
    'Roasted Chana, Peanuts & Green Tea',
    'Greek Yogurt & Mixed Berries',
    'Peanut Butter Toast & Black Coffee',
  ],
  Dinner: [
    '3 Chapati, Paneer Bhurji & Green Salad',
    'Grilled Fish / Chicken & Sautéed Veggies',
    '2 Chapati, Soya Chunk Curry & Dal',
    'Moong Dal Chilla with Mint Chutney',
  ],
};

export function DietTrackerScreen() {
  const {
    currentUserId,
    activeChallengeId,
    selectedDate,
    setCurrentUser,
    showToast,
  } = useAppStore();

  const [selectedMealType, setSelectedMealType] = useState<MealType>('Breakfast');
  const [foodText, setFoodText] = useState('');
  const [saving, setSaving] = useState(false);

  const uid = currentUserId || 'user-harsh';
  const dateStr = selectedDate || DEMO_TODAY;
  const cid = activeChallengeId || 'challenge-winter-arc';

  const data = useLiveQuery(async () => {
    const [profiles, challenge, myLogs, visibleChallengeLogs] = await Promise.all([
      db.profiles.toArray(),
      db.cached_challenges.get(cid),
      db.diet_logs
        .where('user_id')
        .equals(uid)
        .filter((l) => l.date === dateStr)
        .toArray(),
      queryChallengeDietLogsWithRLS(cid, uid, dateStr),
    ]);

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
      challenge,
      myLogs,
      visibleChallengeLogs,
    };
  }, [uid, cid, dateStr]);

  if (!data) {
    return <div className="p-6 text-sm text-[#8B98A8]">Loading diet log...</div>;
  }

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFood = foodText.trim();
    if (!cleanFood) {
      showToast({
        title: 'Enter what you ate',
        subtitle: 'Type your meal or tap one of the quick suggestions below',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      await createDietLogRecord({
        userId: uid,
        challengeId: cid,
        date: dateStr,
        meal_type: selectedMealType,
        description: cleanFood,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });

      setFoodText('');
      showToast({
        title: `${selectedMealType} Updated!`,
        subtitle: cleanFood,
        type: 'success',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddSuggestion = async (suggestion: string) => {
    setSaving(true);
    try {
      await createDietLogRecord({
        userId: uid,
        challengeId: cid,
        date: dateStr,
        meal_type: selectedMealType,
        description: suggestion,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
      showToast({
        title: `${selectedMealType} Added`,
        subtitle: suggestion,
        type: 'success',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteDietLogRecord(logId, uid);
    showToast({
      title: 'Meal entry removed',
      type: 'info',
    });
  };

  return (
    <div data-testid="diet-tracker-screen" className="max-w-4xl mx-auto px-4 pt-4 pb-28 space-y-6">
      {/* Header + 3-Login Switcher (Harsh, Pranav, Kavi) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1117] border border-[#202A35] rounded-2xl p-4">
        <div>
          <span className="text-[11px] font-display uppercase tracking-widest text-[#4ADE80] block">
            SIMPLE FOOD LOG
          </span>
          <h1 className="text-xl font-display font-bold text-[#F5F7FA]">
            What Did You Eat Today?
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Just update what you ate — no complicated calorie or macro counting.
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

      {/* Simple Add/Update Meal Card */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-4">
        <div>
          <label className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8] block mb-2">
            1. Choose Meal
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MEAL_TYPES.map((meal) => {
              const active = selectedMealType === meal;
              return (
                <button
                  key={meal}
                  type="button"
                  data-testid={`meal-tab-${meal.toLowerCase()}`}
                  onClick={() => setSelectedMealType(meal)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-display font-bold border transition-all ${
                    active
                      ? 'bg-[#5EC8FF] text-[#07090C] border-[#5EC8FF]'
                      : 'bg-[#121821] text-[#8B98A8] border-[#202A35] hover:text-[#F5F7FA]'
                  }`}
                >
                  {meal}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSaveFood} className="space-y-3">
          <div>
            <label className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8] block mb-1.5">
              2. What Did {data.currentUser?.display_name} Eat for {selectedMealType}?
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                data-testid="diet-food-input"
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                placeholder={`e.g., ${QUICK_FOOD_SUGGESTIONS[selectedMealType][0]}`}
                className="flex-1 h-11 rounded-xl bg-[#121821] border border-[#202A35] px-3.5 text-sm text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
              />
              <button
                type="submit"
                data-testid="diet-save-btn"
                disabled={saving}
                className="h-11 px-5 rounded-xl bg-[#5EC8FF] hover:bg-[#7DD3FC] text-[#07090C] font-display font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Save {selectedMealType}
              </button>
            </div>
          </div>
        </form>

        {/* 1-Tap Quick Suggestions */}
        <div>
          <span className="text-[10px] font-display uppercase tracking-widest text-[#8B98A8] block mb-2">
            Or Tap to Quick-Add {selectedMealType}:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_FOOD_SUGGESTIONS[selectedMealType].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleQuickAddSuggestion(item)}
                className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] hover:border-[#5EC8FF]/40 text-xs text-[#F5F7FA] flex items-center gap-1.5 text-left transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#5EC8FF] shrink-0" />
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Meals Breakdown for Current User */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-display uppercase tracking-widest text-[#8B98A8] block">
              TODAY&apos;S FOOD LOG
            </span>
            <h2 className="text-base font-display font-bold text-[#F5F7FA]">
              What {data.currentUser?.display_name} Ate Today
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/30 text-[11px] font-display font-semibold text-[#4ADE80]">
            {data.myLogs.length} {data.myLogs.length === 1 ? 'meal' : 'meals'} logged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MEAL_TYPES.map((mealType) => {
            const entries = data.myLogs.filter((l) => l.meal_type === mealType);
            return (
              <div
                key={mealType}
                className="rounded-xl border border-[#202A35] bg-[#121821]/80 p-3.5 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-bold uppercase tracking-wider text-[#5EC8FF]">
                    {mealType}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMealType(mealType)}
                    className="text-[11px] text-[#8B98A8] hover:text-[#F5F7FA]"
                  >
                    + Update
                  </button>
                </div>

                {entries.length === 0 ? (
                  <p className="text-xs text-[#8B98A8] italic py-1">
                    Not logged yet
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-2 bg-[#0D1117] border border-[#202A35] rounded-lg px-2.5 py-2"
                      >
                        <span className="text-xs font-medium text-[#F5F7FA]">
                          {entry.description}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(entry.id)}
                          className="text-[#8B98A8] hover:text-[#F87171] shrink-0"
                          title="Delete meal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Squad Food Accountability: See What Harsh, Pranav & Kavi Ate Today */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-4">
        <div>
          <span className="text-[11px] font-display uppercase tracking-widest text-[#5EC8FF] block">
            SQUAD ACCOUNTABILITY
          </span>
          <h2 className="text-base font-display font-bold text-[#F5F7FA]">
            What Harsh, Pranav &amp; Kavi Ate Today
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.profiles.map((member) => {
            const memberMeals = data.visibleChallengeLogs.filter(
              (l) => l.user_id === member.id
            );
            return (
              <div
                key={member.id}
                className="rounded-xl border border-[#202A35] bg-[#121821]/70 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                      className="w-7 h-7 rounded-full border border-[#202A35]"
                    />
                    <span className="text-sm font-display font-bold text-[#F5F7FA]">
                      {member.display_name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8B98A8] font-display">
                    {memberMeals.length} meals
                  </span>
                </div>

                {memberMeals.length === 0 ? (
                  <p className="text-xs text-[#8B98A8] italic">
                    No meals logged today
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {memberMeals.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg bg-[#0D1117] border border-[#202A35] px-2.5 py-1.5"
                      >
                        <span className="text-[10px] font-display uppercase tracking-wider text-[#5EC8FF] block">
                          {m.meal_type}
                        </span>
                        <span className="text-xs text-[#F5F7FA]">{m.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
