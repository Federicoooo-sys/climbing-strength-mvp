/**
 * Integration tests: simulate browser refresh during each screen.
 *
 * Each test follows the same pattern:
 *   1. Drive the reducer to a target screen
 *   2. Save state to localStorage (simulating usePersistence)
 *   3. "Refresh": load from localStorage (simulating a fresh app boot)
 *   4. Dispatch RESUME_WORKOUT with the loaded state
 *   5. Verify the resumed state matches the original — correct screen,
 *      correct timer, correct progress, no broken transitions
 *   6. Verify the user can continue the workout normally after resume
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { workoutReducer, createInitialState } from '../../logic/workoutReducer';
import { localStorageAdapter } from '../localStorage';
import { MVP_WORKOUT } from '../../data/exercises';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

/**
 * Simulate a full browser refresh:
 *   save → clear in-memory state → load from localStorage → resume.
 *
 * The `elapsedMs` parameter simulates time passing between the save
 * and the resume (e.g. user spent 5 seconds reloading the page).
 */
function simulateRefresh(state: WorkoutState, elapsedMs = 500): WorkoutState {
  // Save (what usePersistence does on every state change)
  localStorageAdapter.saveSession(state);

  // "Refresh" — load from storage as if the app just booted
  const loaded = localStorageAdapter.loadSession();
  expect(loaded).not.toBeNull();

  // Simulate a small amount of time passing during the refresh
  const now = Date.now() + elapsedMs;

  // Resume into a fresh reducer (as if the app just mounted)
  return workoutReducer(createInitialState(MVP_WORKOUT), {
    type: 'RESUME_WORKOUT',
    payload: { savedState: loaded!, now },
  });
}

/** Get to countdown screen. */
function getToCountdown(): WorkoutState {
  return reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
}

/** Get to active screen (past countdown). */
function getToActive(): WorkoutState {
  let state = getToCountdown();
  while (state.screen === 'countdown') {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  expect(state.screen).toBe('active');
  return state;
}

/** Get to feedback screen. */
function getToFeedback(): WorkoutState {
  const state = getToActive();
  return workoutReducer(state, { type: 'COMPLETE_SET' });
}

/** Get to rest screen. */
function getToRest(): WorkoutState {
  let state = getToFeedback();
  state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
  state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
  expect(state.screen).toBe('rest');
  return state;
}

// ── Tests ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// ── Refresh during countdown ────────────────────────────────────

describe('Refresh during countdown', () => {
  it('resumes on countdown with adjusted timer', () => {
    const state = getToCountdown();
    expect(state.screen).toBe('countdown');
    expect(state.timer.secondsRemaining).toBe(3);

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('countdown');
    expect(resumed.timer.isRunning).toBe(true);
    // Timer adjusted by ~0.5s (our simulated refresh time) — still > 0
    expect(resumed.timer.secondsRemaining).toBeGreaterThan(0);
    expect(resumed.timer.secondsRemaining).toBeLessThanOrEqual(3);
  });

  it('can continue from countdown to active after refresh', () => {
    const state = getToCountdown();
    let resumed = simulateRefresh(state);

    // Tick through remaining countdown
    while (resumed.screen === 'countdown') {
      resumed = workoutReducer(resumed, { type: 'TIMER_TICK' });
    }

    expect(resumed.screen).toBe('active');
    expect(resumed.exerciseIndex).toBe(0);
    expect(resumed.setIndex).toBe(0);
  });

  it('transitions to active if countdown expired during refresh', () => {
    const state = getToCountdown();
    // Simulate a 5-second refresh — countdown (3s) fully expires
    const resumed = simulateRefresh(state, 5_000);

    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(true);
    expect(resumed.timer.secondsRemaining).toBeGreaterThan(0);
  });
});

// ── Refresh during active set ───────────────────────────────────

describe('Refresh during active set', () => {
  it('resumes on active with adjusted timer', () => {
    const state = getToActive();
    const originalRemaining = state.timer.secondsRemaining;

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(true);
    expect(resumed.timer.secondsRemaining).toBeLessThanOrEqual(originalRemaining);
    expect(resumed.timer.secondsRemaining).toBeGreaterThan(0);
  });

  it('preserves exercise and set position', () => {
    const state = getToActive();
    const resumed = simulateRefresh(state);

    expect(resumed.exerciseIndex).toBe(state.exerciseIndex);
    expect(resumed.setIndex).toBe(state.setIndex);
  });

  it('can complete a set normally after refresh', () => {
    const state = getToActive();
    let resumed = simulateRefresh(state);

    // Tap Done
    resumed = workoutReducer(resumed, { type: 'COMPLETE_SET' });
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('completed');

    // Complete feedback → rest
    resumed = reduce(resumed, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    resumed = reduce(resumed, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    expect(resumed.screen).toBe('rest');
    expect(resumed.setResults).toHaveLength(1);
  });

  it('does not produce a stale beep (audioSignal unchanged)', () => {
    const state = getToActive();
    const signalBefore = state.audioSignal;

    const resumed = simulateRefresh(state);
    expect(resumed.audioSignal).toBe(signalBefore);
  });
});

// ── Refresh during feedback ─────────────────────────────────────

describe('Refresh during feedback', () => {
  it('resumes on completed question step', () => {
    const state = getToFeedback();
    expect(state.feedbackStep).toBe('completed');

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('completed');
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.pausedAt).toBeNull();
  });

  it('resumes on intensity step', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: true },
    });
    expect(state.feedbackStep).toBe('intensity');

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('intensity');
    expect(resumed.currentSetResult?.completed).toBe(true);
  });

  it('resumes on actual-count step', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: false },
    });
    expect(state.feedbackStep).toBe('actual-count');

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('actual-count');
    expect(resumed.currentSetResult?.completed).toBe(false);
  });

  it('can submit feedback normally after refresh', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: true },
    });

    let resumed = simulateRefresh(state);
    resumed = reduce(resumed, { type: 'SUBMIT_FEEDBACK', payload: { value: 7 } });

    expect(resumed.screen).toBe('rest');
    expect(resumed.setResults).toHaveLength(1);
    expect(resumed.setResults[0].completed).toBe(true);
    expect(resumed.setResults[0].intensity).toBe(7);
  });
});

// ── Refresh during rest ─────────────────────────────────────────

describe('Refresh during rest', () => {
  it('resumes on rest with adjusted timer', () => {
    const state = getToRest();
    const originalRemaining = state.timer.secondsRemaining;

    const resumed = simulateRefresh(state);
    expect(resumed.screen).toBe('rest');
    expect(resumed.timer.isRunning).toBe(true);
    expect(resumed.timer.secondsRemaining).toBeLessThanOrEqual(originalRemaining);
    expect(resumed.timer.secondsRemaining).toBeGreaterThan(0);
  });

  it('preserves set results from before rest', () => {
    const state = getToRest();
    expect(state.setResults).toHaveLength(1);

    const resumed = simulateRefresh(state);
    expect(resumed.setResults).toHaveLength(1);
    expect(resumed.setResults[0].exerciseId).toBe('pull-ups');
  });

  it('can tick through rest to next set after refresh', () => {
    const state = getToRest();
    let resumed = simulateRefresh(state);

    while (resumed.screen === 'rest') {
      resumed = workoutReducer(resumed, { type: 'TIMER_TICK' });
    }

    expect(resumed.screen).toBe('active');
    expect(resumed.exerciseIndex).toBe(0);
    expect(resumed.setIndex).toBe(1);
  });

  it('transitions to active if rest expired during refresh', () => {
    const state = getToRest();

    // Simulate a very long refresh — rest (60s) fully expires
    const resumed = simulateRefresh(state, 120_000);
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(true);
  });

  it('does not produce a stale beep when rest expires during refresh', () => {
    const state = getToRest();
    const signalBefore = state.audioSignal;

    const resumed = simulateRefresh(state, 120_000);
    expect(resumed.audioSignal).toBe(signalBefore);
  });
});

// ── Refresh while paused ────────────────────────────────────────

describe('Refresh while paused', () => {
  it('resumes paused active set with frozen timer', () => {
    let state = getToActive();
    const remaining = state.timer.secondsRemaining;
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    // Even with 30 seconds of "refresh" time, timer should not change
    const resumed = simulateRefresh(state, 30_000);
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.timer.secondsRemaining).toBe(remaining);
    expect(resumed.pausedAt).not.toBeNull();
  });

  it('resumes paused rest with frozen timer', () => {
    let state = getToRest();
    const remaining = state.timer.secondsRemaining;
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    const resumed = simulateRefresh(state, 30_000);
    expect(resumed.screen).toBe('rest');
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.timer.secondsRemaining).toBe(remaining);
    expect(resumed.pausedAt).not.toBeNull();
  });

  it('can unpause and continue after refresh', () => {
    let state = getToActive();
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    let resumed = simulateRefresh(state);
    expect(resumed.timer.isRunning).toBe(false);

    // Unpause
    resumed = workoutReducer(resumed, { type: 'UNPAUSE' });
    expect(resumed.timer.isRunning).toBe(true);
    expect(resumed.pausedAt).toBeNull();

    // Complete the set
    resumed = workoutReducer(resumed, { type: 'COMPLETE_SET' });
    expect(resumed.screen).toBe('feedback');
  });
});

// ── Never jumps to wrong state ──────────────────────────────────

describe('Refresh never jumps to wrong state', () => {
  it('countdown does not skip to feedback', () => {
    const state = getToCountdown();
    const resumed = simulateRefresh(state, 5_000);
    // Countdown expires → active (not feedback or rest)
    expect(resumed.screen).toBe('active');
  });

  it('active does not skip to rest', () => {
    const state = getToActive();
    // Even if timer fully expires, goes to feedback (not rest)
    const resumed = simulateRefresh(state, 120_000);
    expect(resumed.screen).toBe('feedback');
  });

  it('rest does not skip to feedback', () => {
    const state = getToRest();
    // Rest expires → active (not feedback or congrats)
    const resumed = simulateRefresh(state, 120_000);
    expect(resumed.screen).toBe('active');
  });

  it('feedback does not change to any other screen on refresh', () => {
    const state = getToFeedback();
    // Feedback has no timer — should stay on feedback regardless of time
    const resumed = simulateRefresh(state, 600_000);
    expect(resumed.screen).toBe('feedback');
  });

  it('early stop does not change on refresh', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
    expect(state.screen).toBe('earlyStop');

    const resumed = simulateRefresh(state, 600_000);
    expect(resumed.screen).toBe('earlyStop');
  });

  it('paused active does not advance even after long absence', () => {
    let state = getToActive();
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    // Gone for 10 minutes — timer was paused, should not advance
    const resumed = simulateRefresh(state, 600_000);
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(false);
  });
});
