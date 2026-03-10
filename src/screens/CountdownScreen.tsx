import { useWorkout } from '../hooks/useWorkout';

export function CountdownScreen() {
  const { state } = useWorkout();

  return (
    <div>
      <h1>{state.timer.secondsRemaining}</h1>
      <p>Get ready...</p>
    </div>
  );
}
