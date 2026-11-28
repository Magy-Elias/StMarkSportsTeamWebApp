import type { EventGame } from '@/lib/types';

// Games plan per day of an event (Event Management), stored in the `day_plans`
// column in the same order as `schedule`. Older events kept one plan for the
// whole event in `leader` / `co_leader` / `games`; that counts as Day 1.

export type DayPlan = { leader?: string | null; co_leader?: string | null; games: EventGame[] };

type PlanSource = { day_plans?: unknown; leader?: string | null; co_leader?: string | null; games?: unknown };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Columns to load from the events table for parseDayPlans. */
export const DAY_PLAN_COLUMNS = 'day_plans, leader, co_leader, games';

/** An event's plans, one per day (Day 1 first). */
export function parseDayPlans(e: PlanSource): DayPlan[] {
  if (Array.isArray(e.day_plans) && e.day_plans.length) {
    return e.day_plans.filter(isObject).map((p) => ({
      leader: (p.leader as string | null) ?? null,
      co_leader: (p.co_leader as string | null) ?? null,
      games: Array.isArray(p.games) ? (p.games.filter(isObject) as EventGame[]) : [],
    }));
  }
  const games = Array.isArray(e.games) ? (e.games.filter(isObject) as EventGame[]) : [];
  if (e.leader || e.co_leader || games.length) return [{ leader: e.leader ?? null, co_leader: e.co_leader ?? null, games }];
  return [];
}

/** Whether a day's plan has anything filled in. */
export const dayPlanFilled = (p: DayPlan) => Boolean(p.leader || p.co_leader || p.games.length);
