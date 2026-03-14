import { useWorkout } from '../hooks/useWorkout';
import {
  ScreenShell,
  PageTitle,
  PageSubtitle,
  PrimaryButton,
} from '../components/ui/Primitives';

export function CongratsScreen() {
  const { state, dispatch } = useWorkout();

  const totalSets = state.setResults.length;
  const completedSets = state.setResults.filter((r) => r.completed).length;
  const skippedExercises = state.earlyStoppedExercises.length;

  return (
    <ScreenShell>
      <div className="flex flex-col items-center justify-center gap-6 flex-1 text-center">
        <PageTitle>Workout Complete!</PageTitle>

        <PageSubtitle>
          You finished {completedSets} of {totalSets} sets.
          {skippedExercises > 0 && (
            <span> ({skippedExercises} exercise{skippedExercises > 1 ? 's' : ''} stopped early)</span>
          )}
        </PageSubtitle>

        <div className="w-full mt-8">
          <PrimaryButton
            label="View Summary"
            onClick={() => dispatch({ type: 'VIEW_SUMMARY' })}
          />
        </div>
      </div>
    </ScreenShell>
  );
}
