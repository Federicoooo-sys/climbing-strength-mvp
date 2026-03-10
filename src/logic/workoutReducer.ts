import type {
  WorkoutState,
  WorkoutAction,
  WorkoutTemplate,
  WorkoutSession,
  SetResult,
} from '../types/workout';
import { getActiveTimerDuration, computeResumeTimer } from './timer';
import {
  buildSetResult,
  resolvePostFeedback,
  resolveEarlyStopAccept,
  resolveEarlyStopDecline,
} from './progression';

// ── Initial state factory ────────────────────────────────────────

export function createInitialState(template: WorkoutTemplate): WorkoutState {
  return {
    screen: 'welcome',
    template,
    currentTargets: template.exercises.map((e) => e.defaultTarget),
    exerciseIndex: 0,
    setIndex: 0,
    timer: { secondsRemaining: 0, isRunning: false },
    feedbackStep: 'completed',
    currentSetResult: null,
    setResults: [],
    failedSetsInExercise: 0,
    earlyStoppedExercises: [],
    pausedAt: null,
    lastSavedAt: Date.now(),
    sessionId: '',
    sessionStartedAt: 0,
    completedSession: null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function currentExercise(state: WorkoutState) {
  return state.template.exercises[state.exerciseIndex];
}

function isLastSetOfExercise(state: WorkoutState): boolean {
  return state.setIndex >= currentExercise(state).sets - 1;
}

function isLastExercise(state: WorkoutState): boolean {
  return state.exerciseIndex >= state.template.exercises.length - 1;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function buildCompletedSession(state: WorkoutState, results: SetResult[]): WorkoutSession {
  return {
    id: state.sessionId,
    templateId: state.template.id,
    startedAt: state.sessionStartedAt,
    completedAt: Date.now(),
    results,
    earlyStoppedExercises: state.earlyStoppedExercises,
  };
}

// ── State transition helpers ─────────────────────────────────────

function enterFeedback(state: WorkoutState): WorkoutState {
  const exercise = currentExercise(state);
  return {
    ...state,
    screen: 'feedback',
    timer: { secondsRemaining: 0, isRunning: false },
    feedbackStep: 'completed',
    currentSetResult: {
      exerciseId: exercise.id,
      exerciseIndex: state.exerciseIndex,
      setIndex: state.setIndex,
      target: state.currentTargets[state.exerciseIndex],
    },
    lastSavedAt: Date.now(),
  };
}

function enterActive(state: WorkoutState): WorkoutState {
  const exercise = currentExercise(state);
  const duration = getActiveTimerDuration(exercise, state.currentTargets[state.exerciseIndex]);

  if (duration <= 0) {
    return enterFeedback(state);
  }

  return {
    ...state,
    screen: 'active',
    timer: { secondsRemaining: duration, isRunning: true },
    lastSavedAt: Date.now(),
  };
}

function enterCongrats(state: WorkoutState, results: SetResult[]): WorkoutState {
  return {
    ...state,
    screen: 'congrats',
    timer: { secondsRemaining: 0, isRunning: false },
    currentSetResult: null,
    completedSession: buildCompletedSession(state, results),
    lastSavedAt: Date.now(),
  };
}

function enterRest(state: WorkoutState, restDuration: number): WorkoutState {
  return {
    ...state,
    screen: 'rest',
    timer: { secondsRemaining: restDuration, isRunning: true },
    currentSetResult: null,
    lastSavedAt: Date.now(),
  };
}

function handleTimerExpire(state: WorkoutState): WorkoutState {
  switch (state.screen) {
    case 'countdown': return enterActive(state);
    case 'active':    return enterFeedback(state);
    case 'rest':      return enterActive(state);
    default:          return state;
  }
}

// ── Reducer ──────────────────────────────────────────────────────

export function workoutReducer(
  state: WorkoutState,
  action: WorkoutAction,
): WorkoutState {
  const now = Date.now();

  switch (action.type) {
    // ── Welcome → Countdown ────────────────────────────────────
    case 'START_WORKOUT': {
      return {
        ...state,
        screen: 'countdown',
        currentTargets: state.template.exercises.map((e) => e.defaultTarget),
        exerciseIndex: 0,
        setIndex: 0,
        failedSetsInExercise: 0,
        setResults: [],
        earlyStoppedExercises: [],
        currentSetResult: null,
        completedSession: null,
        timer: { secondsRemaining: 3, isRunning: true },
        sessionId: generateId(),
        sessionStartedAt: now,
        pausedAt: null,
        lastSavedAt: now,
      };
    }

    // ── Resume saved session ───────────────────────────────────
    case 'RESUME_WORKOUT': {
      const { savedState, now: resumeNow } = action.payload;

      if (savedState.pausedAt !== null || !savedState.timer.isRunning) {
        return { ...savedState, lastSavedAt: resumeNow };
      }

      const adjusted = computeResumeTimer(
        savedState.timer.secondsRemaining,
        savedState.lastSavedAt,
        resumeNow,
      );

      if (adjusted > 0) {
        return {
          ...savedState,
          timer: { secondsRemaining: adjusted, isRunning: true },
          lastSavedAt: resumeNow,
        };
      }

      return handleTimerExpire({
        ...savedState,
        timer: { secondsRemaining: 0, isRunning: false },
        lastSavedAt: resumeNow,
      });
    }

    // ── Timer tick (1 Hz) ──────────────────────────────────────
    case 'TIMER_TICK': {
      if (!state.timer.isRunning || state.timer.secondsRemaining <= 0) {
        return state;
      }

      const next = state.timer.secondsRemaining - 1;

      if (next <= 0) {
        return handleTimerExpire({
          ...state,
          timer: { secondsRemaining: 0, isRunning: false },
        });
      }

      return {
        ...state,
        timer: { secondsRemaining: next, isRunning: true },
        lastSavedAt: now,
      };
    }

    // ── User taps Done (rep-based active set) ──────────────────
    case 'COMPLETE_SET': {
      if (state.screen !== 'active') return state;
      return enterFeedback(state);
    }

    // ── Feedback sub-steps ─────────────────────────────────────
    case 'ADVANCE_FEEDBACK': {
      if (state.screen !== 'feedback') return state;

      if (state.feedbackStep === 'completed') {
        if (action.payload.completed) {
          return {
            ...state,
            feedbackStep: 'intensity',
            currentSetResult: {
              ...state.currentSetResult,
              completed: true,
              actual: state.currentSetResult?.target ?? 0,
            },
            lastSavedAt: now,
          };
        }
        return {
          ...state,
          feedbackStep: 'actual-count',
          currentSetResult: {
            ...state.currentSetResult,
            completed: false,
          },
          lastSavedAt: now,
        };
      }

      return state;
    }

    // ── Final feedback submission ──────────────────────────────
    case 'SUBMIT_FEEDBACK': {
      if (state.screen !== 'feedback') return state;

      const partial = state.currentSetResult;
      if (!partial) return state;

      // Build the full SetResult via pure function
      const result = buildSetResult(
        {
          exerciseId: partial.exerciseId!,
          exerciseIndex: partial.exerciseIndex!,
          setIndex: partial.setIndex!,
          target: partial.target!,
          completed: partial.completed ?? false,
          actual: partial.actual ?? 0,
        },
        state.feedbackStep as 'intensity' | 'actual-count',
        action.payload.value,
        now,
      );

      // Resolve what happens next via pure function
      const exercise = currentExercise(state);
      const outcome = resolvePostFeedback(
        result,
        exercise,
        state.exerciseIndex,
        state.setIndex,
        exercise.sets,
        state.template.exercises.length,
        state.failedSetsInExercise,
        state.currentTargets[state.exerciseIndex],
      );

      // Append result and apply progression
      const newResults = [...state.setResults, result];
      const newTargets = [...state.currentTargets];
      newTargets[state.exerciseIndex] = outcome.nextTarget;

      // Map outcome to state
      switch (outcome.route) {
        case 'early_stop':
          return {
            ...state,
            screen: 'earlyStop',
            setResults: newResults,
            currentTargets: newTargets,
            failedSetsInExercise: outcome.failedSetsInExercise,
            currentSetResult: null,
            timer: { secondsRemaining: 0, isRunning: false },
            lastSavedAt: now,
          };

        case 'workout_complete':
          return enterCongrats(
            { ...state, setResults: newResults, currentTargets: newTargets },
            newResults,
          );

        case 'next_set':
          return enterRest(
            { ...state, setResults: newResults, currentTargets: newTargets, setIndex: outcome.setIndex },
            outcome.restDuration,
          );

        case 'next_exercise':
          return enterRest(
            {
              ...state,
              setResults: newResults,
              currentTargets: newTargets,
              exerciseIndex: outcome.exerciseIndex,
              setIndex: 0,
              failedSetsInExercise: 0,
            },
            outcome.restDuration,
          );
      }
      break;
    }

    // ── Rest skip (−15s per tap) ───────────────────────────────
    case 'SKIP_REST': {
      if (state.screen !== 'rest') return state;
      const remaining = Math.max(0, state.timer.secondsRemaining - 15);
      if (remaining <= 0) {
        return enterActive(state);
      }
      return {
        ...state,
        timer: { secondsRemaining: remaining, isRunning: true },
        lastSavedAt: now,
      };
    }

    // ── Pause / Unpause ────────────────────────────────────────
    case 'PAUSE': {
      if (state.screen !== 'active' && state.screen !== 'rest') return state;
      return {
        ...state,
        timer: { ...state.timer, isRunning: false },
        pausedAt: action.payload.now,
        lastSavedAt: now,
      };
    }

    case 'UNPAUSE': {
      if (!state.pausedAt) return state;
      return {
        ...state,
        timer: { ...state.timer, isRunning: true },
        pausedAt: null,
        lastSavedAt: now,
      };
    }

    // ── Early stop — accept ──────────────────────────────────
    case 'ACCEPT_EARLY_STOP': {
      if (state.screen !== 'earlyStop') return state;

      const exercise = currentExercise(state);
      const newEarlyStopped = [...state.earlyStoppedExercises, exercise.id];

      const outcome = resolveEarlyStopAccept(
        state.exerciseIndex,
        state.template.exercises.length,
        exercise.restAfterExerciseSec,
      );

      switch (outcome.route) {
        case 'workout_complete':
          return enterCongrats(
            { ...state, earlyStoppedExercises: newEarlyStopped },
            state.setResults,
          );

        case 'next_exercise':
          return enterRest(
            {
              ...state,
              earlyStoppedExercises: newEarlyStopped,
              exerciseIndex: outcome.exerciseIndex,
              setIndex: 0,
              failedSetsInExercise: 0,
            },
            outcome.restDuration,
          );
      }
      break;
    }

    // ── Early stop — decline ─────────────────────────────────
    case 'DECLINE_EARLY_STOP': {
      if (state.screen !== 'earlyStop') return state;

      const exercise = currentExercise(state);
      const outcome = resolveEarlyStopDecline(
        state.setIndex,
        exercise.restBetweenSetsSec,
      );

      return enterRest(
        { ...state, setIndex: outcome.setIndex },
        outcome.restDuration,
      );
    }

    // ── Congrats → Summary ─────────────────────────────────────
    case 'VIEW_SUMMARY': {
      return { ...state, screen: 'summary', lastSavedAt: now };
    }

    // ── Summary → Welcome ──────────────────────────────────────
    case 'RESET': {
      return createInitialState(state.template);
    }

    default:
      return state;
  }
}

// Re-export helpers for use in hooks/screens
export { currentExercise, isLastSetOfExercise, isLastExercise };
