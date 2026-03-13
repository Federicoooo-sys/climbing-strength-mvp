import type { WorkoutState, ExerciseDefinition } from '../types/workout';

/**
 * Read-only queries on WorkoutState, used by screens and components.
 * Separated from the reducer (which handles writes/transitions).
 */

/** The exercise definition for the current exerciseIndex. */
export function currentExercise(state: WorkoutState): ExerciseDefinition {
  return state.template.exercises[state.exerciseIndex];
}

/** Total number of sets across all exercises in the workout. */
export function totalWorkoutSets(state: WorkoutState): number {
  return state.template.exercises.reduce((sum, e) => sum + e.sets, 0);
}

/** Number of sets completed so far (based on recorded results). */
export function completedWorkoutSets(state: WorkoutState): number {
  return state.setResults.length;
}

/**
 * Display unit for an exercise type.
 * @param format 'short' → "reps" / "sec", 'long' → "reps" / "seconds"
 */
export function exerciseUnit(
  type: 'reps' | 'duration',
  format: 'short' | 'long' = 'short',
): string {
  if (type === 'reps') return 'reps';
  return format === 'long' ? 'seconds' : 'sec';
}
