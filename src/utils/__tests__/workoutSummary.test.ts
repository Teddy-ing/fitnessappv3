import { createWorkout, createWorkoutExercise, createSet } from '../../models/workout';
import { createExercise } from '../../models/exercise';
import { getWorkoutSummary, formatWorkoutDuration, formatWorkoutVolume } from '../workoutSummary';

describe('completed workout summary', () => {
    it('counts completed bodyweight and timed work and excludes unfinished exercises and sets', () => {
        const workout = createWorkout();
        const weighted = createWorkoutExercise(createExercise({ name: 'Bench Press' }), 0);
        weighted.exercise.trackWeight = true;
        weighted.exercise.trackReps = true;
        weighted.exercise.muscleGroups = [{ muscle: 'chest', isPrimary: true, contribution: 100 }];
        weighted.sets = [
            { ...createSet(0, 'warmup'), status: 'completed', weight: 45, reps: 10 },
            { ...createSet(1), status: 'completed', weight: 100, reps: 8 },
            { ...createSet(2), status: 'pending', weight: 200, reps: 8 },
            { ...createSet(3), status: 'skipped', weight: 200, reps: 8 },
        ];
        const bodyweight = createWorkoutExercise(createExercise({ name: 'Push up' }), 1);
        bodyweight.exercise.trackWeight = false;
        bodyweight.sets = [{ ...createSet(0), status: 'completed', weight: 0, reps: 15 }];
        const timed = createWorkoutExercise(createExercise({ name: 'Plank' }), 2);
        timed.exercise.trackWeight = false;
        timed.sets = [{ ...createSet(0), status: 'completed', duration: 60 }];
        const unfinished = createWorkoutExercise(createExercise({ name: 'Squat' }), 3);
        unfinished.exercise.muscleGroups = [{ muscle: 'quads', isPrimary: true, contribution: 100 }];
        workout.main.exercises = [weighted, bodyweight, timed, unfinished];

        expect(getWorkoutSummary(workout)).toEqual({ completedExercises: 3, completedSets: 4, totalVolume: 1250, muscleGroups: ['chest'] });
    });

    it('uses canonical pounds for volume and converts only for display', () => {
        expect(formatWorkoutVolume(1000, 'lbs')).toBe('1,000 lbs');
        expect(formatWorkoutVolume(1000, 'kg')).toBe('453.6 kg');
        expect(formatWorkoutDuration(59)).toBe('<1 min');
        expect(formatWorkoutDuration(3540)).toBe('59 min');
        expect(formatWorkoutDuration(3600)).toBe('1 hr');
        expect(formatWorkoutDuration(4260)).toBe('1 hr 11 min');
    });
});
