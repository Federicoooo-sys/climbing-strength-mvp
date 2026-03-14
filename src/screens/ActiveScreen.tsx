import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { PauseResumeButton } from '../components/PauseResumeButton';
import { currentExercise, totalWorkoutSets, completedWorkoutSets, exerciseUnit } from '../logic/workoutSelectors';
import {
  ScreenShell,
  ExerciseName,
  ContextLine,
  TargetBadge,
  BigDisplay,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Primitives';
import { formatTimer } from '../logic/timer';

export function ActiveScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentTargets[state.exerciseIndex];
  const unit = exerciseUnit(exercise.type);
  const isUrgent = state.timer.secondsRemaining <= 5 && state.timer.secondsRemaining > 0;
  const timerLabel = exercise.type === 'reps' ? 'Time cap' : 'Hold for';

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
        <div className="flex flex-col items-center gap-2">
          <ExerciseName>{exercise.name}</ExerciseName>
          <ContextLine>
            Set {state.setIndex + 1} of {exercise.sets}
          </ContextLine>
          <TargetBadge label={`Target: ${target} ${unit}`} />
        </div>

        <BigDisplay
          value={formatTimer(state.timer.secondsRemaining)}
          label={timerLabel}
          urgent={isUrgent}
        />

        <div className="flex flex-col gap-3 w-full mt-auto">
          {exercise.type === 'reps' && (
            <PrimaryButton
              label="Done"
              onClick={() => dispatch({ type: 'COMPLETE_SET' })}
            />
          )}
          {exercise.type === 'duration' && (
            <SecondaryButton
              label="End this set"
              onClick={() => dispatch({ type: 'END_DURATION_SET' })}
            />
          )}
          <PauseResumeButton />
        </div>
      </div>
    </ScreenShell>
  );
}
