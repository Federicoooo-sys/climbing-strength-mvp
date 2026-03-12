import { describe, it, expect, beforeEach } from 'vitest';
import type { StorageAdapter, WorkoutState, WorkoutSession } from '../../types/workout';
import { workoutReducer, createInitialState } from '../../logic/workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import { isValidWorkoutState, isValidWorkoutHistory } from '../validation';

// ── In-memory storage that mimics localStorage adapter ────────────

function createMockStorage(): StorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    loadSession(): WorkoutState | null {
      const raw = store.get('session');
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isValidWorkoutState(parsed)) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    saveSession(state: WorkoutState) {
      store.set('session', JSON.stringify(state));
    },
    clearSession() {
      store.delete('session');
    },
    loadHistory() {
      const raw = store.get('history');
      if (!raw) return { version: 1, sessions: [] };
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isValidWorkoutHistory(parsed)) return { version: 1, sessions: [] };
        return parsed;
      } catch {
        return { version: 1, sessions: [] };
      }
    },
    appendSession(session: WorkoutSession) {
      const history = this.loadHistory();
      store.set('history', JSON.stringify({
        ...history,
        sessions: [...history.sessions, session],
      }));
    },
  };
}

// ── Helper: advance state through actions ────────────────────────

function dispatch(state: WorkoutState, ...actions: Parameters<typeof workoutReducer>[1][]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

// ── Tests ────────────────────────────────────────────────────────

describe('Persistence: start workout and save', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('saves state after starting a workout', () => {
    const state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    storage.saveSession(state);

    const loaded = storage.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.screen).toBe('countdown');
    expect(loaded!.sessionId).toBeTruthy();
  });

  it('saves state during active set', () => {
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    // Tick down countdown (3 seconds)
    state = dispatch(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });
    expect(state.screen).toBe('active');

    storage.saveSession(state);
    const loaded = storage.loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.screen).toBe('active');
    expect(loaded!.timer.secondsRemaining).toBeGreaterThan(0);
  });
});

describe('Persistence: resume where user left off', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('resumes an active set with adjusted timer', () => {
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    state = dispatch(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });
    expect(state.screen).toBe('active');

    // Simulate saving 10 seconds ago
    const savedState = { ...state, lastSavedAt: Date.now() - 10_000 };
    storage.saveSession(savedState);

    const loaded = storage.loadSession()!;
    const resumed = workoutReducer(createInitialState(MVP_WORKOUT), {
      type: 'RESUME_WORKOUT',
      payload: { savedState: loaded, now: Date.now() },
    });

    expect(resumed.screen).toBe('active');
    // Timer should have been reduced by ~10 seconds
    expect(resumed.timer.secondsRemaining).toBeLessThan(loaded.timer.secondsRemaining);
  });

  it('resumes a rest period with adjusted timer', () => {
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    // Get to active
    state = dispatch(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });
    // Complete set and go through feedback
    state = dispatch(state, { type: 'COMPLETE_SET' });
    state = dispatch(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = dispatch(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 3 } });
    expect(state.screen).toBe('rest');

    const savedState = { ...state, lastSavedAt: Date.now() - 5_000 };
    storage.saveSession(savedState);

    const loaded = storage.loadSession()!;
    const resumed = workoutReducer(createInitialState(MVP_WORKOUT), {
      type: 'RESUME_WORKOUT',
      payload: { savedState: loaded, now: Date.now() },
    });

    expect(resumed.screen).toBe('rest');
    expect(resumed.timer.secondsRemaining).toBeLessThan(loaded.timer.secondsRemaining);
  });

  it('resumes a paused active set without timer adjustment', () => {
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    state = dispatch(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });
    state = dispatch(state, { type: 'PAUSE', payload: { now: Date.now() } });
    expect(state.pausedAt).not.toBeNull();

    storage.saveSession(state);
    const loaded = storage.loadSession()!;
    const resumed = workoutReducer(createInitialState(MVP_WORKOUT), {
      type: 'RESUME_WORKOUT',
      payload: { savedState: loaded, now: Date.now() },
    });

    // Should stay paused at the same time — no adjustment
    expect(resumed.pausedAt).not.toBeNull();
    expect(resumed.timer.secondsRemaining).toBe(loaded.timer.secondsRemaining);
  });
});

describe('Persistence: completed workout updates history', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  function completeFullWorkout(): WorkoutState {
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    for (let exIdx = 0; exIdx < MVP_WORKOUT.exercises.length; exIdx++) {
      const exercise = MVP_WORKOUT.exercises[exIdx];
      for (let setIdx = 0; setIdx < exercise.sets; setIdx++) {
        // Countdown
        state = dispatch(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });

        // Complete the set
        if (exercise.type === 'reps') {
          state = dispatch(state, { type: 'COMPLETE_SET' });
        } else {
          // Tick down the full duration timer for duration exercises
          while (state.screen === 'active' && state.timer.secondsRemaining > 0) {
            state = workoutReducer(state, { type: 'TIMER_TICK' });
          }
        }

        // Feedback: mark as completed with intensity 3
        state = dispatch(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
        state = dispatch(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 3 } });

        // If not last set/exercise, we'll be in rest — tick it down
        if (state.screen === 'rest') {
          while (state.timer.secondsRemaining > 0) {
            state = workoutReducer(state, { type: 'TIMER_TICK' });
          }
        }
      }
    }

    return state;
  }

  it('appends completed session to history', () => {
    const finalState = completeFullWorkout();
    expect(finalState.screen).toBe('congrats');
    expect(finalState.completedSession).not.toBeNull();

    // Simulate what usePersistence does
    storage.appendSession(finalState.completedSession!);
    storage.clearSession();

    const history = storage.loadHistory();
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0].id).toBe(finalState.sessionId);
    expect(history.sessions[0].results.length).toBe(9); // 3 exercises × 3 sets

    // Active session should be cleared
    expect(storage.loadSession()).toBeNull();
  });

  it('accumulates multiple sessions in history', () => {
    const s1 = completeFullWorkout();
    storage.appendSession(s1.completedSession!);

    const s2 = completeFullWorkout();
    storage.appendSession(s2.completedSession!);

    const history = storage.loadHistory();
    expect(history.sessions).toHaveLength(2);
  });
});

describe('Persistence: corrupt/missing storage does not crash', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('returns null for missing session', () => {
    expect(storage.loadSession()).toBeNull();
  });

  it('returns empty history for missing history', () => {
    const history = storage.loadHistory();
    expect(history).toEqual({ version: 1, sessions: [] });
  });

  it('returns null for corrupt session JSON', () => {
    storage.store.set('session', 'not valid json{{{');
    expect(storage.loadSession()).toBeNull();
  });

  it('returns empty history for corrupt history JSON', () => {
    storage.store.set('history', '!!!bad');
    expect(storage.loadHistory()).toEqual({ version: 1, sessions: [] });
  });

  it('returns null for valid JSON but wrong shape (session)', () => {
    storage.store.set('session', JSON.stringify({ foo: 'bar' }));
    expect(storage.loadSession()).toBeNull();
  });

  it('returns empty history for valid JSON but wrong shape (history)', () => {
    storage.store.set('history', JSON.stringify({ version: 2, data: [] }));
    expect(storage.loadHistory()).toEqual({ version: 1, sessions: [] });
  });

  it('returns null for session missing critical fields', () => {
    // Has screen but missing timer, template, etc.
    storage.store.set('session', JSON.stringify({
      screen: 'active',
      sessionId: 'abc',
    }));
    expect(storage.loadSession()).toBeNull();
  });
});
