/**
 * Edge case tests covering:
 *   - Repeated skip taps (rapid, past zero, while paused)
 *   - Invalid / zero partial-completion input
 *   - Two failed sets → auto-recommended early stop
 *   - Early-stop continue path and skip path
 *   - Refresh in unusual screens (earlyStop, mid-feedback)
 *   - Full workout still completes after edge-case scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { workoutReducer, createInitialState } from '../workoutReducer';
import { localStorageAdapter } from '../../storage/localStorage';
import { MVP_WORKOUT } from '../../data/exercises';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

function tickThrough(state: WorkoutState, targetScreen: string): WorkoutState {
  while (state.screen === 'countdown' || state.screen === 'rest') {
    if (state.screen === targetScreen) break;
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  return state;
}

function getToActive(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
  while (state.screen === 'countdown') {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  expect(state.screen).toBe('active');
  return state;
}

function getToFeedback(): WorkoutState {
  return workoutReducer(getToActive(), { type: 'COMPLETE_SET' });
}

function getToRest(): WorkoutState {
  let state = getToFeedback();
  state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
  state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
  expect(state.screen).toBe('rest');
  return state;
}

function failSet(state: WorkoutState): WorkoutState {
  if (state.screen === 'active') {
    state = workoutReducer(state, { type: 'COMPLETE_SET' });
  }
  state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
  state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
  return state;
}

function simulateRefresh(state: WorkoutState, elapsedMs = 500): WorkoutState {
  localStorageAdapter.saveSession(state);
  const loaded = localStorageAdapter.loadSession()!;
  return workoutReducer(createInitialState(MVP_WORKOUT), {
    type: 'RESUME_WORKOUT',
    payload: { savedState: loaded, now: Date.now() + elapsedMs },
  });
}

// ── Repeated skip taps ──────────────────────────────────────────

describe('Repeated skip taps', () => {
  it('multiple rapid skips subtract 15s each', () => {
    const state = getToRest();
    const initial = state.timer.secondsRemaining; // 60

    const after1 = workoutReducer(state, { type: 'SKIP_REST' });
    expect(after1.timer.secondsRemaining).toBe(initial - 15);

    const after2 = workoutReducer(after1, { type: 'SKIP_REST' });
    expect(after2.timer.secondsRemaining).toBe(initial - 30);

    const after3 = workoutReducer(after2, { type: 'SKIP_REST' });
    expect(after3.timer.secondsRemaining).toBe(initial - 45);
  });

  it('skipping past zero transitions to active (never goes negative)', () => {
    let state = getToRest();
    // 60s rest: skip 4 times → 60-15-15-15-15 = 0 → active
    state = reduce(state,
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
    );
    expect(state.screen).toBe('active');
    expect(state.timer.secondsRemaining).toBeGreaterThan(0);
    expect(state.timer.isRunning).toBe(true);
  });

  it('extra skip taps after transitioning to active are ignored', () => {
    let state = getToRest();
    // Skip until active
    state = reduce(state,
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
    );
    expect(state.screen).toBe('active');

    // More skips do nothing (screen guard)
    const before = { ...state };
    state = workoutReducer(state, { type: 'SKIP_REST' });
    expect(state.screen).toBe('active');
    expect(state.timer.secondsRemaining).toBe(before.timer.secondsRemaining);
  });

  it('skip is blocked while paused', () => {
    let state = getToRest();
    const remaining = state.timer.secondsRemaining;

    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });
    state = workoutReducer(state, { type: 'SKIP_REST' });

    expect(state.screen).toBe('rest');
    expect(state.timer.secondsRemaining).toBe(remaining);
  });

  it('skip works again after unpausing', () => {
    let state = getToRest();
    const remaining = state.timer.secondsRemaining;

    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });
    state = workoutReducer(state, { type: 'SKIP_REST' }); // blocked
    expect(state.timer.secondsRemaining).toBe(remaining);

    state = workoutReducer(state, { type: 'UNPAUSE' });
    state = workoutReducer(state, { type: 'SKIP_REST' }); // works
    expect(state.timer.secondsRemaining).toBe(remaining - 15);
  });

  it('pausedAt is cleared when skip transitions to active', () => {
    let state = getToRest();
    // Skip all the way to 15 remaining
    state = reduce(state,
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
      { type: 'SKIP_REST' },
    );
    expect(state.timer.secondsRemaining).toBe(15);

    // Last skip → active
    state = workoutReducer(state, { type: 'SKIP_REST' });
    expect(state.screen).toBe('active');
    expect(state.pausedAt).toBeNull();
  });
});

// ── Invalid and zero partial-completion input ───────────────────

describe('Partial-completion and zero input', () => {
  it('submitting actual = 0 creates a failed set and triggers early stop', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });

    expect(state.screen).toBe('earlyStop');
    expect(state.setResults).toHaveLength(1);
    expect(state.setResults[0].failed).toBe(true);
    expect(state.setResults[0].actual).toBe(0);
    expect(state.setResults[0].completed).toBe(false);
    expect(state.setResults[0].intensity).toBeNull();
  });

  it('submitting actual = 1 (partial, not failed) goes to rest', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 1 } });

    expect(state.screen).toBe('rest');
    expect(state.setResults[0].failed).toBe(false);
    expect(state.setResults[0].actual).toBe(1);
    expect(state.setResults[0].completed).toBe(false);
    // Target adjusts down to actual
    expect(state.currentTargets[0]).toBe(1);
  });

  it('submitting actual = target-1 is partial, not completed', () => {
    let state = getToFeedback();
    const target = state.currentSetResult!.target!; // 4
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: target - 1 } });

    expect(state.setResults[0].completed).toBe(false);
    expect(state.setResults[0].actual).toBe(target - 1);
    expect(state.currentTargets[0]).toBe(target - 1);
  });

  it('completing with intensity 1 (lowest) still increases target', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 1 } });

    // Intensity < 5 + completed → target +1 (was 4 → 5)
    expect(state.currentTargets[0]).toBe(5);
  });

  it('completing with intensity 10 (highest) keeps target unchanged', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 10 } });

    expect(state.currentTargets[0]).toBe(4); // unchanged
  });
});

// ── Two failed sets → auto-recommended early stop ───────────────

describe('Two failed sets in same exercise', () => {
  it('first failure shows manual early stop (failedSetsInExercise = 1)', () => {
    let state = getToActive();
    state = failSet(state);

    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(1);
  });

  it('second failure shows recommended early stop (failedSetsInExercise = 2)', () => {
    let state = getToActive();

    // Fail set 1 → early stop → decline → rest → active
    state = failSet(state);
    expect(state.screen).toBe('earlyStop');
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.screen).toBe('active');

    // Fail set 2
    state = failSet(state);
    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(2);
  });

  it('failed set counter resets when moving to next exercise', () => {
    let state = getToActive();

    // Fail set 1 → accept early stop → rest → next exercise
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    // Tick through rest to ring rows
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }

    expect(state.screen).toBe('active');
    expect(state.exerciseIndex).toBe(1); // ring rows
    expect(state.failedSetsInExercise).toBe(0); // reset
  });
});

// ── Early-stop continue path ────────────────────────────────────

describe('Early-stop continue (decline) path', () => {
  it('declining advances to next set of same exercise via rest', () => {
    let state = getToActive();
    state = failSet(state);
    expect(state.screen).toBe('earlyStop');
    expect(state.exerciseIndex).toBe(0);
    expect(state.setIndex).toBe(0);

    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(0);
    expect(state.setIndex).toBe(1);
  });

  it('can complete the remaining sets normally after declining', () => {
    let state = getToActive();
    state = failSet(state);
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });

    // Rest → active (set 2)
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.screen).toBe('active');
    expect(state.setIndex).toBe(1);

    // Complete set 2 normally
    state = workoutReducer(state, { type: 'COMPLETE_SET' });
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    expect(state.screen).toBe('rest');
    expect(state.setResults).toHaveLength(2);
  });

  it('failing again after decline triggers early stop again', () => {
    let state = getToActive();

    // Fail set 1, decline
    state = failSet(state);
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }

    // Fail set 2
    state = failSet(state);
    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(2);

    // Decline again
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }

    // Fail set 3 — last set, so no early stop, goes to rest (next exercise)
    state = failSet(state);
    // Last set of exercise: no more sets to skip → goes to next exercise
    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(1);
  });
});

// ── Early-stop skip path ────────────────────────────────────────

describe('Early-stop skip (accept) path', () => {
  it('accepting skips to next exercise via rest', () => {
    let state = getToActive();
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(1); // ring rows
    expect(state.setIndex).toBe(0);
    expect(state.earlyStoppedExercises).toContain('pull-ups');
  });

  it('accepting on last exercise ends workout', () => {
    let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Complete pull-ups and ring rows normally (6 sets)
    for (let i = 0; i < 6; i++) {
      while (state.screen === 'countdown' || state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
      state = workoutReducer(state, { type: 'COMPLETE_SET' });
      state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    }

    // Now on dead hangs (last exercise) — tick through rest and countdown
    while (state.screen === 'rest' || state.screen === 'countdown') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.exerciseIndex).toBe(2);
    expect(state.screen).toBe('active');

    // Fail dead hangs set 1 by ending immediately (0 elapsed = failed)
    state = workoutReducer(state, { type: 'END_DURATION_SET' });
    expect(state.screen).toBe('earlyStop');

    // Accept → workout complete (no more exercises)
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });
    expect(state.screen).toBe('congrats');
    expect(state.earlyStoppedExercises).toContain('dead-hangs');
  });

  it('early-stopped exercises are tracked cumulatively', () => {
    let state = getToActive();

    // Early-stop pull-ups
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    // Rest → ring rows
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.exerciseIndex).toBe(1);

    // Early-stop ring rows
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    expect(state.earlyStoppedExercises).toEqual(['pull-ups', 'ring-rows']);
  });
});

// ── Refresh in unusual places ───────────────────────────────────

describe('Refresh in unusual places', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('refresh during early stop screen', () => {
    let state = getToActive();
    state = failSet(state);
    expect(state.screen).toBe('earlyStop');

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('earlyStop');
    expect(resumed.failedSetsInExercise).toBe(1);
    expect(resumed.pausedAt).toBeNull();

    // Can still accept after refresh
    const accepted = workoutReducer(resumed, { type: 'ACCEPT_EARLY_STOP' });
    expect(accepted.screen).toBe('rest');
    expect(accepted.exerciseIndex).toBe(1);
  });

  it('refresh during feedback actual-count step', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: false },
    });
    expect(state.feedbackStep).toBe('actual-count');

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('actual-count');

    // Can still submit after refresh
    const submitted = reduce(resumed, { type: 'SUBMIT_FEEDBACK', payload: { value: 2 } });
    expect(submitted.screen).toBe('rest');
    expect(submitted.setResults[0].actual).toBe(2);
  });

  it('refresh during paused rest', () => {
    let state = getToRest();
    const remaining = state.timer.secondsRemaining;
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    const resumed = simulateRefresh(state, 30_000);
    expect(resumed.screen).toBe('rest');
    expect(resumed.timer.secondsRemaining).toBe(remaining); // not adjusted
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.pausedAt).not.toBeNull();
  });

  it('refresh after early-stop accept during rest to next exercise', () => {
    let state = getToActive();
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });
    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(1);

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('rest');
    expect(resumed.exerciseIndex).toBe(1);
    expect(resumed.earlyStoppedExercises).toContain('pull-ups');

    // Tick to active
    let current = resumed;
    while (current.screen === 'rest') {
      current = workoutReducer(current, { type: 'TIMER_TICK' });
    }
    expect(current.screen).toBe('active');
    expect(current.exerciseIndex).toBe(1);
  });
});

// ── End-of-workout still works after edge cases ─────────────────

describe('End-of-workout after edge-case scenarios', () => {
  it('completes workout after early-stopping first exercise', () => {
    let state = getToActive();

    // Early-stop pull-ups
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    // Complete ring rows (3 sets) and dead hangs (3 sets) normally
    for (let i = 0; i < 6; i++) {
      while (state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
      expect(state.screen).toBe('active');

      const exercise = MVP_WORKOUT.exercises[state.exerciseIndex];
      if (exercise.type === 'reps') {
        state = workoutReducer(state, { type: 'COMPLETE_SET' });
      } else {
        while (state.screen === 'active') {
          state = workoutReducer(state, { type: 'TIMER_TICK' });
        }
      }

      state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    }

    expect(state.screen).toBe('congrats');
    expect(state.completedSession).not.toBeNull();
    expect(state.earlyStoppedExercises).toEqual(['pull-ups']);
    // 1 failed pull-ups + 6 normal = 7 set results
    expect(state.setResults).toHaveLength(7);
  });

  it('completes workout after partial completions and declined early stops', () => {
    let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    for (let exIdx = 0; exIdx < 3; exIdx++) {
      const exercise = MVP_WORKOUT.exercises[exIdx];
      for (let setIdx = 0; setIdx < exercise.sets; setIdx++) {
        while (state.screen === 'countdown' || state.screen === 'rest') {
          state = workoutReducer(state, { type: 'TIMER_TICK' });
        }

        if (exercise.type === 'reps') {
          state = workoutReducer(state, { type: 'COMPLETE_SET' });
        } else {
          while (state.screen === 'active') {
            state = workoutReducer(state, { type: 'TIMER_TICK' });
          }
        }

        // First set of each exercise: partial completion (not failed)
        if (setIdx === 0) {
          state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
          state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 1 } });
        } else {
          state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
          state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
        }
      }
    }

    expect(state.screen).toBe('congrats');
    expect(state.setResults).toHaveLength(9);
    // First set of each exercise was partial
    expect(state.setResults[0].completed).toBe(false);
    expect(state.setResults[0].actual).toBe(1);
  });

  it('congrats → summary → reset cycle works after edge cases', () => {
    let state = getToActive();

    // Early-stop pull-ups
    state = failSet(state);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    // Complete remaining 6 sets
    for (let i = 0; i < 6; i++) {
      while (state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
      const exercise = MVP_WORKOUT.exercises[state.exerciseIndex];
      if (exercise.type === 'reps') {
        state = workoutReducer(state, { type: 'COMPLETE_SET' });
      } else {
        while (state.screen === 'active') {
          state = workoutReducer(state, { type: 'TIMER_TICK' });
        }
      }
      state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    }

    expect(state.screen).toBe('congrats');

    // View summary
    state = workoutReducer(state, { type: 'VIEW_SUMMARY' });
    expect(state.screen).toBe('summary');

    // Reset
    state = workoutReducer(state, { type: 'RESET' });
    expect(state.screen).toBe('welcome');
    expect(state.setResults).toHaveLength(0);
    expect(state.earlyStoppedExercises).toHaveLength(0);
    expect(state.exerciseIndex).toBe(0);
    expect(state.setIndex).toBe(0);
    expect(state.failedSetsInExercise).toBe(0);
    expect(state.completedSession).toBeNull();
    expect(state.currentTargets).toEqual([4, 6, 60]); // defaults
  });
});
