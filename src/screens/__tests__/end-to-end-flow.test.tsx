import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WorkoutContext } from '../../hooks/useWorkout';
import { workoutReducer, createInitialState } from '../../logic/workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import { localStorageAdapter } from '../../storage/localStorage';
import { buildSummary } from '../../logic/summary';
import { CongratsScreen } from '../CongratsScreen';
import { SummaryScreen } from '../SummaryScreen';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function reduce(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

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

const EXERCISE_NAMES = new Map(
  MVP_WORKOUT.exercises.map((e) => [e.id, e.name]),
);

/**
 * Drives the reducer through an entire workout (all 9 sets completed)
 * and returns the final state (should be 'congrats').
 */
function completeFullWorkout(): WorkoutState {
  let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

  for (let exIdx = 0; exIdx < MVP_WORKOUT.exercises.length; exIdx++) {
    const exercise = MVP_WORKOUT.exercises[exIdx];
    for (let setIdx = 0; setIdx < exercise.sets; setIdx++) {
      // Tick through countdown or rest → active
      while (state.screen === 'countdown' || state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }

      // Complete the active set
      if (exercise.type === 'reps') {
        state = workoutReducer(state, { type: 'COMPLETE_SET' });
      } else {
        while (state.screen === 'active') {
          state = workoutReducer(state, { type: 'TIMER_TICK' });
        }
      }

      // Feedback: completed + intensity 5
      state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
    }
  }

  return state;
}

/**
 * Simulates what usePersistence does when it detects a completedSession:
 * append to history and clear active session.
 */
function persistCompletedSession(state: WorkoutState) {
  if (state.completedSession) {
    localStorageAdapter.appendSession(state.completedSession);
    localStorageAdapter.clearSession();
  }
}

// ── Tests ────────────────────────────────────────────────────────

describe('End-to-end: complete workout → congrats → summary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('workout completion lands on congrats screen', () => {
    const state = completeFullWorkout();
    expect(state.screen).toBe('congrats');
    expect(state.completedSession).not.toBeNull();
    expect(state.setResults).toHaveLength(9);
  });

  it('congrats screen renders then transitions to summary', () => {
    const congratsState = completeFullWorkout();
    persistCompletedSession(congratsState);

    // Render congrats
    const dispatched: WorkoutAction[] = [];
    renderWithState(<CongratsScreen />, congratsState, (a) => dispatched.push(a));

    expect(screen.getByText('Workout Complete!')).toBeTruthy();
    expect(screen.getByText(/9 of 9 sets/)).toBeTruthy();

    // Click View Summary
    fireEvent.click(screen.getByText('View Summary'));
    expect(dispatched[0].type).toBe('VIEW_SUMMARY');

    // Transition to summary
    const summaryState = workoutReducer(congratsState, { type: 'VIEW_SUMMARY' });
    expect(summaryState.screen).toBe('summary');

    cleanup();

    // Render summary — it reads from localStorage
    renderWithState(<SummaryScreen />, summaryState);

    expect(screen.getByText('Pull-ups')).toBeTruthy();
    expect(screen.getByText('Ring Rows')).toBeTruthy();
    expect(screen.getByText('Dead Hangs')).toBeTruthy();

    // Each exercise: 1 session, 3/3 sets completed
    const sessionTexts = screen.getAllByText(/Sessions: 1/);
    expect(sessionTexts).toHaveLength(3);
    const setsTexts = screen.getAllByText(/Sets: 3 \/ 3 completed/);
    expect(setsTexts).toHaveLength(3);
  });

  it('cumulative values update correctly across multiple sessions', () => {
    // Session 1: full completion
    const s1 = completeFullWorkout();
    persistCompletedSession(s1);

    // Session 2: full completion
    const s2 = completeFullWorkout();
    persistCompletedSession(s2);

    // Check raw history
    const history = localStorageAdapter.loadHistory();
    expect(history.sessions).toHaveLength(2);

    // Check summary logic
    const summaries = buildSummary(history, EXERCISE_NAMES);
    expect(summaries).toHaveLength(3);

    for (const summary of summaries) {
      expect(summary.completionCount).toBe(2);   // appeared in 2 sessions
      expect(summary.totalSetsCompleted).toBe(6); // 3 sets × 2 sessions
      expect(summary.totalSetsAttempted).toBe(6); // all attempted
    }

    // Render summary screen and verify UI
    const summaryState = reduce(s2, { type: 'VIEW_SUMMARY' });
    renderWithState(<SummaryScreen />, summaryState);

    const sessionTexts = screen.getAllByText(/Sessions: 2/);
    expect(sessionTexts).toHaveLength(3);
    const setsTexts = screen.getAllByText(/Sets: 6 \/ 6 completed/);
    expect(setsTexts).toHaveLength(3);
  });

  it('summary still works after simulated reload (reads from localStorage)', () => {
    // Complete and persist a workout
    const s1 = completeFullWorkout();
    persistCompletedSession(s1);

    // Simulate "reload": create fresh initial state (as if app restarted),
    // then go directly to summary screen
    const freshState = createInitialState(MVP_WORKOUT);
    const summaryState = { ...freshState, screen: 'summary' as const };

    renderWithState(<SummaryScreen />, summaryState);

    // Should still see the persisted data
    expect(screen.getByText('Pull-ups')).toBeTruthy();
    expect(screen.getByText('Ring Rows')).toBeTruthy();
    expect(screen.getByText('Dead Hangs')).toBeTruthy();

    const sessionTexts = screen.getAllByText(/Sessions: 1/);
    expect(sessionTexts).toHaveLength(3);
  });

  it('summary works after multiple sessions and reload', () => {
    // Three sessions
    for (let i = 0; i < 3; i++) {
      const s = completeFullWorkout();
      persistCompletedSession(s);
    }

    // Simulate reload
    const freshState = createInitialState(MVP_WORKOUT);
    const summaryState = { ...freshState, screen: 'summary' as const };

    renderWithState(<SummaryScreen />, summaryState);

    const sessionTexts = screen.getAllByText(/Sessions: 3/);
    expect(sessionTexts).toHaveLength(3);
    const setsTexts = screen.getAllByText(/Sets: 9 \/ 9 completed/);
    expect(setsTexts).toHaveLength(3);
  });

  it('partial workout (with early stop) shows correct cumulative data', () => {
    // Session 1: full workout
    const s1 = completeFullWorkout();
    persistCompletedSession(s1);

    // Session 2: early-stop pull-ups after failing set 1
    let state = reduce(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Countdown → active
    while (state.screen === 'countdown') {
      state = workoutReducer(state, { type: 'TIMER_TICK' });
    }

    // Fail set 1 → early stop → accept
    state = workoutReducer(state, { type: 'COMPLETE_SET' });
    state = reduce(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: false } });
    state = reduce(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 0 } });
    expect(state.screen).toBe('earlyStop');
    state = workoutReducer(state, { type: 'ACCEPT_EARLY_STOP' });

    // Complete remaining 6 sets (ring rows + dead hangs)
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
    persistCompletedSession(state);

    // Verify cumulative summary
    const history = localStorageAdapter.loadHistory();
    const summaries = buildSummary(history, EXERCISE_NAMES);

    const pullUps = summaries.find((s) => s.exerciseId === 'pull-ups')!;
    expect(pullUps.completionCount).toBe(2);       // appeared in both sessions
    expect(pullUps.totalSetsCompleted).toBe(3);     // 3 from session 1, 0 from session 2
    expect(pullUps.totalSetsAttempted).toBe(4);     // 3 from session 1, 1 failed from session 2

    const ringRows = summaries.find((s) => s.exerciseId === 'ring-rows')!;
    expect(ringRows.completionCount).toBe(2);
    expect(ringRows.totalSetsCompleted).toBe(6);    // 3 + 3
    expect(ringRows.totalSetsAttempted).toBe(6);

    const deadHangs = summaries.find((s) => s.exerciseId === 'dead-hangs')!;
    expect(deadHangs.completionCount).toBe(2);
    expect(deadHangs.totalSetsCompleted).toBe(6);
    expect(deadHangs.totalSetsAttempted).toBe(6);
  });
});
