import { useWorkout } from '../hooks/useWorkout';
import { exerciseUnit } from '../logic/workoutSelectors';

export function WelcomeScreen() {
  const { state, dispatch, savedSession } = useWorkout();

  return (
    <div style={{ textAlign: 'center', paddingTop: 48 }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>Climbing Strength</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>{state.template.name}</p>

      <div style={{ margin: '32px 0', textAlign: 'left' }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Today's workout</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {state.template.exercises.map((ex) => {
            const unit = exerciseUnit(ex.type);
            const detail = `${ex.sets} × ${ex.defaultTarget} ${unit}`;
            return (
              <li key={ex.id} style={{ padding: '6px 0', borderBottom: '1px solid #333' }}>
                {ex.name} — {detail}
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {savedSession ? (
          <>
            <button
              onClick={() =>
                dispatch({
                  type: 'RESUME_WORKOUT',
                  payload: { savedState: savedSession, now: Date.now() },
                })
              }
            >
              Resume Workout
            </button>
            <button onClick={() => dispatch({ type: 'START_WORKOUT' })}>
              Start New Workout
            </button>
          </>
        ) : (
          <button onClick={() => dispatch({ type: 'START_WORKOUT' })}>
            Start Workout
          </button>
        )}
      </div>
    </div>
  );
}
