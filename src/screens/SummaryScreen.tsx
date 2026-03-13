import { useMemo } from 'react';
import { useWorkout } from '../hooks/useWorkout';
import { buildSummary } from '../logic/summary';

export function SummaryScreen() {
  const { state, dispatch, storage } = useWorkout();

  const summaries = useMemo(() => {
    const history = storage.loadHistory();
    const infoMap = new Map(
      state.template.exercises.map((e) => [e.id, { name: e.name, type: e.type }]),
    );
    return buildSummary(history, infoMap);
  }, [state.template.exercises, storage]);

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
                {s.durationSets.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0' }}>
                    {s.durationSets.map((d, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#888' }}>
                        Set {i + 1}: {d.actual} / {d.target} seconds
                      </li>
                    ))}
                  </ul>
                )}
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
