import { useWorkout } from '../hooks/useWorkout';
import { TimerDisplay } from '../components/TimerDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { currentExercise, totalWorkoutSets, completedWorkoutSets, exerciseUnit } from '../logic/workoutSelectors';

export function ActiveScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentTargets[state.exerciseIndex];
  const unit = exerciseUnit(exercise.type);
  const isUrgent = state.timer.secondsRemaining <= 5 && state.timer.secondsRemaining > 0;
  const timerLabel = exercise.type === 'reps' ? 'Time cap' : 'Hold for';

  return (
    <div>
      <ProgressBar current={completedWorkoutSets(state)} total={totalWorkoutSets(state)} />

      <div style={{ textAlign: 'center', paddingTop: 24 }}>
        <h2 style={{ marginBottom: 4 }}>{exercise.name}</h2>
        <p style={{ opacity: 0.7, marginTop: 0 }}>
          Set {state.setIndex + 1} of {exercise.sets}
        </p>

        <p style={{ fontSize: '1.25rem', margin: '16px 0' }}>
          Target: {target} {unit}
        </p>

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

          <PauseResumeButton />
        </div>
      </div>
    </div>
  );
}
