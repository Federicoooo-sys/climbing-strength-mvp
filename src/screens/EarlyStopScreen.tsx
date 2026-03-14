import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets } from '../logic/workoutSelectors';
import { shouldRecommendEarlyStop } from '../logic/progression';
import {
  ScreenShell,
  QuestionText,
  ContextLine,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Primitives';

export function EarlyStopScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const isRecommended = shouldRecommendEarlyStop(state.failedSetsInExercise);
  const remainingSets = exercise.sets - state.setIndex - 1;

  return (
    <ScreenShell
      progressBar={
        <ProgressBar
          current={completedWorkoutSets(state)}
          total={totalWorkoutSets(state)}
        />
      }
    >
      <div className="flex flex-col items-center gap-6 flex-1">
        {isRecommended ? (
          <>
            <QuestionText>We recommend stopping {exercise.name}</QuestionText>
            <ContextLine>
              You've had {state.failedSetsInExercise} failed sets in a row.
              Skipping the remaining {remainingSets} {remainingSets === 1 ? 'set' : 'sets'} may
              help avoid injury.
            </ContextLine>
          </>
        ) : (
          <>
            <QuestionText>Stop {exercise.name} early?</QuestionText>
            <ContextLine>
              You can skip the remaining {remainingSets} {remainingSets === 1 ? 'set' : 'sets'} and
              move to the next exercise.
            </ContextLine>
          </>
        )}

        <div className="flex flex-col gap-3 w-full mt-auto">
          <PrimaryButton
            label="Skip remaining sets"
            onClick={() => dispatch({ type: 'ACCEPT_EARLY_STOP' })}
          />
          <SecondaryButton
            label="Keep going"
            onClick={() => dispatch({ type: 'DECLINE_EARLY_STOP' })}
          />
        </div>
      </div>
    </ScreenShell>
  );
}
