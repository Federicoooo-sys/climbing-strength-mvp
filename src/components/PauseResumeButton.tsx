import { useWorkout } from '../hooks/useWorkout';
import { SecondaryButton } from './ui/Primitives';

export function PauseResumeButton() {
  const { state, dispatch } = useWorkout();

  if (state.pausedAt) {
    return (
      <SecondaryButton
        label="Resume"
        onClick={() => dispatch({ type: 'UNPAUSE' })}
      />
    );
  }

  return (
    <SecondaryButton
      label="Pause"
      onClick={() => dispatch({ type: 'PAUSE', payload: { now: Date.now() } })}
    />
  );
}
