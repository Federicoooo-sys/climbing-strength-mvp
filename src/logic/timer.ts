import type { ExerciseDefinition } from '../types/workout';

/**
 * How long the active set timer should run.
 * - Reps: use timeCap (e.g. 60s)
 * - Duration: use the current target (e.g. 60s for dead hangs)
 */
export function getActiveTimerDuration(
  exercise: ExerciseDefinition,
  currentTarget: number,
): number {
  if (exercise.type === 'reps') {
    return exercise.timeCap ?? 0;
  }
  return currentTarget;
}

/**
 * Rest duration after a set.
 * - Last set of exercise → restAfterExerciseSec
 * - Otherwise → restBetweenSetsSec
 */
export function getRestDuration(
  exercise: ExerciseDefinition,
  isLastSetOfExercise: boolean,
): number {
  return isLastSetOfExercise
    ? exercise.restAfterExerciseSec
    : exercise.restBetweenSetsSec;
}

/**
 * Adjust a saved timer for elapsed real time (used on resume).
 * Returns the remaining seconds (floored to 0).
 */
export function computeResumeTimer(
  savedRemaining: number,
  lastSavedAt: number,
  now: number,
): number {
  const elapsedSec = Math.floor((now - lastSavedAt) / 1000);
  return Math.max(0, savedRemaining - elapsedSec);
}
