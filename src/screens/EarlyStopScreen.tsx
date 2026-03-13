import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets } from '../logic/workoutSelectors';
import { shouldRecommendEarlyStop } from '../logic/progression';

export function EarlyStopScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const isRecommended = shouldRecommendEarlyStop(state.failedSetsInExercise);
  const remainingSets = exercise.sets - state.setIndex - 1;

  return (
    <div>
      <ProgressBar current={completedWorkoutSets(state)} total={totalWorkoutSets(state)} />

      <div style={{ textAlign: 'center', paddingTop: 24 }}>
        {isRecommended ? (
          <>
            <h2>We recommend stopping {exercise.name}</h2>
            <p>
              You've had {state.failedSetsInExercise} failed sets in a row.
              Skipping the remaining {remainingSets} {remainingSets === 1 ? 'set' : 'sets'} may
              help avoid injury.
            </p>
          </>
        ) : (
          <>
            <h2>Stop {exercise.name} early?</h2>
            <p>
              You can skip the remaining {remainingSets} {remainingSets === 1 ? 'set' : 'sets'} and
              move to the next exercise.
            </p>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <button onClick={() => dispatch({ type: 'ACCEPT_EARLY_STOP' })}>
            Skip remaining sets
          </button>
          <button onClick={() => dispatch({ type: 'DECLINE_EARLY_STOP' })}>
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
