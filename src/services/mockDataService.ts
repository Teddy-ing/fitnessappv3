/**
 * Mock Data Service
 * 
 * Generates realistic mock data for testing analytics and history.
 */

import { getDatabase } from './database';
import { saveWorkout } from './workoutService';
import { getExercises } from './exerciseService';
import { createWorkout, createWorkoutExercise, createSet } from '../models/workout';
import { Exercise } from '../models/exercise';

/**
 * Generates and saves approximately 3 months of realistic workout data
 * @param months Number of months of data to generate (default: 3)
 */
export async function generateMockData(months: number = 3): Promise<void> {
    const db = await getDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    const allExercises = await getExercises(false);
    
    // Some basic exercises we want to prioritize for realism
    const benchPress = allExercises.find(e => e.name.toLowerCase().includes('bench press'));
    const squat = allExercises.find(e => e.name.toLowerCase().includes('squat'));
    const deadlift = allExercises.find(e => e.name.toLowerCase().includes('deadlift'));
    const pullup = allExercises.find(e => e.name.toLowerCase().includes('pull up') || e.name.toLowerCase().includes('pull-up'));
    const ohp = allExercises.find(e => e.name.toLowerCase().includes('overhead press'));

    const coreExercises = [benchPress, squat, deadlift, pullup, ohp].filter(Boolean) as Exercise[];
    if (coreExercises.length === 0) {
        // Fallback to random exercises if core ones aren't found
        coreExercises.push(...allExercises.slice(0, 5));
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const now = new Date();
    const daysToGenerate = months * 30;
    
    // Generate 3-4 workouts per week
    const numWorkouts = Math.floor((daysToGenerate / 7) * 3.5);

    let progressWeightMultiplier = 0.8; // Start 20% weaker 3 months ago
    const weightIncrement = 0.2 / numWorkouts; // Linearly increase to 1.0 (current strength) over the period

    // Create an array of days ago to perform workouts on
    const workoutDaysAgo = new Set<number>();
    while (workoutDaysAgo.size < numWorkouts) {
        const randomDayAgo = Math.floor(Math.random() * daysToGenerate);
        workoutDaysAgo.add(randomDayAgo);
    }

    const sortedDaysAgo = Array.from(workoutDaysAgo).sort((a, b) => b - a); // Oldest first

    for (const daysAgo of sortedDaysAgo) {
        const workoutDate = new Date(now.getTime() - daysAgo * MS_PER_DAY);
        // Randomize time of day (between 15:00 and 19:00 mostly)
        workoutDate.setHours(15 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 60), 0, 0);

        const workoutType = Math.floor(Math.random() * 3); // 0: Push, 1: Pull, 2: Legs (roughly)
        let workoutName = '';
        let primaryEx: Exercise;
        let secondaryEx: Exercise;

        if (workoutType === 0) {
            workoutName = 'Push Day';
            primaryEx = benchPress || coreExercises[0];
            secondaryEx = ohp || coreExercises[Math.min(1, coreExercises.length - 1)];
        } else if (workoutType === 1) {
            workoutName = 'Pull Day';
            primaryEx = deadlift || coreExercises[Math.min(2, coreExercises.length - 1)];
            secondaryEx = pullup || coreExercises[Math.min(3, coreExercises.length - 1)];
        } else {
            workoutName = 'Leg Day';
            primaryEx = squat || coreExercises[Math.min(4, coreExercises.length - 1)];
            secondaryEx = deadlift || coreExercises[Math.min(2, coreExercises.length - 1)];
        }

        const workout = createWorkout(workoutName);
        workout.startedAt = workoutDate;
        
        // Duration between 45m and 75m
        const durationMins = 45 + Math.floor(Math.random() * 30);
        const completedDate = new Date(workoutDate.getTime() + durationMins * 60 * 1000);
        workout.completedAt = completedDate;
        workout.totalDuration = durationMins * 60;
        workout.status = 'completed';

        let orderIndex = 0;
        let totalVolume = 0;
        let totalSets = 0;
        let muscleGroups = new Set<string>();

        // Select 3-4 exercises for this workout
        const exercisesToDo = [primaryEx, secondaryEx];
        
        // Add 1-2 random accessories
        const numAccessories = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numAccessories; i++) {
            const randomEx = allExercises[Math.floor(Math.random() * allExercises.length)];
            if (!exercisesToDo.find(e => e.id === randomEx.id)) {
                exercisesToDo.push(randomEx);
            }
        }

        for (const ex of exercisesToDo) {
            // Default 3 sets
            let numSets = 3;
            if (ex.id === primaryEx.id) numSets = 4; // More volume for primary

            const workoutEx = createWorkoutExercise(ex, orderIndex++, numSets);
            workoutEx.sets = []; // Re-populate with realistic data

            // Determine base strength for this exercise. (Realistic defaults)
            let baseWeight = 45; // lbs
            if (ex.name.toLowerCase().includes('squat')) baseWeight = 135;
            if (ex.name.toLowerCase().includes('deadlift')) baseWeight = 155;
            if (ex.name.toLowerCase().includes('bench press')) baseWeight = 115;
            if (ex.name.toLowerCase().includes('curl')) baseWeight = 25;
            
            baseWeight = baseWeight * progressWeightMultiplier;

            for (let s = 0; s < numSets; s++) {
                const isWarmup = (ex.id === primaryEx.id && s === 0);
                const set = createSet(s, isWarmup ? 'warmup' : 'working');
                
                // Reps: 5-8 for primary, 8-12 for secondary
                const targetReps = ex.id === primaryEx.id ? 5 + Math.floor(Math.random() * 4) : 8 + Math.floor(Math.random() * 5);
                
                set.reps = targetReps;
                
                if (ex.trackWeight) {
                    let weight = isWarmup ? baseWeight * 0.6 : baseWeight;
                    // Add some variance +/- 5 lbs
                    const variance = (Math.random() - 0.5) * 10;
                    weight = Math.round((weight + variance) / 5) * 5; // Round to nearest 5
                    if (weight < 0) weight = 0;
                    set.weight = weight;
                    
                    if (!isWarmup) {
                        totalVolume += weight * targetReps;
                    }
                }

                if (!isWarmup) {
                    totalSets++;
                }

                set.status = 'completed';
                set.completedAt = new Date(workoutDate.getTime() + (s * 3 + orderIndex * 10) * 60 * 1000); // Rough distribution
                set.restDuration = 90 + Math.floor(Math.random() * 60); // 90-150s rest
                
                workoutEx.sets.push(set);
            }

            workout.main.exercises.push(workoutEx);
            ex.muscleGroups.forEach(mg => muscleGroups.add(mg.muscle));
        }

        workout.totalVolume = totalVolume;
        workout.totalSets = totalSets;
        workout.muscleGroupsWorked = Array.from(muscleGroups);
        workout.createdAt = completedDate;
        workout.updatedAt = completedDate;

        await saveWorkout(workout);
        progressWeightMultiplier += weightIncrement;
    }
}
