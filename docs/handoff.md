# Climbing Strength MVP — Developer Handoff

## 1. What the App Does

A mobile-first web app that guides users through an adaptive upper-body strength workout:

- **3 exercises**: Pull-ups (3×4 reps), Ring Rows (3×6 reps), Dead Hangs (3×60s)
- **Auto-timed sets** with countdown, active timer, and rest periods
- **Adaptive progression**: targets adjust per-set based on completion and intensity
- **Early-stop system**: recommends stopping after 2 consecutive failed sets
- **Feedback flow**: completion → (partial count if failed) → intensity rating
- **Persistence**: saves mid-workout state to localStorage; resume on reload
- **Cumulative summary**: tracks completion counts across sessions

**Screen flow:** Welcome → Countdown → Active → Feedback → Rest → (repeat) → Congrats → Summary → Reset

---

## 2. Architecture Overview

```
src/
├── types/workout.ts          All type definitions
├── data/exercises.ts         MVP workout template
├── logic/                    Pure functions — zero React imports
│   ├── workoutReducer.ts     State machine (all transitions)
│   ├── progression.ts        Target adjustment + early-stop decisions
│   ├── timer.ts              Duration calculations + resume adjustment
│   ├── summary.ts            Cumulative session aggregation
│   └── workoutSelectors.ts   Read-only state queries
├── hooks/                    React hooks (side effects + state wiring)
│   ├── useWorkout.ts         Reducer init + context provider/consumer
│   ├── useTimer.ts           1 Hz interval + audio signal watcher
│   ├── useAudioCue.ts        Web Audio API beep
│   ├── usePersistence.ts     Auto-save state + append completed sessions
│   └── useVisibilityPause.ts Auto-pause on tab hide / phone lock
├── storage/
│   ├── localStorage.ts       StorageAdapter implementation
│   └── validation.ts         Type guards for hydrated data
├── components/               Stateless UI pieces
│   ├── TimerDisplay.tsx
│   ├── ProgressBar.tsx
│   └── PauseResumeButton.tsx
├── screens/                  One per screen in the flow
└── App.tsx                   Wires hooks + context, routes screens
```

**Key design decisions:**

- All business logic in `src/logic/` is pure — portable to React Native or any JS runtime
- Single reducer manages the entire workout state machine
- `StorageAdapter` interface decouples persistence from implementation
- Screens consume state via `useWorkout()` context hook — no prop drilling

---

## 3. Main Data Models

All defined in `src/types/workout.ts`.

| Type | Key fields |
|---|---|
| `ExerciseDefinition` | id, name, type (`reps`/`duration`), defaultTarget, sets, timeCap, rest durations |
| `WorkoutTemplate` | id, name, exercises[] |
| `WorkoutState` | screen, template, currentTargets[], exerciseIndex, setIndex, timer, feedbackStep, setResults[], pausedAt, audioSignal, completedSession |
| `SetResult` | exerciseId, target, completed, actual, intensity, failed, timestamp |
| `WorkoutSession` | id, templateId, startedAt, completedAt, results[], earlyStoppedExercises[] |
| `WorkoutHistory` | version: 1, sessions[] |
| `StorageAdapter` | loadSession, saveSession, clearSession, loadHistory, appendSession |

---

## 4. Reducer Actions

All in `src/logic/workoutReducer.ts`:

| Action | What it does |
|---|---|
| `START_WORKOUT` | Welcome → Countdown. Inits session, targets, timer. |
| `RESUME_WORKOUT` | Loads saved state, adjusts timer for elapsed real time. |
| `TIMER_TICK` | Decrements timer by 1s. Triggers screen transition on expiry. |
| `COMPLETE_SET` | User taps "Done" on rep-based set → enters feedback. |
| `ADVANCE_FEEDBACK` | Routes between feedback sub-steps. |
| `SUBMIT_FEEDBACK` | Finalizes set result, computes next target, routes to rest/early-stop/complete. |
| `SKIP_REST` | Subtracts 15s from rest. Multi-tap. Blocked while paused. |
| `PAUSE` / `UNPAUSE` | Freeze/resume timer. Records pausedAt timestamp. |
| `ACCEPT_EARLY_STOP` | Skips remaining sets of current exercise. |
| `DECLINE_EARLY_STOP` | Continues to next set. |
| `VIEW_SUMMARY` | Congrats → Summary. |
| `RESET` | Summary → Welcome. Fresh state. |

---

## 5. Hooks & Utilities

### Hooks

| Hook | Purpose |
|---|---|
| `useWorkoutReducer(storage)` | Init reducer with template, load saved session on mount |
| `useWorkout()` | Context consumer → `{ state, dispatch, savedSession, storage }` |
| `useTimer(state, dispatch, onExpire?)` | 1 Hz setInterval; watches `audioSignal` counter to fire beep |
| `useAudioCue()` | Returns `playBeep()` — 880 Hz sine via Web Audio API |
| `usePersistence(state, storage)` | Saves on every change; appends completed sessions once |
| `useVisibilityPause(state, dispatch)` | Auto-pauses active sets on tab hide; rest keeps running |

### Pure Logic

| Module | Key exports |
|---|---|
| `progression.ts` | `computeNextTarget()`, `buildSetResult()`, `resolvePostFeedback()`, `shouldOfferEarlyStop()` |
| `timer.ts` | `getActiveTimerDuration()`, `getRestDuration()`, `computeResumeTimer()` |
| `summary.ts` | `buildSummary(history, exerciseNames)` |
| `workoutSelectors.ts` | `currentExercise()`, `totalWorkoutSets()`, `completedWorkoutSets()`, `exerciseUnit()` |

---

## 6. localStorage Behavior

**Keys:** `workout-session` (active state), `workout-history` (cumulative sessions)

**Lifecycle:**

1. App load → `loadSession()` validates shape via type guards, returns null if corrupt
2. During workout → `saveSession()` on every meaningful state change
3. On completion → `appendSession()` to history, `clearSession()` removes active
4. On reset → fresh start

**Resume:** `computeResumeTimer()` adjusts saved timer for real elapsed time. If expired while away, transitions silently (no stale beep).

---

## 7. Known Limitations

- Single hardcoded workout template
- No user accounts — all data device-local
- No backend, sync, or analytics
- Inline styles only — no design system
- Web Audio only — no fallback
- Forward-only navigation by design
- History grows unbounded in localStorage
- No PWA/offline support
- Timer uses `setInterval` at 1 Hz (minor drift, acceptable for MVP)

---

## 8. Best Next Steps

### Styling

- Replace inline styles with CSS modules or Tailwind
- Add a shared theme/tokens file for colors, spacing, typography
- Screens are already isolated — changes are per-file
- `ProgressBar` and `TimerDisplay` are good first candidates for polish

### Adding Exercise Library

- `WorkoutTemplate` and `ExerciseDefinition` already support arbitrary exercises
- Create multiple templates in `src/data/`, add a template selection screen
- `exerciseUnit()` handles reps vs duration — extend for new types (e.g., weighted)
- `computeNextTarget()` is parameterized by type — add branches for new progression rules
- `buildSummary()` works with any exercise IDs

### Adding User Accounts / Backend

- `StorageAdapter` is the integration point — implement a remote adapter
- Swap `localStorageAdapter` in `App.tsx` (or compose both for offline-first)
- `WorkoutSession` is already serializable with timestamps
- Keep auth state management separate from workout logic
- History pagination will become necessary

### React Native Migration

- `src/logic/` — copy directly (zero React imports)
- `src/types/` — copy directly (pure TypeScript)
- Hooks need adaptation:
  - `useTimer` → RN's setInterval or native timer
  - `useAudioCue` → `expo-av` or `react-native-sound`
  - `useVisibilityPause` → RN's `AppState` listener
  - `usePersistence` → `AsyncStorage` adapter
- Screens → rewrite JSX (`div` → `View`, `button` → `Pressable`)
- No exercise-specific logic in screens, so UI rewrites are mechanical

---

## Test Coverage

178 tests across 11 files. Run with: `npx vitest run`

| Area | Tests |
|---|---|
| Progression & flow | 19 |
| Rest & pause | 16 |
| Resume | 25 |
| Edge cases | 27 |
| Summary logic | 7 |
| Persistence | 14 |
| Refresh/resume integration | 25 |
| Screen rendering | 14 |
| Feedback screens | 18 |
| Congrats/summary screens | 7 |
| End-to-end flow | 6 |
