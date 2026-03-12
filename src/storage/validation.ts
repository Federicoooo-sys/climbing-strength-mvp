import type { WorkoutState, WorkoutHistory, Screen } from '../types/workout';

/**
 * Runtime validation for data loaded from storage.
 *
 * JSON.parse returns `unknown` — we can't trust that the shape matches
 * our TypeScript interfaces. These guards check the critical fields so
 * the app fails gracefully instead of crashing on corrupt/stale data.
 */

const VALID_SCREENS: readonly Screen[] = [
  'welcome', 'countdown', 'active', 'feedback',
  'rest', 'earlyStop', 'congrats', 'summary',
];

export function isValidWorkoutState(data: unknown): data is WorkoutState {
  if (data === null || typeof data !== 'object') return false;

  const s = data as Record<string, unknown>;

  return (
    typeof s.screen === 'string' &&
    VALID_SCREENS.includes(s.screen as Screen) &&
    typeof s.sessionId === 'string' &&
    typeof s.exerciseIndex === 'number' &&
    typeof s.setIndex === 'number' &&
    typeof s.sessionStartedAt === 'number' &&
    typeof s.lastSavedAt === 'number' &&
    typeof s.failedSetsInExercise === 'number' &&
    typeof s.audioSignal === 'number' &&
    Array.isArray(s.currentTargets) &&
    Array.isArray(s.setResults) &&
    Array.isArray(s.earlyStoppedExercises) &&
    s.timer !== null &&
    typeof s.timer === 'object' &&
    typeof (s.timer as Record<string, unknown>).secondsRemaining === 'number' &&
    typeof (s.timer as Record<string, unknown>).isRunning === 'boolean' &&
    s.template !== null &&
    typeof s.template === 'object' &&
    Array.isArray((s.template as Record<string, unknown>).exercises)
  );
}

export function isValidWorkoutHistory(data: unknown): data is WorkoutHistory {
  if (data === null || typeof data !== 'object') return false;

  const h = data as Record<string, unknown>;

  return (
    h.version === 1 &&
    Array.isArray(h.sessions)
  );
}
