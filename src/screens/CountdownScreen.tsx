import { useWorkout } from '../hooks/useWorkout';
import { TimerDisplay } from '../components/TimerDisplay';
import { currentExercise } from '../logic/workoutReducer';

export function CountdownScreen() {
  const { state } = useWorkout();
  const exercise = currentExercise(state);

  return (
    <div style={{ textAlign: 'center', paddingTop: 64 }}>
      <p>Get ready for</p>
      <h2>{exercise.name}</h2>
      <TimerDisplay seconds={state.timer.secondsRemaining} />
    </div>
  );
}
