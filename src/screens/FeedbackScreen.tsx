import { useState } from 'react';
import { useWorkout } from '../hooks/useWorkout';
import { currentExercise } from '../logic/workoutReducer';

export function FeedbackScreen() {
  const { state, dispatch } = useWorkout();
  const exercise = currentExercise(state);
  const target = state.currentSetResult?.target ?? 0;
  const unit = exercise.type === 'reps' ? 'reps' : 'seconds';

  if (state.feedbackStep === 'completed') {
    return (
      <div>
        <h2>Did you complete all {target} {unit}?</h2>
        <button onClick={() => dispatch({ type: 'ADVANCE_FEEDBACK', payload: { completed: true } })}>
          Yes
        </button>
        <button onClick={() => dispatch({ type: 'ADVANCE_FEEDBACK', payload: { completed: false } })}>
          No
        </button>
      </div>
    );
  }

  if (state.feedbackStep === 'actual-count') {
    return <ActualCountInput target={target} unit={unit} />;
  }

  if (state.feedbackStep === 'intensity') {
    return <IntensityInput />;
  }

  return null;
}

function ActualCountInput({ target, unit }: { target: number; unit: string }) {
  const { dispatch } = useWorkout();
  const [value, setValue] = useState(0);

  return (
    <div>
      <h2>How many {unit} did you complete?</h2>
      <input
        type="number"
        min={0}
        max={target - 1}
        value={value}
        onChange={(e) => setValue(Math.max(0, Math.min(target - 1, Number(e.target.value))))}
        style={{ fontSize: '1.5rem', width: 80, textAlign: 'center' }}
      />
      <br />
      <button onClick={() => dispatch({ type: 'SUBMIT_FEEDBACK', payload: { value } })}>
        Submit
      </button>
    </div>
  );
}

function IntensityInput() {
  const { dispatch } = useWorkout();
  const [value, setValue] = useState(5);

  return (
    <div>
      <h2>How hard was that? (1–10)</h2>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <p style={{ fontSize: '2rem' }}>{value}</p>
      <button onClick={() => dispatch({ type: 'SUBMIT_FEEDBACK', payload: { value } })}>
        Submit
      </button>
    </div>
  );
}
