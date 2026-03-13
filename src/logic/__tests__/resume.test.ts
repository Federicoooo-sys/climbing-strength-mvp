import { describe, it, expect } from 'vitest';
import { workoutReducer, createInitialState } from '../workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

/** Simulate saving state N milliseconds ago. */
function savedAgo(state: WorkoutState, ms: number): WorkoutState {
  return { ...state, lastSavedAt: Date.now() - ms };
}

/** Resume a saved state as if loading it now. */
function resume(savedState: WorkoutState): WorkoutState {
  return workoutReducer(createInitialState(MVP_WORKOUT), {
    type: 'RESUME_WORKOUT',
    payload: { savedState, now: Date.now() },
  });
}

/** Advance from welcome through countdown to active screen. */
function getToActive(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
  while (state.screen === 'countdown') {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  expect(state.screen).toBe('active');
  return state;
}

/** Advance to the feedback screen (after completing a set). */
function getToFeedback(): WorkoutState {
  const state = getToActive();
  return workoutReducer(state, { type: 'COMPLETE_SET' });
}

/** Advance to the rest screen. */
function getToRest(): WorkoutState {
  let state = getToFeedback();
  state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
  state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
  expect(state.screen).toBe('rest');
  return state;
}

/** Advance to the early stop screen. */
function getToEarlyStop(): WorkoutState {
  let state = getToFeedback();
  state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
  state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
  expect(state.screen).toBe('earlyStop');
  return state;
}

// ── Resume from countdown ────────────────────────────────────────

describe('Resume from countdown', () => {
  it('adjusts countdown timer for elapsed time', () => {
    const state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    expect(state.screen).toBe('countdown');
    expect(state.timer.secondsRemaining).toBe(3);

    // Saved 1 second ago → should have 2 seconds left
    const resumed = resume(savedAgo(state, 1_000));
    expect(resumed.screen).toBe('countdown');
    expect(resumed.timer.secondsRemaining).toBe(2);
    expect(resumed.timer.isRunning).toBe(true);
  });

  it('transitions to active if countdown expired while away', () => {
    const state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Saved 5 seconds ago — 3-second countdown fully expired
    const resumed = resume(savedAgo(state, 5_000));
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(true);
    expect(resumed.timer.secondsRemaining).toBeGreaterThan(0);
  });

  it('does NOT bump audioSignal when countdown expires on resume', () => {
    const state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    const initialSignal = state.audioSignal;

    const resumed = resume(savedAgo(state, 5_000));
    // No beep — countdown→active transition on resume is silent
    expect(resumed.audioSignal).toBe(initialSignal);
  });
});

// ── Resume from active ──────────────────────────────────────────

describe('Resume from active (running)', () => {
  it('adjusts active timer for elapsed time', () => {
    const state = getToActive();
    const originalRemaining = state.timer.secondsRemaining;

    // Saved 10 seconds ago
    const resumed = resume(savedAgo(state, 10_000));
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.secondsRemaining).toBe(originalRemaining - 10);
    expect(resumed.timer.isRunning).toBe(true);
  });

  it('transitions to feedback if active timer expired while away', () => {
    const state = getToActive();

    // Saved 120 seconds ago — well past the 60s time cap
    const resumed = resume(savedAgo(state, 120_000));
    expect(resumed.screen).toBe('feedback');
    expect(resumed.timer.isRunning).toBe(false);
  });

  it('does NOT bump audioSignal when active expires on resume', () => {
    const state = getToActive();
    const initialSignal = state.audioSignal;

    const resumed = resume(savedAgo(state, 120_000));
    expect(resumed.audioSignal).toBe(initialSignal);
  });
});

// ── Resume from active (paused) ─────────────────────────────────

describe('Resume from active (paused)', () => {
  it('restores paused state without timer adjustment', () => {
    let state = getToActive();
    const remaining = state.timer.secondsRemaining;
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    // Even if 30 seconds passed, timer should not change
    const resumed = resume(savedAgo(state, 30_000));
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.secondsRemaining).toBe(remaining);
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.pausedAt).not.toBeNull();
  });

  it('can unpause after resuming a paused state', () => {
    let state = getToActive();
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    const resumed = resume(savedAgo(state, 10_000));
    const unpaused = workoutReducer(resumed, { type: 'UNPAUSE' });

    expect(unpaused.timer.isRunning).toBe(true);
    expect(unpaused.pausedAt).toBeNull();
  });
});

// ── Resume from rest ────────────────────────────────────────────

describe('Resume from rest', () => {
  it('adjusts rest timer for elapsed time', () => {
    const state = getToRest();
    const originalRemaining = state.timer.secondsRemaining;

    // Saved 10 seconds ago
    const resumed = resume(savedAgo(state, 10_000));
    expect(resumed.screen).toBe('rest');
    expect(resumed.timer.secondsRemaining).toBe(originalRemaining - 10);
    expect(resumed.timer.isRunning).toBe(true);
  });

  it('transitions to active if rest timer expired while away', () => {
    const state = getToRest();

    // Saved 120 seconds ago — rest was 60s, fully expired
    const resumed = resume(savedAgo(state, 120_000));
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.isRunning).toBe(true);
  });

  it('does NOT bump audioSignal when rest expires on resume', () => {
    const state = getToRest();
    const initialSignal = state.audioSignal;

    const resumed = resume(savedAgo(state, 120_000));
    expect(resumed.audioSignal).toBe(initialSignal);
  });

  it('restores paused rest without timer adjustment', () => {
    let state = getToRest();
    const remaining = state.timer.secondsRemaining;
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    const resumed = resume(savedAgo(state, 30_000));
    expect(resumed.screen).toBe('rest');
    expect(resumed.timer.secondsRemaining).toBe(remaining);
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.pausedAt).not.toBeNull();
  });
});

// ── Resume from feedback ────────────────────────────────────────

describe('Resume from feedback', () => {
  it('restores feedback screen exactly as-is', () => {
    const state = getToFeedback();
    expect(state.screen).toBe('feedback');
    expect(state.feedbackStep).toBe('completed');

    const resumed = resume(savedAgo(state, 60_000));
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('completed');
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.pausedAt).toBeNull();
  });

  it('restores feedback mid-step (intensity step)', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: true },
    });
    expect(state.feedbackStep).toBe('intensity');

    const resumed = resume(savedAgo(state, 30_000));
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('intensity');
    expect(resumed.currentSetResult?.completed).toBe(true);
  });

  it('restores feedback mid-step (actual-count step)', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: false },
    });
    expect(state.feedbackStep).toBe('actual-count');

    const resumed = resume(savedAgo(state, 30_000));
    expect(resumed.screen).toBe('feedback');
    expect(resumed.feedbackStep).toBe('actual-count');
    expect(resumed.currentSetResult?.completed).toBe(false);
  });

  it('clears stale pausedAt when resuming feedback', () => {
    // Simulate: user paused during active → timer expired → entered feedback
    // The pausedAt from active might still be set in the saved state
    let state = getToActive();
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });
    // Force into feedback state (simulating what would happen if timer expired)
    const feedbackState: WorkoutState = {
      ...state,
      screen: 'feedback',
      timer: { secondsRemaining: 0, isRunning: false },
      feedbackStep: 'completed',
      currentSetResult: {
        exerciseId: 'pull-ups',
        exerciseIndex: 0,
        setIndex: 0,
        target: 4,
      },
      // pausedAt is stale — carried over from active
    };

    const resumed = resume(savedAgo(feedbackState, 10_000));
    expect(resumed.screen).toBe('feedback');
    expect(resumed.pausedAt).toBeNull();
  });
});

// ── Resume from earlyStop ───────────────────────────────────────

describe('Resume from earlyStop', () => {
  it('restores early stop screen exactly', () => {
    const state = getToEarlyStop();
    expect(state.failedSetsInExercise).toBe(1);

    const resumed = resume(savedAgo(state, 60_000));
    expect(resumed.screen).toBe('earlyStop');
    expect(resumed.failedSetsInExercise).toBe(1);
    expect(resumed.timer.isRunning).toBe(false);
    expect(resumed.pausedAt).toBeNull();
  });

  it('can accept early stop after resuming', () => {
    const state = getToEarlyStop();
    const resumed = resume(savedAgo(state, 30_000));

    const accepted = workoutReducer(resumed, { type: 'ACCEPT_EARLY_STOP' });
    expect(accepted.screen).toBe('rest');
    expect(accepted.exerciseIndex).toBe(1);
  });

  it('can decline early stop after resuming', () => {
    const state = getToEarlyStop();
    const resumed = resume(savedAgo(state, 30_000));

    const declined = workoutReducer(resumed, { type: 'DECLINE_EARLY_STOP' });
    expect(declined.screen).toBe('rest');
    expect(declined.exerciseIndex).toBe(0);
    expect(declined.setIndex).toBe(1);
  });
});

// ── Resume preserves workout progress ───────────────────────────

describe('Resume preserves workout progress', () => {
  it('preserves set results across resume', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    expect(state.setResults).toHaveLength(1);

    // Get to next active, then resume from there
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }

    const resumed = resume(savedAgo(state, 5_000));
    expect(resumed.setResults).toHaveLength(1);
    expect(resumed.setResults[0].exerciseId).toBe('pull-ups');
    expect(resumed.setResults[0].completed).toBe(true);
  });

  it('preserves adjusted targets across resume', () => {
    let state = getToFeedback();
    // Complete with low intensity → target increases
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 3 } });
    expect(state.currentTargets[0]).toBe(5); // was 4, +1

    const resumed = resume(savedAgo(state, 5_000));
    expect(resumed.currentTargets[0]).toBe(5);
  });

  it('preserves exercise and set index across resume', () => {
    let state = getToRest();
    expect(state.exerciseIndex).toBe(0);
    expect(state.setIndex).toBe(1);

    const resumed = resume(savedAgo(state, 5_000));
    expect(resumed.exerciseIndex).toBe(0);
    expect(resumed.setIndex).toBe(1);
  });

  it('preserves earlyStoppedExercises across resume', () => {
    let state = getToEarlyStop();
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });
    expect(state.earlyStoppedExercises).toContain('pull-ups');

    const resumed = resume(savedAgo(state, 5_000));
    expect(resumed.earlyStoppedExercises).toContain('pull-ups');
  });
});

// ── Edge cases ──────────────────────────────────────────────────

describe('Resume edge cases', () => {
  it('handles resume with 0ms elapsed (instant reload)', () => {
    const state = getToActive();
    const original = state.timer.secondsRemaining;

    // lastSavedAt is basically now — 0 elapsed
    const resumed = resume(state);
    expect(resumed.screen).toBe('active');
    expect(resumed.timer.secondsRemaining).toBe(original);
  });

  it('full workflow: resume → complete set → feedback → rest → next set', () => {
    // Resume an active set mid-timer
    const state = getToActive();
    const resumed = resume(savedAgo(state, 5_000));

    // Complete the set
    let current = workoutReducer(resumed, { type: 'COMPLETE_SET' });
    expect(current.screen).toBe('feedback');

    // Feedback
    current = reduce(current, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    current = reduce(current, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    expect(current.screen).toBe('rest');

    // Tick through rest
    while (current.screen === 'rest') {
      current = workoutReducer(current, { type: 'TIMER_TICK' });
    }
    expect(current.screen).toBe('active');
    expect(current.setIndex).toBe(1);
  });
});
