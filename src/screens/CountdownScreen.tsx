import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets, exerciseUnit } from '../logic/workoutSelectors';
import {
  ScreenShell,
  ScreenLabel,
  ExerciseName,
  ContextLine,
  BigDisplay,
} from '../components/ui/Primitives';
import { formatTimer } from '../logic/timer';

export function CountdownScreen() {
  const { state } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentTargets[state.exerciseIndex];
  const unit = exerciseUnit(exercise.type);

  return (
    <ScreenShell
      progressBar={
        <ProgressBar
          current={completedWorkoutSets(state)}
          total={totalWorkoutSets(state)}
        />
      }
    >
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <div className="flex flex-col items-center gap-2">
          <ScreenLabel>Get ready</ScreenLabel>
          <ExerciseName>{exercise.name}</ExerciseName>
          <ContextLine>
            Set {state.setIndex + 1} of {exercise.sets} — {target} {unit}
          </ContextLine>
        </div>

        <BigDisplay value={formatTimer(state.timer.secondsRemaining)} />
      </div>
    </ScreenShell>
  );
}
