import { useEffect } from 'react';
import type { WorkoutState, WorkoutAction } from '../types/workout';

/**
 * Auto-pauses the active set timer when the user leaves the tab
 * or locks their phone. Rest timers are intentionally left running
 * so rest continues to count down in the background.
 *
 * When the user returns, the ActiveScreen already shows a "Resume"
 * button, so no extra UI is needed — they tap Resume to continue.
 */
export function useVisibilityPause(
  state: WorkoutState,
  dispatch: React.Dispatch<WorkoutAction>,
) {
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === 'hidden' &&
        state.screen === 'active' &&
        state.timer.isRunning &&
        state.pausedAt === null
      ) {
        dispatch({ type: 'PAUSE', payload: { now: Date.now() } });
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.screen, state.timer.isRunning, state.pausedAt, dispatch]);
}
