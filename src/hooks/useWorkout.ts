import { useReducer, createContext, useContext } from 'react';
import type { WorkoutState, WorkoutAction, StorageAdapter } from '../types/workout';
import { workoutReducer, createInitialState } from '../logic/workoutReducer';
import { MVP_WORKOUT } from '../data/exercises';

// ── Context ──────────────────────────────────────────────────────

interface WorkoutContextValue {
  state: WorkoutState;
  dispatch: React.Dispatch<WorkoutAction>;
  savedSession: WorkoutState | null;
  storage: StorageAdapter;
}

export const WorkoutContext = createContext<WorkoutContextValue | null>(null);

// ── Hook ─────────────────────────────────────────────────────────

export function useWorkoutReducer(storage: StorageAdapter) {
  const [state, dispatch] = useReducer(workoutReducer, MVP_WORKOUT, createInitialState);

  // Check for a saved session to offer resume
  const savedSession = state.screen === 'welcome' ? storage.loadSession() : null;

  return { state, dispatch, savedSession, storage };
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutContext');
  return ctx;
}
