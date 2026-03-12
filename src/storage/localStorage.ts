import type { StorageAdapter, WorkoutState, WorkoutSession, WorkoutHistory } from '../types/workout';
import { isValidWorkoutState, isValidWorkoutHistory } from './validation';

const SESSION_KEY = 'workout-session';
const HISTORY_KEY = 'workout-history';

const EMPTY_HISTORY: WorkoutHistory = { version: 1, sessions: [] };

export const localStorageAdapter: StorageAdapter = {
  loadSession(): WorkoutState | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (!isValidWorkoutState(parsed)) {
        // Corrupt or stale data — discard it
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  saveSession(state: WorkoutState): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — silent fail for MVP
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  loadHistory(): WorkoutHistory {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return EMPTY_HISTORY;

      const parsed: unknown = JSON.parse(raw);
      if (!isValidWorkoutHistory(parsed)) {
        // Corrupt history — start fresh rather than lose new data
        return EMPTY_HISTORY;
      }
      return parsed;
    } catch {
      return EMPTY_HISTORY;
    }
  },

  appendSession(session: WorkoutSession): void {
    const history = this.loadHistory();
    const updated: WorkoutHistory = {
      ...history,
      sessions: [...history.sessions, session],
    };
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // silent fail for MVP
    }
  },
};
