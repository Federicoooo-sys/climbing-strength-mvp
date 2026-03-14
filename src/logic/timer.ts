import type { ExerciseDefinition } from '../types/workout';

/**
 * Format seconds into a display string.
 * Shows MM:SS when >= 60, otherwise just the number.
 */
export function formatTimer(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}`;
}

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
