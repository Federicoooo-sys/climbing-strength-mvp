import { useState } from 'react';
import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets, exerciseUnit } from '../logic/workoutSelectors';
import {
  ScreenShell,
  ContextLine,
  QuestionText,
  BigDisplay,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Primitives';

export function FeedbackScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentSetResult?.target ?? 0;
  const unit = exerciseUnit(exercise.type, 'long');

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
        <ContextLine>
          {exercise.name} — Set {state.setIndex + 1}
        </ContextLine>

        {state.feedbackStep === 'completed' && (
          <div className="flex flex-col items-center gap-6 flex-1 w-full">
            <QuestionText>
              Did you complete all {target} {unit}?
            </QuestionText>
            <div className="flex flex-col gap-3 w-full mt-auto">
              <PrimaryButton
                label="Yes"
                onClick={() =>
                  dispatch({ type: 'ADVANCE_FEEDBACK', payload: { completed: true } })
                }
              />
              <SecondaryButton
                label="No"
                onClick={() =>
                  dispatch({ type: 'ADVANCE_FEEDBACK', payload: { completed: false } })
                }
              />
            </div>
          </div>
        )}

        {state.feedbackStep === 'actual-count' && (
          <ActualCountInput target={target} unit={unit} />
        )}

        {state.feedbackStep === 'intensity' && <IntensityInput />}
      </div>
    </ScreenShell>
  );
}

// ── Actual count sub-step ────────────────────────────────

function ActualCountInput({ target, unit }: { target: number; unit: string }) {
  const { dispatch } = useWorkout();
  const [value, setValue] = useState(0);
  const max = target - 1;

  return (
    <div className="flex flex-col items-center gap-6 flex-1 w-full">
      <QuestionText>How many {unit} did you complete?</QuestionText>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => setValue((v) => Math.max(0, v - 1))}
          disabled={value <= 0}
          className="w-12 h-12 rounded-full border border-slate-200 bg-white text-slate-700 text-xl font-bold cursor-pointer disabled:opacity-30"
        >
          −
        </button>
        <span className="text-5xl font-bold tabular-nums text-slate-900 min-w-[64px] text-center">
          {value}
        </span>
        <button
          onClick={() => setValue((v) => Math.min(max, v + 1))}
          disabled={value >= max}
          className="w-12 h-12 rounded-full border border-slate-200 bg-white text-slate-700 text-xl font-bold cursor-pointer disabled:opacity-30"
        >
          +
        </button>
      </div>

      <p className="text-sm text-slate-400">0 – {max} {unit}</p>

      <div className="w-full mt-auto">
        <PrimaryButton
          label="Submit"
          onClick={() => dispatch({ type: 'SUBMIT_FEEDBACK', payload: { value } })}
        />
      </div>
    </div>
  );
}

// ── Intensity sub-step ───────────────────────────────────

function IntensityInput() {
  const { dispatch } = useWorkout();
  const [value, setValue] = useState(5);

  return (
    <div className="flex flex-col items-center gap-6 flex-1 w-full">
      <QuestionText>How hard was that?</QuestionText>

      <BigDisplay value={`${value}`} label="Intensity" />

      <div className="w-full px-4">
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900
            [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:border-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">Easy</span>
          <span className="text-xs text-slate-400">Max effort</span>
        </div>
      </div>

      <div className="w-full mt-auto">
        <PrimaryButton
          label="Submit"
          onClick={() => dispatch({ type: 'SUBMIT_FEEDBACK', payload: { value } })}
        />
      </div>
    </div>
  );
}
