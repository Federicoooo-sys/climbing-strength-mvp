import { useWorkout } from '../hooks/useWorkout';
import { TimerDisplay } from '../components/TimerDisplay';
import { currentExercise } from '../logic/workoutReducer';

export function ActiveScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentTargets[state.exerciseIndex];
  const unit = exercise.type === 'reps' ? 'reps' : 'sec';
  const isUrgent = state.timer.secondsRemaining <= 5 && state.timer.secondsRemaining > 0;

  const timerLabel = exercise.type === 'reps' ? 'Time cap' : 'Hold for';

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>{exercise.name}</h2>
      <p>Set {state.setIndex + 1} of {exercise.sets}</p>
      <p style={{ fontSize: '1.25rem' }}>Target: {target} {unit}</p>

      <div style={{ margin: '24px 0' }}>
        <TimerDisplay
          seconds={state.timer.secondsRemaining}
          label={timerLabel}
          urgent={isUrgent}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
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
    </div>
  );
}
