import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutContext } from '../../hooks/useWorkout';
import { workoutReducer, createInitialState } from '../../logic/workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import { localStorageAdapter } from '../../storage/localStorage';
import { CongratsScreen } from '../CongratsScreen';
import { SummaryScreen } from '../SummaryScreen';
import type { WorkoutState, WorkoutAction, WorkoutSession } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function renderWithState(
  ui: React.ReactElement,
  state: WorkoutState,
  dispatch: React.Dispatch<WorkoutAction> = () => {},
) {
  return render(
    <WorkoutContext value={{ state, dispatch, savedSession: null, storage: localStorageAdapter }}>
      {ui}
    </WorkoutContext>,
  );
}

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

/** Run a full workout (all 9 sets completed) and return congrats state. */
function completeFullWorkout(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

  for (let exerciseIdx = 0; exerciseIdx < 3; exerciseIdx++) {
    const exercise = MVP_WORKOUT.exercises[exerciseIdx];
    for (let setIdx = 0; setIdx < exercise.sets; setIdx++) {
      // Tick through countdown or rest → active
      while (state.screen === 'countdown' || state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }

      if (exercise.type === 'reps') {
        state = workoutReducer(state, { type: 'COMPLETE_SET' });
      } else {
        // Duration: tick to expiry
        while (state.screen === 'active') {
          state = workoutReducer(state, { type: 'TIMER_TICK' });
        }
      }

      // Feedback: Yes + intensity 5
      state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    }
  }

  expect(state.screen).toBe('congrats');
  return state;
}

// ── Mock localStorage for summary tests ──────────────────────────

const HISTORY_KEY = 'workout-history';

function setMockHistory(sessions: WorkoutSession[]) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({ version: 1, sessions }),
  );
}

function makeSession(id: string, results: WorkoutState['setResults']): WorkoutSession {
  return {
    id,
    templateId: 'mvp-upper-body',
    startedAt: Date.now(),
    completedAt: Date.now(),
    results,
    earlyStoppedExercises: [],
  };
}

// ── Congrats Screen ─────────────────────────────────────────────

describe('CongratsScreen', () => {
  it('shows workout complete heading', () => {
    const state = completeFullWorkout();
    renderWithState(<CongratsScreen />, state);
    expect(screen.getByText('Workout Complete!')).toBeTruthy();
  });

  it('shows set completion count', () => {
    const state = completeFullWorkout();
    renderWithState(<CongratsScreen />, state);
    // All 9 sets completed
    expect(screen.getByText(/9 of 9 sets/)).toBeTruthy();
  });

  it('shows early-stopped exercise count when applicable', () => {
    let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Tick to active
    while (state.screen === 'countdown') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }

    // Fail set 1 → early stop → accept
    state = workoutReducer(state, { type: 'COMPLETE_SET' });
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    // Complete remaining exercises normally
    for (let i = 0; i < 6; i++) {
      while (state.screen === 'rest' || state.screen === 'countdown') {
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
    expect(state.earlyStoppedExercises).toContain('pull-ups');

    renderWithState(<CongratsScreen />, state);
    expect(screen.getByText(/1 exercise stopped early/)).toBeTruthy();
  });

  it('dispatches VIEW_SUMMARY on button click', () => {
    const state = completeFullWorkout();
    const dispatched: WorkoutAction[] = [];
    renderWithState(<CongratsScreen />, state, (a) => dispatched.push(a));

    fireEvent.click(screen.getByText('View Summary'));
    expect(dispatched[0].type).toBe('VIEW_SUMMARY');
  });
});

// ── Summary Screen ──────────────────────────────────────────────

describe('SummaryScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows "No workout history" when localStorage is empty', () => {
    const state = reduce(completeFullWorkout(), { type: 'VIEW_SUMMARY' });
    renderWithState(<SummaryScreen />, state);
    expect(screen.getByText('No workout history yet.')).toBeTruthy();
  });

  it('shows cumulative summary from localStorage history', () => {
    const results = [
      { exerciseId: 'pull-ups', exerciseIndex: 0, setIndex: 0, target: 4, completed: true, actual: 4, intensity: 5, failed: false, timestamp: Date.now() },
      { exerciseId: 'ring-rows', exerciseIndex: 1, setIndex: 0, target: 6, completed: true, actual: 6, intensity: 5, failed: false, timestamp: Date.now() },
      { exerciseId: 'dead-hangs', exerciseIndex: 2, setIndex: 0, target: 60, completed: true, actual: 60, intensity: 5, failed: false, timestamp: Date.now() },
    ];
    setMockHistory([makeSession('s1', results), makeSession('s2', results)]);

    const state = reduce(completeFullWorkout(), { type: 'VIEW_SUMMARY' });
    renderWithState(<SummaryScreen />, state);

    // Each exercise appears
    expect(screen.getByText('Pull-ups')).toBeTruthy();
    expect(screen.getByText('Ring Rows')).toBeTruthy();
    expect(screen.getByText('Dead Hangs')).toBeTruthy();

    // Each shows sessions count of 2
    const sessionTexts = screen.getAllByText(/Sessions: 2/);
    expect(sessionTexts).toHaveLength(3);
  });

  it('dispatches RESET on Start New Workout click', () => {
    const state = reduce(completeFullWorkout(), { type: 'VIEW_SUMMARY' });
    const dispatched: WorkoutAction[] = [];
    renderWithState(<SummaryScreen />, state, (a) => dispatched.push(a));

    fireEvent.click(screen.getByText('Start New Workout'));
    expect(dispatched[0].type).toBe('RESET');
  });
});
