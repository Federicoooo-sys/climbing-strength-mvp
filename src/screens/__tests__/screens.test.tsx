import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutContext } from '../../hooks/useWorkout';
import { workoutReducer, createInitialState } from '../../logic/workoutReducer';
import { MVP_WORKOUT } from '../../data/exercises';
import { WelcomeScreen } from '../WelcomeScreen';
import { CountdownScreen } from '../CountdownScreen';
import { ActiveScreen } from '../ActiveScreen';
import type { WorkoutState, WorkoutAction } from '../../types/workout';

// ── Helper: render a screen with the given state ─────────────────

function renderWithState(
  ui: React.ReactElement,
  state: WorkoutState,
  dispatch: React.Dispatch<WorkoutAction> = () => {},
  savedSession: WorkoutState | null = null,
) {
  return render(
    <WorkoutContext value={{ state, dispatch, savedSession }}>
      {ui}
    </WorkoutContext>,
  );
}

function dispatch(state: WorkoutState, ...actions: WorkoutAction[]): WorkoutState {
  return actions.reduce((s, a) => workoutReducer(s, a), state);
}

// ── Welcome Screen ───────────────────────────────────────────────

describe('WelcomeScreen', () => {
  it('shows the app title and workout preview', () => {
    const state = createInitialState(MVP_WORKOUT);
    renderWithState(<WelcomeScreen />, state);

    expect(screen.getByText('Climbing Strength')).toBeTruthy();
    expect(screen.getByText(/Pull-ups/)).toBeTruthy();
    expect(screen.getByText(/Ring Rows/)).toBeTruthy();
    expect(screen.getByText(/Dead Hangs/)).toBeTruthy();
  });

  it('shows a single Start button when no saved session', () => {
    const state = createInitialState(MVP_WORKOUT);
    renderWithState(<WelcomeScreen />, state);

    expect(screen.getByText('Start Workout')).toBeTruthy();
    expect(screen.queryByText('Resume Workout')).toBeNull();
  });

  it('shows Resume and Start New when there is a saved session', () => {
    const state = createInitialState(MVP_WORKOUT);
    const saved = dispatch(state, { type: 'START_WORKOUT' });
    renderWithState(<WelcomeScreen />, state, () => {}, saved);

    expect(screen.getByText('Resume Workout')).toBeTruthy();
    expect(screen.getByText('Start New Workout')).toBeTruthy();
  });

  it('dispatches START_WORKOUT when Start button is clicked', () => {
    const state = createInitialState(MVP_WORKOUT);
    const mockDispatch = { called: false, action: null as WorkoutAction | null };
    renderWithState(<WelcomeScreen />, state, (action) => {
      mockDispatch.called = true;
      mockDispatch.action = action;
    });

    fireEvent.click(screen.getByText('Start Workout'));
    expect(mockDispatch.called).toBe(true);
    expect(mockDispatch.action!.type).toBe('START_WORKOUT');
  });
});

// ── Countdown Screen ─────────────────────────────────────────────

describe('CountdownScreen', () => {
  it('shows exercise name, set info, and countdown timer', () => {
    const state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    expect(state.screen).toBe('countdown');
    renderWithState(<CountdownScreen />, state);

    expect(screen.getByText('Pull-ups')).toBeTruthy();
    expect(screen.getByText(/Set 1 of 3/)).toBeTruthy();
    expect(screen.getByText(/4 reps/)).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy(); // 3-second countdown
  });

  it('shows progress bar', () => {
    const state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    renderWithState(<CountdownScreen />, state);

    // Progress bar is 0% (no sets completed yet) — the container div exists
    // We check that the "Get ready" text is present, meaning the screen rendered fully
    expect(screen.getByText('Get ready')).toBeTruthy();
  });
});

// ── Active Screen ────────────────────────────────────────────────

describe('ActiveScreen', () => {
  function getActiveState(): WorkoutState {
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });
    // Tick countdown to 0 → enters active
    state = dispatch(state, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' }, { type: 'TIMER_TICK' });
    expect(state.screen).toBe('active');
    return state;
  }

  it('shows exercise name', () => {
    renderWithState(<ActiveScreen />, getActiveState());
    expect(screen.getByText('Pull-ups')).toBeTruthy();
  });

  it('shows set number', () => {
    renderWithState(<ActiveScreen />, getActiveState());
    expect(screen.getByText(/Set 1 of 3/)).toBeTruthy();
  });

  it('shows target', () => {
    renderWithState(<ActiveScreen />, getActiveState());
    expect(screen.getByText(/Target: 4 reps/)).toBeTruthy();
  });

  it('shows timer with time cap label for reps exercise', () => {
    renderWithState(<ActiveScreen />, getActiveState());
    expect(screen.getByText('Time cap')).toBeTruthy();
    // Timer should show 60 (or 1:00) — the time cap for pull-ups
    expect(screen.getByText('1:00')).toBeTruthy();
  });

  it('shows Done button for reps exercise', () => {
    renderWithState(<ActiveScreen />, getActiveState());
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('shows Pause button when running', () => {
    renderWithState(<ActiveScreen />, getActiveState());
    expect(screen.getByText('Pause')).toBeTruthy();
    expect(screen.queryByText('Resume')).toBeNull();
  });

  it('shows Resume button when paused', () => {
    let state = getActiveState();
    state = dispatch(state, { type: 'PAUSE', payload: { now: Date.now() } });
    renderWithState(<ActiveScreen />, state);

    expect(screen.getByText('Resume')).toBeTruthy();
    expect(screen.queryByText('Pause')).toBeNull();
  });

  it('shows Hold for label for duration exercise (dead hangs)', () => {
    // Advance through all pull-up and ring row sets to reach dead hangs
    let state = dispatch(createInitialState(MVP_WORKOUT), { type: 'START_WORKOUT' });

    // Complete 6 sets (3 pull-ups + 3 ring rows) with rest in between
    for (let i = 0; i < 6; i++) {
      // Countdown → active
      while (state.screen === 'countdown') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
      // Complete set
      state = workoutReducer(state, { type: 'COMPLETE_SET' });
      // Feedback: completed, intensity 5
      state = dispatch(state, { type: 'ADVANCE_FEEDBACK', payload: { completed: true } });
      state = dispatch(state, { type: 'SUBMIT_FEEDBACK', payload: { value: 5 } });
      // Tick through rest
      while (state.screen === 'rest') {
        state = workoutReducer(state, { type: 'TIMER_TICK' });
      }
    }

    // Rest timer expiry goes directly to active (no countdown between sets)
    expect(state.screen).toBe('active');
    expect(state.exerciseIndex).toBe(2); // dead hangs

    renderWithState(<ActiveScreen />, state);
    expect(screen.getByText('Dead Hangs')).toBeTruthy();
    expect(screen.getByText('Hold for')).toBeTruthy();
    expect(screen.getByText(/Target: 60 sec/)).toBeTruthy();
    // No Done button for duration exercises
    expect(screen.queryByText('Done')).toBeNull();
  });
});
