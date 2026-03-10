import type { StorageAdapter, WorkoutState, WorkoutSession, WorkoutHistory } from '../types/workout';

const SESSION_KEY = 'workout-session';
const HISTORY_KEY = 'workout-history';

const EMPTY_HISTORY: WorkoutHistory = { version: 1, sessions: [] };

export const localStorageAdapter: StorageAdapter = {
  loadSession(): WorkoutState | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as WorkoutState) : null;
    } catch {
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
      return raw ? (JSON.parse(raw) as WorkoutHistory) : EMPTY_HISTORY;
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
