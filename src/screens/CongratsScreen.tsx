import { useWorkout } from '../hooks/useWorkout';

export function CongratsScreen() {
  const { state, dispatch } = useWorkout();

  const totalSets = state.setResults.length;
  const completedSets = state.setResults.filter((r) => r.completed).length;
  const skippedExercises = state.earlyStoppedExercises.length;

  return (
    <div style={{ textAlign: 'center', paddingTop: 48 }}>
      <h1>Workout Complete!</h1>

      <p style={{ fontSize: 18, margin: '24px 0' }}>
        You finished {completedSets} of {totalSets} sets.
        {skippedExercises > 0 && (
          <span> ({skippedExercises} exercise{skippedExercises > 1 ? 's' : ''} stopped early)</span>
        )}
      </p>

      <button
        onClick={() => dispatch({ type: 'VIEW_SUMMARY' })}
        style={{ fontSize: 18, padding: '12px 32px', marginTop: 16 }}
      >
        View Summary
      </button>
    </div>
  );
}
