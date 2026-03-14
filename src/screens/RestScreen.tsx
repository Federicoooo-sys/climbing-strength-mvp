import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { currentExercise, totalWorkoutSets, completedWorkoutSets } from '../logic/workoutSelectors';
import {
  ScreenShell,
  ScreenLabel,
  BigDisplay,
  ContextLine,
  SecondaryButton,
} from '../components/ui/Primitives';
import { formatTimer } from '../logic/timer';

export function RestScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);

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
        <ScreenLabel>Rest</ScreenLabel>

        <BigDisplay
          value={formatTimer(state.timer.secondsRemaining)}
          label="Rest remaining"
        />

        <ContextLine>
          Up next: {exercise.name} — Set {state.setIndex + 1}
        </ContextLine>

        <div className="flex flex-col gap-3 w-full mt-auto">
          <SecondaryButton
            label="Skip (-15s)"
            onClick={() => dispatch({ type: 'SKIP_REST' })}
          />
          <PauseResumeButton />
        </div>
      </div>
    </ScreenShell>
  );
}
