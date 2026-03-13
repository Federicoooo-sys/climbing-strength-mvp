import { describe, it, expect } from 'vitest';
import { buildSummary } from '../summary';
import type { WorkoutHistory, WorkoutSession, SetResult } from '../../types/workout';

// ── Helpers ──────────────────────────────────────────────────────

function makeResult(overrides: Partial<SetResult> = {}): SetResult {
  return {
    exerciseId: 'pull-ups',
    exerciseIndex: 0,
    setIndex: 0,
    target: 4,
    completed: true,
    actual: 4,
    intensity: 5,
    failed: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeSession(results: SetResult[], overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'sess-1',
    templateId: 'mvp-upper-body',
    startedAt: Date.now(),
    completedAt: Date.now(),
    results,
    earlyStoppedExercises: [],
    ...overrides,
  };
}

const INFO = new Map([
  ['pull-ups', { name: 'Pull-ups', type: 'reps' as const }],
  ['ring-rows', { name: 'Ring Rows', type: 'reps' as const }],
  ['dead-hangs', { name: 'Dead Hangs', type: 'duration' as const }],
]);

// ── Tests ────────────────────────────────────────────────────────

describe('buildSummary', () => {
  it('returns empty array when there are no sessions', () => {
    const history: WorkoutHistory = { version: 1, sessions: [] };
    expect(buildSummary(history, INFO)).toEqual([]);
  });

  it('counts one session with one exercise', () => {
    const history: WorkoutHistory = {
      version: 1,
      sessions: [
        makeSession([
          makeResult({ exerciseId: 'pull-ups', completed: true }),
          makeResult({ exerciseId: 'pull-ups', setIndex: 1, completed: false, actual: 2, failed: false }),
        ]),
      ],
    };

    const result = buildSummary(history, INFO);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseId).toBe('pull-ups');
    expect(result[0].exerciseName).toBe('Pull-ups');
    expect(result[0].completionCount).toBe(1);
    expect(result[0].totalSetsCompleted).toBe(1);
    expect(result[0].totalSetsAttempted).toBe(2);
  });

  it('counts cumulative sessions across multiple workouts', () => {
    const session1 = makeSession(
      [makeResult({ exerciseId: 'pull-ups' })],
      { id: 'sess-1' },
    );
    const session2 = makeSession(
      [makeResult({ exerciseId: 'pull-ups' })],
      { id: 'sess-2' },
    );
    const session3 = makeSession(
      [makeResult({ exerciseId: 'pull-ups' })],
      { id: 'sess-3' },
    );

    const history: WorkoutHistory = {
      version: 1,
      sessions: [session1, session2, session3],
    };

    const result = buildSummary(history, INFO);
    expect(result[0].completionCount).toBe(3);
  });

  it('groups results by exercise type', () => {
    const history: WorkoutHistory = {
      version: 1,
      sessions: [
        makeSession([
          makeResult({ exerciseId: 'pull-ups' }),
          makeResult({ exerciseId: 'ring-rows', exerciseIndex: 1 }),
          makeResult({ exerciseId: 'dead-hangs', exerciseIndex: 2 }),
        ]),
      ],
    };

    const result = buildSummary(history, INFO);
    expect(result).toHaveLength(3);

    const pullUps = result.find((r) => r.exerciseId === 'pull-ups');
    const ringRows = result.find((r) => r.exerciseId === 'ring-rows');
    const deadHangs = result.find((r) => r.exerciseId === 'dead-hangs');

    expect(pullUps!.completionCount).toBe(1);
    expect(ringRows!.completionCount).toBe(1);
    expect(deadHangs!.completionCount).toBe(1);
  });

  it('handles sessions where an exercise was early-stopped (still counts)', () => {
    // If you attempted 1 set of pull-ups then early-stopped, it still
    // appears in results and counts as a session for that exercise.
    const history: WorkoutHistory = {
      version: 1,
      sessions: [
        makeSession(
          [makeResult({ exerciseId: 'pull-ups', completed: false, actual: 0, failed: true })],
          { earlyStoppedExercises: ['pull-ups'] },
        ),
      ],
    };

    const result = buildSummary(history, INFO);
    expect(result[0].completionCount).toBe(1);
    expect(result[0].totalSetsCompleted).toBe(0);
    expect(result[0].totalSetsAttempted).toBe(1);
  });

  it('uses exerciseId as name when not found in name map', () => {
    const history: WorkoutHistory = {
      version: 1,
      sessions: [
        makeSession([makeResult({ exerciseId: 'unknown-exercise' })]),
      ],
    };

    const result = buildSummary(history, INFO);
    expect(result[0].exerciseName).toBe('unknown-exercise');
  });

  it('accumulates sets across sessions correctly', () => {
    const session1 = makeSession([
      makeResult({ exerciseId: 'pull-ups', setIndex: 0, completed: true }),
      makeResult({ exerciseId: 'pull-ups', setIndex: 1, completed: true }),
      makeResult({ exerciseId: 'pull-ups', setIndex: 2, completed: false, actual: 2, failed: false }),
    ], { id: 'sess-1' });

    const session2 = makeSession([
      makeResult({ exerciseId: 'pull-ups', setIndex: 0, completed: true }),
      makeResult({ exerciseId: 'pull-ups', setIndex: 1, completed: true }),
      makeResult({ exerciseId: 'pull-ups', setIndex: 2, completed: true }),
    ], { id: 'sess-2' });

    const history: WorkoutHistory = {
      version: 1,
      sessions: [session1, session2],
    };

    const result = buildSummary(history, INFO);
    expect(result[0].completionCount).toBe(2);
    expect(result[0].totalSetsCompleted).toBe(5); // 2 + 3
    expect(result[0].totalSetsAttempted).toBe(6); // 3 + 3
  });
});
