import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  Scale,
  Utensils,
} from 'lucide-react';
import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import { useAppStore } from '@/app/store';
import { calculateDailyDietTotals } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const OCTOBER_2026_DAYS = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
  return { day, dateStr };
});

export function CalendarScreen() {
  const { currentUserId, navigate } = useAppStore();
  const uid = currentUserId || 'user-harsh';
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);

  const data = useLiveQuery(async () => {
    const [workouts, dietLogs, bodyMetrics] = await Promise.all([
      db.workouts.where('user_id').equals(uid).toArray(),
      db.diet_logs.where('user_id').equals(uid).toArray(),
      db.body_metrics.where('user_id').equals(uid).toArray(),
    ]);

    const workoutDates = new Set(workouts.filter((w) => w.completed).map((w) => w.workout_date));
    const dietDates = new Set(dietLogs.map((d) => d.date));

    const dayWorkouts = workouts.filter((w) => w.workout_date === selectedDate);
    const dayMeals = dietLogs.filter((d) => d.date === selectedDate);
    const dayDietTotals = calculateDailyDietTotals(dayMeals);
    const dayMetric =
      bodyMetrics.find((b) => b.date === selectedDate) ||
      bodyMetrics[bodyMetrics.length - 1];

    return {
      workoutDates,
      dietDates,
      dayWorkouts,
      dayMeals,
      dayDietTotals,
      dayMetric,
    };
  }, [uid, selectedDate]);

  if (!data) {
    return <div className="p-6 h-80 rounded-2xl bg-[#0D1117] animate-pulse" />;
  }

  return (
    <div data-testid="calendar-screen" className="pb-24 lg:pb-12 space-y-5 max-w-2xl mx-auto">
      {/* Header matching Screen 7 of UI Reference */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('home')}
          aria-label="Back to Home"
          className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] flex items-center justify-center text-[#F5F7FA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-[#F5F7FA]">Calendar</h1>
          <p className="text-xs text-[#8B98A8]">
            Plan and view past & upcoming workouts and diet logs
          </p>
        </div>
      </div>

      {/* Monthly Calendar Card */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="p-2 rounded-xl bg-[#121821] text-[#8B98A8] hover:text-[#F5F7FA]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-display font-bold text-base text-[#F5F7FA]">October 2026</h2>
          <button
            type="button"
            className="p-2 rounded-xl bg-[#121821] text-[#8B98A8] hover:text-[#F5F7FA]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-[#8B98A8]">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Oct 1, 2026 is a Thursday (3 empty leading cells for Mon, Tue, Wed) */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          <div />
          <div />
          <div />
          {OCTOBER_2026_DAYS.map(({ day, dateStr }) => {
            const isSelected = selectedDate === dateStr;
            const hasWorkout = data.workoutDates.has(dateStr);
            const hasDiet = data.dietDates.has(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                data-testid={`calendar-day-${dateStr}`}
                className={cn(
                  'h-11 rounded-xl flex flex-col items-center justify-center relative transition-all',
                  isSelected
                    ? 'bg-[#5EC8FF] text-[#07090C] font-bold shadow-glow-cyan'
                    : 'hover:bg-[#121821] text-[#F5F7FA]'
                )}
              >
                <span className="font-display text-sm">{day}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {hasWorkout && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-[#07090C]' : 'bg-[#5EC8FF]'
                      )}
                    />
                  )}
                  {hasDiet && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-[#07090C]' : 'bg-[#FBBF24]'
                      )}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Drilldown */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-[#F5F7FA]">
          {selectedDate === DEMO_TODAY ? `Today (${selectedDate})` : selectedDate}
        </h3>

        <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl divide-y divide-[#202A35]">
          <div
            onClick={() => navigate('log-workout')}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#121821]/60"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#5EC8FF]/15 text-[#5EC8FF] flex items-center justify-center">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#F5F7FA]">
                  {data.dayWorkouts[0]?.name || 'No workout logged'}
                </p>
                <p className="text-xs text-[#8B98A8]">
                  {data.dayWorkouts.length > 0
                    ? `${data.dayWorkouts[0].duration_minutes} mins • Completed`
                    : 'Tap to log workout for this date'}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#5EC8FF]">Open</span>
          </div>

          <div
            onClick={() => navigate('log-diet')}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#121821]/60"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#FBBF24]/15 text-[#FBBF24] flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#F5F7FA]">Food Log</p>
                <p className="text-xs text-[#8B98A8]">
                  {data.dayMeals.length > 0
                    ? data.dayMeals.map((m) => `${m.meal_type}: ${m.description}`).join(' • ')
                    : 'No meals logged on this date'}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#5EC8FF]">Open</span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#F5F7FA]">
                  Body Weight Check-In
                </p>
                <p className="text-xs text-[#8B98A8]">Daily Weight Record</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#8B98A8]">
              <Scale className="w-3.5 h-3.5 text-[#5EC8FF]" />
              <span>
                {data.dayMetric?.weight ? `${data.dayMetric.weight} kg` : 'Not logged'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
