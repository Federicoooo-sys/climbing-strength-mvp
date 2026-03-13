import { describe, it, expect } from 'vitest';
import { workoutReducer, createInitialState } from '../workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

/** Get to active screen for the first set of pull-ups. */
function getToFirstActive(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
  while (state.screen === 'countdown') {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  expect(state.screen).toBe('active');
  return state;
}

/** Complete a set and submit feedback in one go. */
function completeSetWithFeedback(
  state: WorkoutState,
  completed: boolean,
  value: number,
): WorkoutState {
  state = workoutReducer(state, { type: 'COMPLETE_SET' });
  state = workoutReducer(state, {
    type: 'ADVANCE_FEEDBACK',
    payload: { completed },
  });
  state = workoutReducer(state, {
    type: 'SUBMIT_FEEDBACK',
    payload: { value },
  });
  return state;
}

/** Tick through rest to reach next active set. */
function tickThroughRest(state: WorkoutState): WorkoutState {
  while (state.screen === 'rest') {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  return state;
}

// ── Success path: target progression ─────────────────────────────

describe('Success path updates next target correctly', () => {
  it('reps: intensity < 5 → next target +1', () => {
    let state = getToFirstActive();
    // Pull-ups default target = 4
    expect(state.currentTargets[0]).toBe(4);

    state = completeSetWithFeedback(state, true, 3); // intensity 3
    expect(state.screen).toBe('rest');
    expect(state.currentTargets[0]).toBe(5); // 4 + 1
  });

  it('reps: intensity >= 5 → next target unchanged', () => {
    let state = getToFirstActive();
    expect(state.currentTargets[0]).toBe(4);

    state = completeSetWithFeedback(state, true, 7); // intensity 7
    expect(state.screen).toBe('rest');
    expect(state.currentTargets[0]).toBe(4); // unchanged
  });

  it('reps: intensity exactly 5 → next target unchanged', () => {
    let state = getToFirstActive();
    state = completeSetWithFeedback(state, true, 5);
    expect(state.currentTargets[0]).toBe(4); // unchanged
  });

  it('progression carries forward across sets', () => {
    let state = getToFirstActive();
    // Set 1: success, intensity 2 → target becomes 5
    state = completeSetWithFeedback(state, true, 2);
    expect(state.currentTargets[0]).toBe(5);

    // Rest → active
    state = tickThroughRest(state);
    expect(state.screen).toBe('active');
    expect(state.setIndex).toBe(1);

    // Set 2: success, intensity 3 → target becomes 6
    state = completeSetWithFeedback(state, true, 3);
    expect(state.currentTargets[0]).toBe(6);
  });
});

// ── Failure path: target adjustment ──────────────────────────────

describe('Failure path updates next target correctly', () => {
  it('partial completion → next target becomes actual', () => {
    let state = getToFirstActive();
    expect(state.currentTargets[0]).toBe(4);

    // Did not complete, actual = 2
    state = completeSetWithFeedback(state, false, 2);
    expect(state.screen).toBe('rest');
    expect(state.currentTargets[0]).toBe(2); // became actual
  });

  it('partial completion carries forward', () => {
    let state = getToFirstActive();

    // Set 1: partial, actual = 2 → target becomes 2
    state = completeSetWithFeedback(state, false, 2);
    expect(state.currentTargets[0]).toBe(2);

    state = tickThroughRest(state);

    // Set 2: success with low intensity → target becomes 3 (2 + 1)
    state = completeSetWithFeedback(state, true, 2);
    expect(state.currentTargets[0]).toBe(3);
  });
});

// ── Entering 0 counts as failed ──────────────────────────────────

describe('Entering 0 counts as failed', () => {
  it('actual = 0 triggers early-stop screen', () => {
    let state = getToFirstActive();
    state = completeSetWithFeedback(state, false, 0);
    expect(state.screen).toBe('earlyStop');
  });

  it('actual = 0 increments failedSetsInExercise', () => {
    let state = getToFirstActive();
    expect(state.failedSetsInExercise).toBe(0);

    state = completeSetWithFeedback(state, false, 0);
    expect(state.failedSetsInExercise).toBe(1);
  });

  it('actual = 0 sets target to 0 for next set', () => {
    let state = getToFirstActive();
    state = completeSetWithFeedback(state, false, 0);
    expect(state.currentTargets[0]).toBe(0);
  });

  it('actual = 1 is NOT treated as failed (no early-stop)', () => {
    let state = getToFirstActive();
    state = completeSetWithFeedback(state, false, 1);
    // Partial but not failed → goes to rest, not earlyStop
    expect(state.screen).toBe('rest');
  });
});

// ── Two failed sets triggers auto early-stop recommendation ──────

describe('Two failed sets triggers auto early-stop recommendation', () => {
  it('second failed set shows earlyStop with failedSetsInExercise = 2', () => {
    let state = getToFirstActive();

    // Fail set 1
    state = completeSetWithFeedback(state, false, 0);
    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(1);

    // Decline → rest → active
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    state = tickThroughRest(state);
    expect(state.screen).toBe('active');

    // Fail set 2
    state = completeSetWithFeedback(state, false, 0);
    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(2);
  });

  it('failedSetsInExercise resets when moving to next exercise', () => {
    let state = getToFirstActive();

    // Fail set 1 → accept early stop → moves to next exercise
    state = completeSetWithFeedback(state, false, 0);
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    expect(state.exerciseIndex).toBe(1); // ring rows
    expect(state.failedSetsInExercise).toBe(0); // reset
  });
});

// ── Manual early-stop appears after failed set ───────────────────

describe('Manual early-stop appears after failed set', () => {
  it('appears after first failed set (not just after 2)', () => {
    let state = getToFirstActive();
    state = completeSetWithFeedback(state, false, 0);

    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(1);
  });

  it('does NOT appear on last set of exercise (no sets to skip)', () => {
    let state = getToFirstActive();

    // Complete sets 1 and 2 normally
    for (let i = 0; i < 2; i++) {
      state = completeSetWithFeedback(state, true, 5);
      state = tickThroughRest(state);
    }
    expect(state.setIndex).toBe(2); // last set

    // Fail the last set → should go to rest/next exercise, not early stop
    state = completeSetWithFeedback(state, false, 0);
    // No more sets to skip, so it goes to rest (next exercise) not earlyStop
    expect(state.screen).not.toBe('earlyStop');
  });

  it('does NOT appear for partial completion (only for actual = 0)', () => {
    let state = getToFirstActive();
    state = completeSetWithFeedback(state, false, 2); // partial, not failed
    expect(state.screen).toBe('rest'); // no early stop offered
  });
});

// ── Continuing after early-stop decline still works ──────────────

describe('Continuing after declining early-stop', () => {
  it('advances to next set with rest period', () => {
    let state = getToFirstActive();

    // Fail → early stop → decline
    state = completeSetWithFeedback(state, false, 0);
    expect(state.screen).toBe('earlyStop');
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });

    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(0); // same exercise
    expect(state.setIndex).toBe(1); // next set
    expect(state.timer.isRunning).toBe(true);
  });

  it('can complete remaining sets after declining', () => {
    let state = getToFirstActive();

    // Fail set 1 → decline early stop
    state = completeSetWithFeedback(state, false, 0);
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    state = tickThroughRest(state);

    // Complete set 2 successfully
    expect(state.screen).toBe('active');
    expect(state.setIndex).toBe(1);
    state = completeSetWithFeedback(state, true, 5);
    expect(state.screen).toBe('rest');

    // Complete set 3
    state = tickThroughRest(state);
    expect(state.setIndex).toBe(2);
    state = completeSetWithFeedback(state, true, 5);

    // Should move to rest → next exercise (ring rows)
    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(1);
  });

  it('can fail again after declining and get second recommendation', () => {
    let state = getToFirstActive();

    // Fail set 1 → decline
    state = completeSetWithFeedback(state, false, 0);
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    state = tickThroughRest(state);

    // Fail set 2
    state = completeSetWithFeedback(state, false, 0);
    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(2); // auto-recommendation threshold
  });

  it('accepting early stop on last exercise completes workout', () => {
    let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Complete all pull-ups and ring rows
    for (let i = 0; i < 6; i++) {
      while (state.screen === 'countdown') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
      state = workoutReducer(state, { type: 'COMPLETE_SET' });
      state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
      while (state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
    }

    // Now on dead hangs — tick through countdown to active
    expect(state.exerciseIndex).toBe(2);
    while (state.screen === 'countdown') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.screen).toBe('active');

    // Fail dead hangs set 1 by ending immediately (0 elapsed seconds)
    state = workoutReducer(state, { type: 'END_DURATION_SET' });
    expect(state.screen).toBe('earlyStop');

    // Accept → last exercise, so workout complete
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });
    expect(state.screen).toBe('congrats');
    expect(state.earlyStoppedExercises).toContain('dead-hangs');
  });
});
