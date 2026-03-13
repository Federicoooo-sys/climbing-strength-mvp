import type { WorkoutHistory, WorkoutSession, SetResult, ExerciseType } from '../types/workout';

// ── Types ────────────────────────────────────────────────────────

export interface DurationSetDetail {
  readonly target: number;
  readonly actual: number;
}

export interface ExerciseSummary {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly exerciseType: ExerciseType;
  readonly completionCount: number;   // how many sessions included this exercise
  readonly totalSetsCompleted: number; // cumulative sets where completed === true
  readonly totalSetsAttempted: number; // cumulative sets attempted (all results)
  readonly totalActual: number;       // sum of actual values across all sets
  readonly totalTarget: number;       // sum of target values across all sets
  readonly durationSets: readonly DurationSetDetail[]; // per-set detail for duration exercises
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

function collectDurationSets(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): DurationSetDetail[] {
  const details: DurationSetDetail[] = [];
  for (const s of sessions) {
    for (const r of s.results) {
      if (r.exerciseId === exerciseId) {
        details.push({ target: r.target, actual: r.actual });
      }
    }
  }
  return details;
}

function sumField(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
  field: 'actual' | 'target',
): number {
  return sessions.reduce(
    (sum, s) =>
      sum +
      s.results
        .filter((r) => r.exerciseId === exerciseId)
        .reduce((acc, r) => acc + r[field], 0),
    0,
  );
}

/**
 * Build cumulative summary grouped by exercise type.
 *
 * @param history - The full workout history from storage
 * @param exerciseInfo - Map of exerciseId → { name, type }. This keeps the
 *   summary logic decoupled from the exercise definitions, so it works
 *   when the exercise library grows.
 */
export function buildSummary(
  history: WorkoutHistory,
  exerciseInfo: ReadonlyMap<string, { name: string; type: ExerciseType }>,
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
    const info = exerciseInfo.get(id);
    summaries.push({
      exerciseId: id,
      exerciseName: info?.name ?? id,
      exerciseType: info?.type ?? 'reps',
      completionCount: countSessionsWithExercise(history.sessions, id),
      totalSetsCompleted: countCompletedSets(history.sessions, id),
      totalSetsAttempted: countAttemptedSets(history.sessions, id),
      totalActual: sumField(history.sessions, id, 'actual'),
      totalTarget: sumField(history.sessions, id, 'target'),
      durationSets: (info?.type ?? 'reps') === 'duration'
        ? collectDurationSets(history.sessions, id)
        : [],
    });
  }

  return summaries;
}
