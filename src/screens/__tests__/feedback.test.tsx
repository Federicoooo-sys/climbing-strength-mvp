import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutContext } from '../../hooks/useWorkout';
import { workoutReducer, createInitialState } from '../../logic/workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import { FeedbackScreen } from '../FeedbackScreen';
import { EarlyStopScreen } from '../EarlyStopScreen';
import { RestScreen } from '../RestScreen';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function renderWithState(
  ui: React.ReactElement,
  state: WorkoutState,
  dispatch: React.Dispatch<WorkoutAction> = () => {},
) {
  return render(
    <WorkoutContext value={{ state, dispatch, savedSession: null }}>
      {ui}
    </WorkoutContext>,
  );
}

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

/** Get to the first active set (pull-ups), then complete it → feedback. */
function getToFeedback(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
  // Tick through countdown
  while (state.screen === 'countdown') {
    state = workoutReducer(state, { type: 'TIMER_TICK' });
  }
  // Complete the set → feedback
  state = workoutReducer(state, { type: 'COMPLETE_SET' });
  expect(state.screen).toBe('feedback');
  return state;
}

// ── Feedback: Completed question ─────────────────────────────────

describe('FeedbackScreen — completed step', () => {
  it('asks if user completed the target', () => {
    const state = getToFeedback();
    renderWithState(<FeedbackScreen />, state);

    expect(screen.getByText(/Did you complete all 4 reps/)).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
  });

  it('shows exercise name and set number', () => {
    const state = getToFeedback();
    renderWithState(<FeedbackScreen />, state);

    expect(screen.getByText(/Pull-ups — Set 1/)).toBeTruthy();
  });
});

// ── Feedback: Intensity (after Yes) ──────────────────────────────

describe('FeedbackScreen — intensity step', () => {
  it('shows intensity slider after answering Yes', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: true },
    });
    expect(state.feedbackStep).toBe('intensity');

    renderWithState(<FeedbackScreen />, state);
    expect(screen.getByText(/How hard was that/)).toBeTruthy();
    expect(screen.getByText('5 / 10')).toBeTruthy(); // default
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('dispatches SUBMIT_FEEDBACK with intensity value', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: true },
    });

    const dispatched: WorkoutAction[] = [];
    renderWithState(<FeedbackScreen />, state, (a) => dispatched.push(a));

    fireEvent.click(screen.getByText('Submit'));
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('SUBMIT_FEEDBACK');
  });

  it('transitions to rest after submitting intensity', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    expect(state.screen).toBe('rest');
  });
});

// ── Feedback: Actual count (after No) ────────────────────────────

describe('FeedbackScreen — actual count step', () => {
  it('shows actual count input after answering No', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: false },
    });
    expect(state.feedbackStep).toBe('actual-count');

    renderWithState(<FeedbackScreen />, state);
    expect(screen.getByText(/How many reps did you complete/)).toBeTruthy();
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('shows stepper buttons for count input', () => {
    let state = getToFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: false },
    });

    renderWithState(<FeedbackScreen />, state);
    // + and − buttons exist
    expect(screen.getByText('−')).toBeTruthy();
    expect(screen.getByText('+')).toBeTruthy();
    // Range label
    expect(screen.getByText(/0 – 3 reps/)).toBeTruthy();
  });

  it('submitting 0 actual creates a failed set', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });

    // Failed set → early stop screen (manual option)
    expect(state.screen).toBe('earlyStop');
  });

  it('submitting partial count moves to rest with adjusted target', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 2 } });

    // Partial completion (not 0) → rest, not early stop
    expect(state.screen).toBe('rest');
    // Next target should be adjusted to actual (2)
    expect(state.currentTargets[0]).toBe(2);
  });
});

// ── Feedback: Duration exercises ─────────────────────────────────

describe('FeedbackScreen — duration exercises', () => {
  function getToDeadHangsFeedback(): WorkoutState {
    let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Complete all pull-up and ring row sets
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

    // Dead hangs: tick timer to expiry → feedback
    expect(state.screen).toBe('active');
    expect(state.exerciseIndex).toBe(2);
    while (state.screen === 'active') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.screen).toBe('feedback');
    return state;
  }

  it('asks for seconds when duration exercise is not completed', () => {
    let state = getToDeadHangsFeedback();
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: false },
    });

    renderWithState(<FeedbackScreen />, state);
    expect(screen.getByText(/How many seconds did you complete/)).toBeTruthy();
  });
});

// ── Early stop: manual (after 1 failed set) ──────────────────────

describe('EarlyStopScreen — manual', () => {
  function getToEarlyStop(): WorkoutState {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } }); // failed
    expect(state.screen).toBe('earlyStop');
    return state;
  }

  it('shows manual early-stop option after a failed set', () => {
    const state = getToEarlyStop();
    renderWithState(<EarlyStopScreen />, state);

    expect(screen.getByText(/Stop Pull-ups early/)).toBeTruthy();
    expect(screen.getByText('Skip remaining sets')).toBeTruthy();
    expect(screen.getByText('Keep going')).toBeTruthy();
  });

  it('does NOT show recommendation text for first failure', () => {
    const state = getToEarlyStop();
    expect(state.failedSetsInExercise).toBe(1);
    renderWithState(<EarlyStopScreen />, state);

    expect(screen.queryByText(/We recommend/)).toBeNull();
  });

  it('accepting early stop moves to rest (next exercise)', () => {
    let state = getToEarlyStop();
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(1); // moved to ring rows
    expect(state.setIndex).toBe(0);
    expect(state.earlyStoppedExercises).toContain('pull-ups');
  });

  it('declining early stop moves to rest (next set of same exercise)', () => {
    let state = getToEarlyStop();
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });

    expect(state.screen).toBe('rest');
    expect(state.exerciseIndex).toBe(0); // still pull-ups
    expect(state.setIndex).toBe(1); // next set
  });
});

// ── Early stop: auto-recommended (after 2 failed sets) ──────────

describe('EarlyStopScreen — auto-recommended', () => {
  function getToRecommendedEarlyStop(): WorkoutState {
    // Fail set 1 → early stop → decline → rest → active → fail set 2
    let state = getToFeedback();

    // Fail set 1
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
    expect(state.screen).toBe('earlyStop');

    // Decline → rest → active
    state = workoutReducer(state, { type: 'DECLINE_EARLY_STOP' });
    while (state.screen === 'rest') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }
    expect(state.screen).toBe('active');

    // Fail set 2
    state = workoutReducer(state, { type: 'COMPLETE_SET' });
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
    expect(state.screen).toBe('earlyStop');
    expect(state.failedSetsInExercise).toBe(2);

    return state;
  }

  it('shows recommendation text after 2 failed sets', () => {
    const state = getToRecommendedEarlyStop();
    renderWithState(<EarlyStopScreen />, state);

    expect(screen.getByText(/We recommend stopping Pull-ups/)).toBeTruthy();
    expect(screen.getByText(/2 failed sets in a row/)).toBeTruthy();
  });

  it('shows remaining set count', () => {
    const state = getToRecommendedEarlyStop();
    renderWithState(<EarlyStopScreen />, state);

    expect(screen.getByText(/remaining 1 set/)).toBeTruthy();
  });
});

// ── Rest: no rest until feedback is done ─────────────────────────

describe('Rest does not start until feedback is submitted', () => {
  it('stays on feedback screen until submit', () => {
    let state = getToFeedback();
    expect(state.screen).toBe('feedback');

    // Advance to intensity (user said Yes)
    state = workoutReducer(state, {
      type: 'ADVANCE_FEEDBACK',
      payload: { completed: true },
    });
    expect(state.screen).toBe('feedback');
    expect(state.feedbackStep).toBe('intensity');

    // Still no rest timer
    expect(state.timer.isRunning).toBe(false);

    // Submit → now rest starts
    state = workoutReducer(state, {
      type: 'SUBMIT_FEEDBACK',
      payload: { value: 7 },
    });
    expect(state.screen).toBe('rest');
    expect(state.timer.isRunning).toBe(true);
    expect(state.timer.secondsRemaining).toBeGreaterThan(0);
  });
});

// ── Rest screen content ──────────────────────────────────────────

describe('RestScreen', () => {
  it('shows rest timer and up-next info', () => {
    let state = getToFeedback();
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    expect(state.screen).toBe('rest');

    renderWithState(<RestScreen />, state);
    expect(screen.getByText('Rest')).toBeTruthy();
    expect(screen.getByText('Rest remaining')).toBeTruthy();
    expect(screen.getByText(/Up next: Pull-ups — Set 2/)).toBeTruthy();
    expect(screen.getByText('Skip (-15s)')).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();
  });
});
