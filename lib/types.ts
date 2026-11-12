import type { ScheduleSlot } from '@/lib/schedule';

export type EventStatus = 'pending' | 'approved' | 'completed';

export type EventGame = {
  leader?: string;
  name?: string;
  description?: string;
  tools?: string;
};

export type Event = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  responsible_person?: string | null;
  phone?: string | null;
  day_name?: string | null;
  goal?: string | null;
  event_date: string;
  participants_count?: number | null;
  location?: string | null;
  /** Older events only; new events use `schedule`. */
  games_time?: number | null;
  schedule: ScheduleSlot[];
  status: EventStatus;
  leader?: string | null;
  co_leader?: string | null;
  games: EventGame[];
  day_details?: string | null;
};