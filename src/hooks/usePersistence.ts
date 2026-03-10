import { useEffect, useRef } from 'react';
import type { WorkoutState } from '../types/workout';
import type { StorageAdapter } from '../storage/storageAdapter';

/**
 * Persists workout state to storage on every meaningful change.
 * When a completed session is detected, appends it to history.
 */
export function usePersistence(
  state: WorkoutState,
  storage: StorageAdapter,
) {
  const sessionAppended = useRef(false);

  useEffect(() => {
    // Fresh welcome — nothing to persist
    if (state.screen === 'welcome' && state.sessionId === '') {
      sessionAppended.current = false;
      return;
    }

    // Workout complete — append session to history (once) and clear saved session
    if (state.completedSession && !sessionAppended.current) {
      storage.appendSession(state.completedSession);
      storage.clearSession();
      sessionAppended.current = true;
      return;
    }

    // Summary/reset — don't save active session
    if (state.screen === 'summary') {
      return;
    }

    // Normal — save active session state
    if (state.screen !== 'congrats') {
      storage.saveSession(state);
    }
  }, [state, storage]);
}
