import type { WorkoutHistory, WorkoutSession, SetResult } from '../types/workout';

// ── Types ────────────────────────────────────────────────────────

export interface ExerciseSummary {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly completionCount: number;   // how many sessions included this exercise
  readonly totalSetsCompleted: number; // cumulative sets where completed === true
  readonly totalSetsAttempted: number; // cumulative sets attempted (all results)
}

// ── Core summary logic ──────────────────────────────────────────

/**
 * A "completion" for an exercise in a session means:
 * the exercise appears in that session's results at least once
 * (i.e. the user attempted at least one set of it).
 *
 * This is deliberately generous for the MVP — even a partial
 * attempt counts as having "done" that exercise in a session.
 * You can tighten this later (e.g. require all sets completed).
 */
function countSessionsWithExercise(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): number {
  return sessions.filter((s) =>
    s.results.some((r) => r.exerciseId === exerciseId),
  ).length;
}

function countCompletedSets(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): number {
  return sessions.reduce(
    (sum, s) =>
      sum +
      s.results.filter((r) => r.exerciseId === exerciseId && r.completed)
        .length,
    0,
  );
}

function countAttemptedSets(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): number {
  return sessions.reduce(
    (sum, s) =>
      sum + s.results.filter((r) => r.exerciseId === exerciseId).length,
    0,
  );
}

/**
 * Build cumulative summary grouped by exercise type.
 *
 * @param history - The full workout history from storage
 * @param exerciseNames - Map of exerciseId → display name. This keeps the
 *   summary logic decoupled from the exercise definitions, so it works
 *   when the exercise library grows.
 */
export function buildSummary(
  history: WorkoutHistory,
  exerciseNames: ReadonlyMap<string, string>,
): ExerciseSummary[] {
  // Collect every unique exerciseId that appears in any session
  const seenIds = new Set<string>();
  for (const session of history.sessions) {
    for (const result of session.results) {
      seenIds.add(result.exerciseId);
    }
  }

  // Build a summary row for each exercise, sorted by first appearance
  const summaries: ExerciseSummary[] = [];

  for (const id of seenIds) {
    summaries.push({
      exerciseId: id,
      exerciseName: exerciseNames.get(id) ?? id,
      completionCount: countSessionsWithExercise(history.sessions, id),
      totalSetsCompleted: countCompletedSets(history.sessions, id),
      totalSetsAttempted: countAttemptedSets(history.sessions, id),
    });
  }

  return summaries;
}
