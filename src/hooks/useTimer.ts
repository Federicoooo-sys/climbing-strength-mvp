import { useEffect, useRef } from 'react';
import type { WorkoutState, WorkoutAction } from '../types/workout';

/**
 * Drives the 1 Hz timer tick and fires a callback on timer expiry.
 *
 * - Starts/stops a setInterval based on `state.timer.isRunning`
 * - Watches `state.audioSignal` (a counter incremented by the reducer
 *   on natural timer expiry) and calls `onTimerExpire` when it changes.
 *
 * The audio signal approach is needed because timer expiry is often
 * atomic in the reducer — e.g. rest→active starts a new timer in the
 * same state update, so the intermediate {remaining:0, running:false}
 * is never rendered and can't be detected via refs.
 */
export function useTimer(
  state: WorkoutState,
  dispatch: React.Dispatch<WorkoutAction>,
  onTimerExpire?: () => void,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSignalRef = useRef(state.audioSignal);

  // ── 1 Hz tick driver ───────────────────────────────────────────
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

  // ── Audio signal watcher ───────────────────────────────────────
  useEffect(() => {
    if (state.audioSignal !== prevSignalRef.current) {
      prevSignalRef.current = state.audioSignal;
      onTimerExpire?.();
    }
  }, [state.audioSignal, onTimerExpire]);
}
