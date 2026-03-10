import type { ExerciseType, ExerciseDefinition, SetResult } from '../types/workout';

// ── 1–5. Target computation ──────────────────────────────────────
//
// Single entry point that handles all four cases:
//   - successful reps   → target + 1  (if intensity < 5)
//   - successful duration → target + 5  (if intensity < 5)
//   - successful + intensity >= 5 → unchanged
//   - failed (reps or duration) → target becomes actual
//
// The "carry-forward" mechanic (item 6) is structural, not
// per-function: currentTargets[exerciseIndex] is mutated after
// every set and fed into the next set of the same exercise.
// This function is the mutation rule; the array is the mechanism.

export function computeNextTarget(
  exerciseType: ExerciseType,
  currentTarget: number,
  completed: boolean,
  actual: number,
  intensity: number | null,
): number {
  if (!completed) {
    return actual;
  }

  if (intensity !== null && intensity < 5) {
    return exerciseType === 'reps'
      ? currentTarget + 1
      : currentTarget + 5;
  }

  return currentTarget;
}

// ── 7. Failed set detection ──────────────────────────────────────

export function isFailedSet(actual: number): boolean {
  return actual === 0;
}

// ── 8. Consecutive failed set tracking ───────────────────────────

export function updateFailedSetCount(
  currentCount: number,
  setFailed: boolean,
): number {
  return setFailed ? currentCount + 1 : currentCount;
}

// ── 9. Early-stop trigger decisions ──────────────────────────────

/** Should we show the early-stop prompt at all? */
export function shouldOfferEarlyStop(
  setFailed: boolean,
  moreSetsRemain: boolean,
): boolean {
  return setFailed && moreSetsRemain;
}

/** Is this an auto-recommendation (stronger wording in UI)? */
export function shouldRecommendEarlyStop(
  failedSetsInExercise: number,
): boolean {
  return failedSetsInExercise >= 2;
}

// ── SetResult factory ────────────────────────────────────────────
// Builds a complete SetResult from the feedback path taken.

export function buildSetResult(
  partial: {
    exerciseId: string;
    exerciseIndex: number;
    setIndex: number;
    target: number;
    completed: boolean;
    actual: number;
  },
  feedbackPath: 'intensity' | 'actual-count',
  submittedValue: number,
  timestamp: number,
): SetResult {
  if (feedbackPath === 'intensity') {
    return {
      exerciseId: partial.exerciseId,
      exerciseIndex: partial.exerciseIndex,
      setIndex: partial.setIndex,
      target: partial.target,
      completed: true,
      actual: partial.actual,
      intensity: submittedValue,
      failed: false,
      timestamp,
    };
  }

  // actual-count path
  return {
    exerciseId: partial.exerciseId,
    exerciseIndex: partial.exerciseIndex,
    setIndex: partial.setIndex,
    target: partial.target,
    completed: false,
    actual: submittedValue,
    intensity: null,
    failed: isFailedSet(submittedValue),
    timestamp,
  };
}

// ── 10–11 + routing: Post-feedback outcome ───────────────────────
//
// Pure decision function. Given the result and current position,
// returns exactly what should happen next — without touching
// React state. The reducer maps this outcome to state updates.

export type PostFeedbackOutcome =
  | { route: 'early_stop'; failedSetsInExercise: number; nextTarget: number }
  | { route: 'workout_complete'; nextTarget: number }
  | { route: 'next_set'; setIndex: number; restDuration: number; nextTarget: number }
  | { route: 'next_exercise'; exerciseIndex: number; restDuration: number; nextTarget: number };

export function resolvePostFeedback(
  result: SetResult,
  exercise: ExerciseDefinition,
  exerciseIndex: number,
  setIndex: number,
  totalSets: number,
  totalExercises: number,
  failedSetsInExercise: number,
  currentTarget: number,
): PostFeedbackOutcome {
  // Progression
  const nextTarget = computeNextTarget(
    exercise.type,
    currentTarget,
    result.completed,
    result.actual,
    result.intensity,
  );

  // Failed set tracking
  const newFailedCount = updateFailedSetCount(failedSetsInExercise, result.failed);
  const moreSetsRemain = setIndex < totalSets - 1;

  // Early-stop check (item 9)
  if (shouldOfferEarlyStop(result.failed, moreSetsRemain)) {
    return { route: 'early_stop', failedSetsInExercise: newFailedCount, nextTarget };
  }

  // Workout complete check
  const isLastSet = setIndex >= totalSets - 1;
  const isLastExercise = exerciseIndex >= totalExercises - 1;
  if (isLastSet && isLastExercise) {
    return { route: 'workout_complete', nextTarget };
  }

  // Normal advance
  if (moreSetsRemain) {
    return {
      route: 'next_set',
      setIndex: setIndex + 1,
      restDuration: exercise.restBetweenSetsSec,
      nextTarget,
    };
  }

  return {
    route: 'next_exercise',
    exerciseIndex: exerciseIndex + 1,
    restDuration: exercise.restAfterExerciseSec,
    nextTarget,
  };
}

// ── 10. Accept early-stop outcome ────────────────────────────────

export type EarlyStopAcceptOutcome =
  | { route: 'workout_complete' }
  | { route: 'next_exercise'; exerciseIndex: number; restDuration: number };

export function resolveEarlyStopAccept(
  exerciseIndex: number,
  totalExercises: number,
  restAfterExerciseSec: number,
): EarlyStopAcceptOutcome {
  if (exerciseIndex >= totalExercises - 1) {
    return { route: 'workout_complete' };
  }
  return {
    route: 'next_exercise',
    exerciseIndex: exerciseIndex + 1,
    restDuration: restAfterExerciseSec,
  };
}

// ── 11. Decline early-stop outcome ───────────────────────────────

export interface EarlyStopDeclineOutcome {
  setIndex: number;
  restDuration: number;
}

export function resolveEarlyStopDecline(
  currentSetIndex: number,
  restBetweenSetsSec: number,
): EarlyStopDeclineOutcome {
  return {
    setIndex: currentSetIndex + 1,
    restDuration: restBetweenSetsSec,
  };
}
