import { useMemo } from 'react';
import { useWorkout } from '../hooks/useWorkout';
import { buildSummary } from '../logic/summary';
import {
  ScreenShell,
  PageTitle,
  PrimaryButton,
} from '../components/ui/Primitives';

export function SummaryScreen() {
  const { state, dispatch, storage } = useWorkout();

  const summaries = useMemo(() => {
    const history = storage.loadHistory();
    const infoMap = new Map(
      state.template.exercises.map((e) => [e.id, { name: e.name, type: e.type }]),
    );
    return buildSummary(history, infoMap);
  }, [state.template.exercises, storage]);

  return (
    <ScreenShell>
      <PageTitle>Summary</PageTitle>

      {summaries.length === 0 ? (
        <p className="text-slate-500 mt-4">No workout history yet.</p>
      ) : (
        <div className="mt-6 flex flex-col">
          {summaries.map((s) => (
            <div
              key={s.exerciseId}
              className="py-4 border-b border-slate-100 last:border-b-0"
            >
              <div className="font-bold text-slate-900 mb-1">
                {s.exerciseName}
              </div>
              <div className="text-sm text-slate-500">
                Sessions: {s.completionCount} &middot;{' '}
                Sets: {s.totalSetsCompleted} / {s.totalSetsAttempted} completed
                {s.durationSets.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {s.durationSets.map((d, i) => (
                      <div key={i} className="text-xs text-slate-400">
                        Set {i + 1}: {d.actual} / {d.target} seconds
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <PrimaryButton
          label="Start New Workout"
          onClick={() => dispatch({ type: 'RESET' })}
        />
      </div>
    </ScreenShell>
  );
}
