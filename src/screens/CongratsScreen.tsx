import { useWorkout } from '../hooks/useWorkout';

export function CongratsScreen() {
  const { dispatch } = useWorkout();

  return (
    <div>
      <h1>Workout Complete!</h1>
      <button onClick={() => dispatch({ type: 'VIEW_SUMMARY' })}>
        View Summary
      </button>
    </div>
  );
}
