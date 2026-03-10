import { useWorkout } from '../hooks/useWorkout';

export function WelcomeScreen() {
  const { dispatch, savedSession } = useWorkout();

  return (
    <div>
      <h1>Climbing Strength</h1>
      <p>Upper Body Assessment</p>

      {savedSession ? (
        <>
          <button onClick={() => dispatch({
            type: 'RESUME_WORKOUT',
            payload: { savedState: savedSession, now: Date.now() },
          })}>
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
  );
}
