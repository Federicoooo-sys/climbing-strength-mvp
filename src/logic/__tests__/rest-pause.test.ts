import { describe, it, expect } from 'vitest';
import { workoutReducer, createInitialState } from '../workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

function tickThrough(state: WorkoutState, screen: string): WorkoutState {
  while (state.screen === screen) {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  return state;
}

/** Get to the first active set (pull-ups). */
function getToActive(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
  return tickThrough(state, 'countdown');
}

/** Complete a set and submit success feedback → enters rest. */
function completeSetToRest(state: WorkoutState): WorkoutState {
  state = workoutReducer(state, { type: 'COMPLETE_SET' });
  state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
  state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
  expect(state.screen).toBe('rest');
  return state;
}

// ── Rest only starts after feedback is done ──────────────────────

describe('Rest only starts after feedback is complete', () => {
  it('timer is stopped during feedback', () => {
    let state = getToActive();
    state = workoutReducer(state, { type: 'COMPLETE_SET' });
    expect(state.screen).toBe('feedback');
    expect(state.timer.isRunning).toBe(false);
    expect(state.timer.secondsRemaining).toBe(0);
  });

  it('timer stays stopped through all feedback steps', () => {
    let state = getToActive();
    state = workoutReducer(state, { type: 'COMPLETE_SET' });

    // Step 1: completed question
    expect(state.timer.isRunning).toBe(false);
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });

    // Step 2: intensity
    expect(state.screen).toBe('feedback');
    expect(state.timer.isRunning).toBe(false);
  });

  it('rest timer starts immediately after submit', () => {
    let state = getToActive();
    state = completeSetToRest(state);

    expect(state.screen).toBe('rest');
    expect(state.timer.isRunning).toBe(true);
    expect(state.timer.secondsRemaining).toBe(60); // restBetweenSetsSec for pull-ups
  });
});

// ── Pause works during rest ──────────────────────────────────────

describe('Pause works during rest', () => {
  it('pausing stops the rest timer', () => {
    let state = getToActive();
    state = completeSetToRest(state);
    const beforePause = state.timer.secondsRemaining;

    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });

    expect(state.timer.isRunning).toBe(false);
    expect(state.pausedAt).not.toBeNull();
    expect(state.timer.secondsRemaining).toBe(beforePause);
  });

  it('TIMER_TICK does nothing while paused', () => {
    let state = getToActive();
    state = completeSetToRest(state);
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });
    const frozen = state.timer.secondsRemaining;

    state = reduce(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });

    expect(state.timer.secondsRemaining).toBe(frozen);
  });

  it('unpausing resumes the rest timer', () => {
    let state = getToActive();
    state = completeSetToRest(state);
    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });
    state = workoutReducer(state, { type: 'UNPAUSE' });

    expect(state.timer.isRunning).toBe(true);
    expect(state.pausedAt).toBeNull();
  });

  it('timer continues ticking after unpause', () => {
    let state = getToActive();
    state = completeSetToRest(state);
    const initial = state.timer.secondsRemaining;

    state = workoutReducer(state, { type: 'PAUSE', payload: { now: Date.now() } });
    state = workoutReducer(state, { type: 'UNPAUSE' });
    state = workoutReducer(state, { type: 'TIMER_TICK' });

    expect(state.timer.secondsRemaining).toBe(initial - 1);
  });
});

// ── Repeated skip taps ───────────────────────────────────────────

describe('Repeated skip taps work correctly', () => {
  it('single skip subtracts 15 seconds', () => {
    let state = getToActive();
    state = completeSetToRest(state);
    expect(state.timer.secondsRemaining).toBe(60);

    state = workoutReducer(state, { type: 'SKIP_REST' });
    expect(state.timer.secondsRemaining).toBe(45);
    expect(state.screen).toBe('rest');
  });

  it('multiple skips subtract 15 each', () => {
    let state = getToActive();
    state = completeSetToRest(state);

    state = workoutReducer(state, { type: 'SKIP_REST' }); // 60 → 45
    state = workoutReducer(state, { type: 'SKIP_REST' }); // 45 → 30
    state = workoutReducer(state, { type: 'SKIP_REST' }); // 30 → 15

    expect(state.timer.secondsRemaining).toBe(15);
    expect(state.screen).toBe('rest');
  });

  it('skip that reaches zero transitions to active immediately', () => {
    let state = getToActive();
    state = completeSetToRest(state);

    state = workoutReducer(state, { type: 'SKIP_REST' }); // 60 → 45
    state = workoutReducer(state, { type: 'SKIP_REST' }); // 45 → 30
    state = workoutReducer(state, { type: 'SKIP_REST' }); // 30 → 15
    state = workoutReducer(state, { type: 'SKIP_REST' }); // 15 → 0 → active

    expect(state.screen).toBe('active');
  });

  it('skip cannot go below zero', () => {
    let state = getToActive();
    state = completeSetToRest(state);

    // Tick down to 10 seconds remaining
    for (let i = 0; i < 50; i++) {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.timer.secondsRemaining).toBe(10);

    // Skip 15 from 10 → goes to active (not negative)
    state = workoutReducer(state, { type: 'SKIP_REST' });
    expect(state.screen).toBe('active');
    expect(state.timer.secondsRemaining).toBeGreaterThanOrEqual(0);
  });
});

// ── Transition to next set / next exercise ───────────────────────

describe('Transition to next set is correct', () => {
  it('rest expiry within same exercise advances set index', () => {
    let state = getToActive();
    expect(state.exerciseIndex).toBe(0);
    expect(state.setIndex).toBe(0);

    state = completeSetToRest(state);
    expect(state.setIndex).toBe(1); // already advanced

    state = tickThrough(state, 'rest');
    expect(state.screen).toBe('active');
    expect(state.exerciseIndex).toBe(0); // same exercise
    expect(state.setIndex).toBe(1); // set 2 (0-indexed)
  });

  it('rest expiry after last set of exercise advances exercise index', () => {
    let state = getToActive();

    // Complete all 3 sets of pull-ups
    for (let i = 0; i < 3; i++) {
      state = completeSetToRest(state);
      if (state.screen === 'rest') {
        state = tickThrough(state, 'rest');
      }
    }

    expect(state.screen).toBe('active');
    expect(state.exerciseIndex).toBe(1); // ring rows
    expect(state.setIndex).toBe(0); // first set
  });

  it('uses restBetweenSetsSec for mid-exercise rest', () => {
    let state = getToActive();
    state = completeSetToRest(state);

    // Pull-ups restBetweenSetsSec = 60
    expect(state.timer.secondsRemaining).toBe(60);
  });

  it('uses restAfterExerciseSec for end-of-exercise rest', () => {
    let state = getToActive();

    // Complete sets 1 and 2
    for (let i = 0; i < 2; i++) {
      state = completeSetToRest(state);
      state = tickThrough(state, 'rest');
    }

    // Complete set 3 (last set of pull-ups)
    state = completeSetToRest(state);

    // Pull-ups restAfterExerciseSec = 150
    expect(state.timer.secondsRemaining).toBe(150);
  });

  it('skip during rest transitions correctly to next active set', () => {
    let state = getToActive();
    state = completeSetToRest(state);

    // Skip all the way through rest
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'SKIP_REST' });
    }

    expect(state.screen).toBe('active');
    expect(state.setIndex).toBe(1);
    expect(state.timer.isRunning).toBe(true);
  });
});
