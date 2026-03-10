import { useEffect, useRef } from 'react';
import type { WorkoutState, WorkoutAction } from '../types/workout';

/**
 * Drives the 1 Hz timer tick. Starts/stops the interval
 * based on `state.timer.isRunning`.
 */
export function useTimer(
  state: WorkoutState,
  dispatch: React.Dispatch<WorkoutAction>,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.timer.isRunning) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TIMER_TICK' });
      }, 1000);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.timer.isRunning, dispatch]);
}
