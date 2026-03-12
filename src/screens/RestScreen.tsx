import { useWorkout } from '../hooks/useWorkout';
import { TimerDisplay } from '../components/TimerDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets } from '../logic/workoutReducer';

export function RestScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);

  return (
    <div>
      <ProgressBar current={completedWorkoutSets(state)} total={totalWorkoutSets(state)} />

      <div style={{ textAlign: 'center', paddingTop: 24 }}>
        <h2>Rest</h2>

        <div style={{ margin: '24px 0' }}>
          <TimerDisplay seconds={state.timer.secondsRemaining} label="Rest remaining" />
        </div>

        <p>Up next: {exercise.name} — Set {state.setIndex + 1}</p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => dispatch({ type: 'SKIP_REST' })}>
            Skip (-15s)
          </button>

          {state.pausedAt ? (
            <button onClick={() => dispatch({ type: 'UNPAUSE' })}>
              Resume
            </button>
          ) : (
            <button
              onClick={() =>
                dispatch({ type: 'PAUSE', payload: { now: Date.now() } })
              }
            >
              Pause
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
