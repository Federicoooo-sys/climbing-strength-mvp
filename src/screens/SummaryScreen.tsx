import { useWorkout } from '../hooks/useWorkout';

export function SummaryScreen() {
  const { dispatch } = useWorkout();

  return (
    <div>
      <h1>Summary</h1>
      <p>TODO: cumulative completion counts by exercise type from localStorage</p>
      <button onClick={() => dispatch({ type: 'RESET' })}>
        Start New Workout
      </button>
    </div>
  );
}
