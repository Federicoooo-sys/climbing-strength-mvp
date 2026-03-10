import { useWorkout } from '../hooks/useWorkout';
import { currentExercise } from '../logic/workoutReducer';

export function ActiveScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);

  return (
    <div>
      <h2>{exercise.name}</h2>
      <p>Set {state.setIndex + 1} of {exercise.sets}</p>
      <p>Target: {state.currentTargets[state.exerciseIndex]} {exercise.type === 'reps' ? 'reps' : 'sec'}</p>
      <h1>{state.timer.secondsRemaining}s</h1>

      {exercise.type === 'reps' && (
        <button onClick={() => dispatch({ type: 'COMPLETE_SET' })}>
          Done
        </button>
      )}

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
