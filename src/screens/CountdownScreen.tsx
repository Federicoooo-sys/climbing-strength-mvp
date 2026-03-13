import { useWorkout } from '../hooks/useWorkout';
import { TimerDisplay } from '../components/TimerDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets, exerciseUnit } from '../logic/workoutSelectors';

export function CountdownScreen() {
  const { state } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentTargets[state.exerciseIndex];
  const unit = exerciseUnit(exercise.type);

  return (
    <div>
      <ProgressBar current={completedWorkoutSets(state)} total={totalWorkoutSets(state)} />

      <div style={{ textAlign: 'center', paddingTop: 48 }}>
        <p style={{ opacity: 0.7, marginBottom: 4 }}>Get ready</p>
        <h2 style={{ marginTop: 0 }}>{exercise.name}</h2>
        <p>
          Set {state.setIndex + 1} of {exercise.sets} — {target} {unit}
        </p>

        <div style={{ margin: '32px 0' }}>
          <TimerDisplay seconds={state.timer.secondsRemaining} />
        </div>
      </div>
    </div>
  );
}
