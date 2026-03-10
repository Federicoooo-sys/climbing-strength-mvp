import { useWorkout } from '../hooks/useWorkout';
import { currentExercise } from '../logic/workoutReducer';

export function EarlyStopScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);

  return (
    <div>
      <h2>Stop {exercise.name} early?</h2>
      {state.failedSetsInExercise >= 2 && (
        <p>We recommend skipping the remaining sets.</p>
      )}
      <button onClick={() => dispatch({ type: 'ACCEPT_EARLY_STOP' })}>
        Skip remaining sets
      </button>
      <button onClick={() => dispatch({ type: 'DECLINE_EARLY_STOP' })}>
        Continue
      </button>
    </div>
  );
}
