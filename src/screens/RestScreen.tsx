import { useWorkout } from '../hooks/useWorkout';
import { currentExercise } from '../logic/workoutReducer';

export function RestScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);

  return (
    <div>
      <h2>Rest</h2>
      <h1>{state.timer.secondsRemaining}s</h1>
      <p>Next: {exercise.name} — Set {state.setIndex + 1}</p>

      <button onClick={() => dispatch({ type: 'SKIP_REST' })}>
        Skip (-15s)
      </button>

      {state.pausedAt ? (
        <button onClick={() => dispatch({ type: 'UNPAUSE' })}>
          Resume
        </button>
      ) : (
        <button onClick={() => dispatch({ type: 'PAUSE', payload: { now: Date.now() } })}>
          Pause
        </button>
      )}
    </div>
  );
}
