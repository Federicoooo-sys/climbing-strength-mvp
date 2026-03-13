import { useWorkout } from '../hooks/useWorkout';

export function PauseResumeButton() {
  const { state, dispatch } = useWorkout();

  if (state.pausedAt) {
    return (
      <button onClick={() => dispatch({ type: 'UNPAUSE' })}>
        Resume
      </button>
    );
  }

  return (
    <button
      onClick={() =>
        dispatch({ type: 'PAUSE', payload: { now: Date.now() } })
      }
    >
      Pause
    </button>
  );
}
