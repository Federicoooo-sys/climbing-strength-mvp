import { useWorkout } from '../hooks/useWorkout';
import { exerciseUnit } from '../logic/workoutSelectors';
import {
  ScreenShell,
  PageTitle,
  PageSubtitle,
  ExerciseRow,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Primitives';

export function WelcomeScreen() {
  const { state, dispatch, savedSession } = useWorkout();

  return (
    <ScreenShell>
      <div className="flex flex-col gap-2">
        <PageTitle>Climbing Strength</PageTitle>
        <PageSubtitle>{state.template.name}</PageSubtitle>
      </div>

      <div className="mt-8 mb-8">
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Today's workout
        </p>
        <div>
          {state.template.exercises.map((ex) => {
            const unit = exerciseUnit(ex.type);
            const meta = `${ex.sets} × ${ex.defaultTarget} ${unit}`;
            return <ExerciseRow key={ex.id} name={ex.name} meta={meta} />;
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        {savedSession ? (
          <>
            <PrimaryButton
              label="Resume Workout"
              onClick={() =>
                dispatch({
                  type: 'RESUME_WORKOUT',
                  payload: { savedState: savedSession, now: Date.now() },
                })
              }
            />
            <SecondaryButton
              label="Start New Workout"
              onClick={() => dispatch({ type: 'START_WORKOUT' })}
            />
          </>
        ) : (
          <PrimaryButton
            label="Start Workout"
            onClick={() => dispatch({ type: 'START_WORKOUT' })}
          />
        )}
      </div>
    </ScreenShell>
  );
}
