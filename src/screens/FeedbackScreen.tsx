import { useState } from 'react';
import { useWorkout } from '../hooks/useWorkout';
import { ProgressBar } from '../components/ProgressBar';
import { currentExercise, totalWorkoutSets, completedWorkoutSets } from '../logic/workoutReducer';

export function FeedbackScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentSetResult?.target ?? 0;
  const unit = exercise.type === 'reps' ? 'reps' : 'seconds';

  return (
    <div>
      <ProgressBar current={completedWorkoutSets(state)} total={totalWorkoutSets(state)} />

      <div style={{ textAlign: 'center', paddingTop: 24 }}>
        <p style={{ opacity: 0.7, marginBottom: 0 }}>
          {exercise.name} — Set {state.setIndex + 1}
        </p>

        {state.feedbackStep === 'completed' && (
          <>
            <h2 style={{ marginBottom: 24 }}>
              Did you complete all {target} {unit}?
            </h2>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() =>
                  dispatch({ type: 'ADVANCE_FEEDBACK', payload: { completed: true } })
                }
              >
                Yes
              </button>
              <button
                onClick={() =>
                  dispatch({ type: 'ADVANCE_FEEDBACK', payload: { completed: false } })
                }
              >
                No
              </button>
            </div>
          </>
        )}

        {state.feedbackStep === 'actual-count' && (
          <ActualCountInput target={target} unit={unit} />
        )}

        {state.feedbackStep === 'intensity' && <IntensityInput />}
      </div>
    </div>
  );
}

// ── Actual count sub-step ────────────────────────────────────────

function ActualCountInput({ target, unit }: { target: number; unit: string }) {
  const { dispatch } = useWorkout();
  const [value, setValue] = useState(0);

  const max = target - 1;

  return (
    <>
      <h2>How many {unit} did you complete?</h2>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '16px 0' }}>
        <button
          onClick={() => setValue((v) => Math.max(0, v - 1))}
          disabled={value <= 0}
        >
          −
        </button>
        <span style={{ fontSize: '2rem', minWidth: 48, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        <button
          onClick={() => setValue((v) => Math.min(max, v + 1))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
      <p style={{ opacity: 0.5, fontSize: '0.875rem' }}>0 – {max} {unit}</p>
      <button onClick={() => dispatch({ type: 'SUBMIT_FEEDBACK', payload: { value } })}>
        Submit
      </button>
    </>
  );
}

// ── Intensity sub-step ───────────────────────────────────────────

function IntensityInput() {
  const { dispatch } = useWorkout();
  const [value, setValue] = useState(5);

  return (
    <>
      <h2>How hard was that?</h2>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: '80%', maxWidth: 300 }}
      />
      <p style={{ fontSize: '2rem', margin: '8px 0' }}>{value} / 10</p>
      <button onClick={() => dispatch({ type: 'SUBMIT_FEEDBACK', payload: { value } })}>
        Submit
      </button>
    </>
  );
}
