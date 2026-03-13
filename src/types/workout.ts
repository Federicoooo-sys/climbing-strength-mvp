// ── Exercise & Template ──────────────────────────────────────────

export type ExerciseType = 'reps' | 'duration';

export interface ExerciseDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: ExerciseType;
  readonly defaultTarget: number;
  readonly sets: number;
  readonly timeCap: number | null;     // seconds; null = no cap (duration exercises)
  readonly restBetweenSetsSec: number;
  readonly restAfterExerciseSec: number;
}

export interface WorkoutTemplate {
  readonly id: string;
  readonly name: string;
  readonly exercises: readonly ExerciseDefinition[];
}

// ── Timer ────────────────────────────────────────────────────────

export interface TimerState {
  readonly secondsRemaining: number;
  readonly isRunning: boolean;
}

// ── Feedback ─────────────────────────────────────────────────────

export type FeedbackStep = 'completed' | 'actual-count' | 'intensity';

// ── Set Result ───────────────────────────────────────────────────

export interface SetResult {
  readonly exerciseId: string;
  readonly exerciseIndex: number;
  readonly setIndex: number;
  readonly target: number;
  readonly completed: boolean;
  readonly actual: number;
  readonly intensity: number | null;
  readonly failed: boolean;
  readonly timestamp: number;
}

// ── Screens ──────────────────────────────────────────────────────

export type Screen =
  | 'welcome'
  | 'countdown'
  | 'active'
  | 'feedback'
  | 'rest'
  | 'earlyStop'
  | 'congrats'
  | 'summary';

// ── Workout State ────────────────────────────────────────────────

export interface WorkoutState {
  readonly screen: Screen;
  readonly template: WorkoutTemplate;
  readonly currentTargets: number[];
  readonly exerciseIndex: number;
  readonly setIndex: number;
  readonly timer: TimerState;
  readonly feedbackStep: FeedbackStep;
  readonly currentSetResult: Partial<SetResult> | null;
  readonly setResults: SetResult[];
  readonly failedSetsInExercise: number;
  readonly earlyStoppedExercises: string[];
  readonly pausedAt: number | null;
  readonly lastSavedAt: number;
  readonly sessionId: string;
  readonly sessionStartedAt: number;
  readonly completedSession: WorkoutSession | null;
  readonly audioSignal: number;
}

// ── Session & History (persistence) ──────────────────────────────

export interface WorkoutSession {
  readonly id: string;
  readonly templateId: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly results: SetResult[];
  readonly earlyStoppedExercises: string[];
}

export interface WorkoutHistory {
  readonly version: 1;
  readonly sessions: WorkoutSession[];
}

// ── Storage ──────────────────────────────────────────────────────

export interface StorageAdapter {
  loadSession(): WorkoutState | null;
  saveSession(state: WorkoutState): void;
  clearSession(): void;
  loadHistory(): WorkoutHistory;
  appendSession(session: WorkoutSession): void;
}

// ── Actions ──────────────────────────────────────────────────────

export type WorkoutAction =
  | { type: 'START_WORKOUT' }
  | { type: 'RESUME_WORKOUT'; payload: { savedState: WorkoutState; now: number } }
  | { type: 'TIMER_TICK' }
  | { type: 'COMPLETE_SET' }
  | { type: 'END_DURATION_SET' }
  | { type: 'ADVANCE_FEEDBACK'; payload: { completed?: boolean; actual?: number } }
  | { type: 'SUBMIT_FEEDBACK'; payload: { value: number } }
  | { type: 'SKIP_REST' }
  | { type: 'PAUSE'; payload: { now: number } }
  | { type: 'UNPAUSE' }
  | { type: 'ACCEPT_EARLY_STOP' }
  | { type: 'DECLINE_EARLY_STOP' }
  | { type: 'VIEW_SUMMARY' }
  | { type: 'RESET' };
