import { useMemo } from 'react';
import { useWorkout } from '../hooks/useWorkout';
import { localStorageAdapter } from '../storage/localStorage';
import { buildSummary } from '../logic/summary';

export function SummaryScreen() {
  const { state, dispatch } = useWorkout();

  const summaries = useMemo(() => {
    const history = localStorageAdapter.loadHistory();
    const nameMap = new Map(
      state.template.exercises.map((e) => [e.id, e.name]),
    );
    return buildSummary(history, nameMap);
  }, [state.template.exercises]);

  return (
    <div>
      <h1>Summary</h1>

      {summaries.length === 0 ? (
        <p>No workout history yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {summaries.map((s) => (
            <li
              key={s.exerciseId}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {s.exerciseName}
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>
                Sessions: {s.completionCount} &middot;{' '}
                Sets: {s.totalSetsCompleted} / {s.totalSetsAttempted} completed
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => dispatch({ type: 'RESET' })}
        style={{ fontSize: 16, padding: '10px 24px', marginTop: 24 }}
      >
        Start New Workout
      </button>
    </div>
  );
}
