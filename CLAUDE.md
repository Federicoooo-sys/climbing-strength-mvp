# Project Overview
Mobile-first web MVP for an adaptive upper-body strength assessment workout app.

## Tech Stack
- React
- TypeScript
- Vite

## Current Scope
- Frontend only
- No backend yet
- No auth yet
- No database yet
- No full exercise library yet
- localStorage only for persistence

## Product Priorities
- Mobile-first layout
- Clean architecture over visual polish
- Keep business logic separate from UI
- Keep workout logic portable for future React Native migration
- Avoid hardcoding exercise-specific logic directly into screen components

## MVP Workout
- Pull-ups: 3 sets of 4 reps
- Ring rows: 3 sets of 6 reps
- Dead hangs: 3 sets of 60 seconds

## Core Behavior
- Timers auto-start
- User can pause during active set or rest
- No back navigation
- Rest starts only after all feedback is submitted
- Rest skip subtracts 15 seconds per tap and can be tapped multiple times
- Resume exactly where the user left off
- Simple browser audio cue when timer reaches zero

## Progression Rules
- Rep-based success + intensity < 5 => next set reps +1
- Duration-based success + intensity < 5 => next set seconds +5
- Success + intensity >= 5 => next set unchanged
- Failure => next set target becomes actual completed amount
- Failed set means actual completed amount is 0
- Adjustments carry forward within the same exercise

## Early Stop Rules
- Auto-trigger early-stop recommendation after 2 failed sets in the same exercise
- Manual early-stop option should also be available after a failed set
- If early-stop is accepted, skip remaining sets of the current exercise and move on
- If declined, continue with the next adjusted set

## Summary Rules
- Show congrats screen first, then summary screen
- Summary is cumulative across sessions using localStorage
- Organize summary by exercise type
- For now, summary is a vertical list with cumulative completion counts by exercise type

## Coding Guidance
- Prefer reusable hooks and pure functions for timer and progression logic
- Prefer reducer-based state management unless a very lightweight alternative is clearly better
- Keep storage logic isolated from UI
- Keep implementation practical and MVP-level
- Do not over-engineer styling yet
