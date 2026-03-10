import type { ExerciseDefinition, WorkoutTemplate } from '../types/workout';

const pullUps: ExerciseDefinition = {
  id: 'pull-ups',
  name: 'Pull-ups',
  type: 'reps',
  defaultTarget: 4,
  sets: 3,
  timeCap: 60,
  restBetweenSetsSec: 60,
  restAfterExerciseSec: 150,
};

const ringRows: ExerciseDefinition = {
  id: 'ring-rows',
  name: 'Ring Rows',
  type: 'reps',
  defaultTarget: 6,
  sets: 3,
  timeCap: 60,
  restBetweenSetsSec: 60,
  restAfterExerciseSec: 150,
};

const deadHangs: ExerciseDefinition = {
  id: 'dead-hangs',
  name: 'Dead Hangs',
  type: 'duration',
  defaultTarget: 60,
  sets: 3,
  timeCap: null,
  restBetweenSetsSec: 60,
  restAfterExerciseSec: 150,
};

export const MVP_WORKOUT: WorkoutTemplate = {
  id: 'mvp-upper-body',
  name: 'Upper Body Assessment',
  exercises: [pullUps, ringRows, deadHangs],
};
