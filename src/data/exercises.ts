/**
 * Exercise Seed Data
 * 
 * Common exercises pre-populated in the app.
 * Users can add custom exercises which will be stored in the database.
 */

import { Exercise, MuscleGroup, Equipment, ExerciseCategory } from '../models/exercise';

/**
 * Helper to create seed exercises with sensible defaults
 */
function seedExercise(
    id: string,
    name: string,
    category: ExerciseCategory,
    primaryMuscles: MuscleGroup[],
    secondaryMuscles: MuscleGroup[],
    equipment: Equipment[],
    options?: Partial<Exercise>
): Exercise {
    const muscleGroups = [
        ...primaryMuscles.map(muscle => ({
            muscle,
            contribution: Math.floor(100 / primaryMuscles.length),
            isPrimary: true,
        })),
        ...secondaryMuscles.map(muscle => ({
            muscle,
            contribution: Math.floor(30 / (secondaryMuscles.length || 1)),
            isPrimary: false,
        })),
    ];

    const now = new Date();
    return {
        id,
        name,
        category,
        muscleGroups,
        equipment,
        trackWeight: category === 'strength',
        trackReps: category !== 'cardio',
        trackTime: category === 'stretch' || category === 'isometric' || category === 'cardio',
        trackDistance: category === 'cardio',
        isCustom: false,
        isHidden: false,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        ...options,
    };
}

/**
 * Seed exercises organized by category
 */
export const SEED_EXERCISES: Exercise[] = [
    // ============================================
    // CHEST
    // ============================================
    seedExercise(
        'bench-press-barbell',
        'Barbell Bench Press',
        'strength',
        ['chest'],
        ['triceps', 'shoulders'],
        ['barbell', 'bench']
    ),
    seedExercise(
        'bench-press-dumbbell',
        'Dumbbell Bench Press',
        'strength',
        ['chest'],
        ['triceps', 'shoulders'],
        ['dumbbell', 'bench']
    ),
    seedExercise(
        'incline-bench-press-barbell',
        'Incline Barbell Bench Press',
        'strength',
        ['chest', 'shoulders'],
        ['triceps'],
        ['barbell', 'bench']
    ),
    seedExercise(
        'incline-bench-press-dumbbell',
        'Incline Dumbbell Bench Press',
        'strength',
        ['chest', 'shoulders'],
        ['triceps'],
        ['dumbbell', 'bench']
    ),
    seedExercise(
        'chest-fly-dumbbell',
        'Dumbbell Chest Fly',
        'strength',
        ['chest'],
        ['shoulders'],
        ['dumbbell', 'bench']
    ),
    seedExercise(
        'cable-crossover',
        'Cable Crossover',
        'strength',
        ['chest'],
        ['shoulders'],
        ['cable']
    ),
    seedExercise(
        'push-up',
        'Push-Up',
        'strength',
        ['chest'],
        ['triceps', 'shoulders', 'core'],
        ['bodyweight']
    ),
    seedExercise(
        'dip-chest',
        'Chest Dip',
        'strength',
        ['chest'],
        ['triceps', 'shoulders'],
        ['dip_bars', 'bodyweight']
    ),

    // ============================================
    // BACK
    // ============================================
    seedExercise(
        'deadlift-conventional',
        'Deadlift',
        'strength',
        ['back', 'hamstrings', 'glutes'],
        ['core', 'traps', 'forearms'],
        ['barbell']
    ),
    seedExercise(
        'bent-over-row-barbell',
        'Barbell Bent-Over Row',
        'strength',
        ['back', 'lats'],
        ['biceps', 'core'],
        ['barbell']
    ),
    seedExercise(
        'bent-over-row-dumbbell',
        'Dumbbell Bent-Over Row',
        'strength',
        ['back', 'lats'],
        ['biceps'],
        ['dumbbell']
    ),
    seedExercise(
        'lat-pulldown',
        'Lat Pulldown',
        'strength',
        ['lats', 'back'],
        ['biceps'],
        ['cable', 'machine']
    ),
    seedExercise(
        'pull-up',
        'Pull-Up',
        'strength',
        ['lats', 'back'],
        ['biceps', 'forearms'],
        ['pull_up_bar', 'bodyweight']
    ),
    seedExercise(
        'chin-up',
        'Chin-Up',
        'strength',
        ['lats', 'biceps'],
        ['back', 'forearms'],
        ['pull_up_bar', 'bodyweight']
    ),
    seedExercise(
        'seated-cable-row',
        'Seated Cable Row',
        'strength',
        ['back', 'lats'],
        ['biceps'],
        ['cable']
    ),
    seedExercise(
        't-bar-row',
        'T-Bar Row',
        'strength',
        ['back', 'lats'],
        ['biceps', 'core'],
        ['barbell']
    ),

    // ============================================
    // SHOULDERS
    // ============================================
    seedExercise(
        'overhead-press-barbell',
        'Overhead Press',
        'strength',
        ['shoulders'],
        ['triceps', 'core'],
        ['barbell']
    ),
    seedExercise(
        'overhead-press-dumbbell',
        'Dumbbell Shoulder Press',
        'strength',
        ['shoulders'],
        ['triceps'],
        ['dumbbell']
    ),
    seedExercise(
        'lateral-raise',
        'Lateral Raise',
        'strength',
        ['shoulders'],
        [],
        ['dumbbell']
    ),
    seedExercise(
        'front-raise',
        'Front Raise',
        'strength',
        ['shoulders'],
        [],
        ['dumbbell']
    ),
    seedExercise(
        'rear-delt-fly',
        'Rear Delt Fly',
        'strength',
        ['shoulders', 'back'],
        [],
        ['dumbbell']
    ),
    seedExercise(
        'face-pull',
        'Face Pull',
        'strength',
        ['shoulders', 'back'],
        ['traps'],
        ['cable']
    ),
    seedExercise(
        'shrug-barbell',
        'Barbell Shrug',
        'strength',
        ['traps'],
        ['shoulders'],
        ['barbell']
    ),
    seedExercise(
        'shrug-dumbbell',
        'Dumbbell Shrug',
        'strength',
        ['traps'],
        ['shoulders'],
        ['dumbbell']
    ),

    // ============================================
    // ARMS - BICEPS
    // ============================================
    seedExercise(
        'barbell-curl',
        'Barbell Curl',
        'strength',
        ['biceps'],
        ['forearms'],
        ['barbell']
    ),
    seedExercise(
        'dumbbell-curl',
        'Dumbbell Curl',
        'strength',
        ['biceps'],
        ['forearms'],
        ['dumbbell']
    ),
    seedExercise(
        'hammer-curl',
        'Hammer Curl',
        'strength',
        ['biceps', 'forearms'],
        [],
        ['dumbbell']
    ),
    seedExercise(
        'preacher-curl',
        'Preacher Curl',
        'strength',
        ['biceps'],
        [],
        ['ez_bar', 'bench']
    ),
    seedExercise(
        'cable-curl',
        'Cable Curl',
        'strength',
        ['biceps'],
        [],
        ['cable']
    ),

    // ============================================
    // ARMS - TRICEPS
    // ============================================
    seedExercise(
        'tricep-pushdown',
        'Tricep Pushdown',
        'strength',
        ['triceps'],
        [],
        ['cable']
    ),
    seedExercise(
        'tricep-dip',
        'Tricep Dip',
        'strength',
        ['triceps'],
        ['chest', 'shoulders'],
        ['dip_bars', 'bodyweight']
    ),
    seedExercise(
        'skull-crusher',
        'Skull Crusher',
        'strength',
        ['triceps'],
        [],
        ['ez_bar', 'bench']
    ),
    seedExercise(
        'close-grip-bench',
        'Close-Grip Bench Press',
        'strength',
        ['triceps', 'chest'],
        ['shoulders'],
        ['barbell', 'bench']
    ),
    seedExercise(
        'overhead-tricep-extension',
        'Overhead Tricep Extension',
        'strength',
        ['triceps'],
        [],
        ['dumbbell']
    ),

    // ============================================
    // LEGS - QUADS
    // ============================================
    seedExercise(
        'squat-barbell',
        'Barbell Squat',
        'strength',
        ['quads', 'glutes'],
        ['hamstrings', 'core'],
        ['barbell']
    ),
    seedExercise(
        'front-squat',
        'Front Squat',
        'strength',
        ['quads'],
        ['glutes', 'core'],
        ['barbell']
    ),
    seedExercise(
        'leg-press',
        'Leg Press',
        'strength',
        ['quads', 'glutes'],
        ['hamstrings'],
        ['machine']
    ),
    seedExercise(
        'leg-extension',
        'Leg Extension',
        'strength',
        ['quads'],
        [],
        ['machine']
    ),
    seedExercise(
        'goblet-squat',
        'Goblet Squat',
        'strength',
        ['quads', 'glutes'],
        ['core'],
        ['dumbbell', 'kettlebell']
    ),
    seedExercise(
        'lunge-dumbbell',
        'Dumbbell Lunge',
        'strength',
        ['quads', 'glutes'],
        ['hamstrings'],
        ['dumbbell']
    ),
    seedExercise(
        'bulgarian-split-squat',
        'Bulgarian Split Squat',
        'strength',
        ['quads', 'glutes'],
        ['hamstrings'],
        ['dumbbell', 'bench']
    ),

    // ============================================
    // LEGS - HAMSTRINGS & GLUTES
    // ============================================
    seedExercise(
        'romanian-deadlift',
        'Romanian Deadlift',
        'strength',
        ['hamstrings', 'glutes'],
        ['back', 'core'],
        ['barbell']
    ),
    seedExercise(
        'leg-curl',
        'Leg Curl',
        'strength',
        ['hamstrings'],
        [],
        ['machine']
    ),
    seedExercise(
        'hip-thrust-barbell',
        'Barbell Hip Thrust',
        'strength',
        ['glutes'],
        ['hamstrings'],
        ['barbell', 'bench']
    ),
    seedExercise(
        'glute-bridge',
        'Glute Bridge',
        'strength',
        ['glutes'],
        ['hamstrings'],
        ['bodyweight']
    ),
    seedExercise(
        'good-morning',
        'Good Morning',
        'strength',
        ['hamstrings', 'back'],
        ['glutes'],
        ['barbell']
    ),

    // ============================================
    // LEGS - CALVES
    // ============================================
    seedExercise(
        'calf-raise-standing',
        'Standing Calf Raise',
        'strength',
        ['calves'],
        [],
        ['machine', 'bodyweight']
    ),
    seedExercise(
        'calf-raise-seated',
        'Seated Calf Raise',
        'strength',
        ['calves'],
        [],
        ['machine']
    ),

    // ============================================
    // CORE
    // ============================================
    seedExercise(
        'plank',
        'Plank',
        'isometric',
        ['core'],
        ['shoulders'],
        ['bodyweight'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'crunch',
        'Crunch',
        'strength',
        ['core'],
        [],
        ['bodyweight'],
        { trackWeight: false }
    ),
    seedExercise(
        'hanging-leg-raise',
        'Hanging Leg Raise',
        'strength',
        ['core', 'hip_flexors'],
        [],
        ['pull_up_bar'],
        { trackWeight: false }
    ),
    seedExercise(
        'cable-crunch',
        'Cable Crunch',
        'strength',
        ['core'],
        [],
        ['cable']
    ),
    seedExercise(
        'russian-twist',
        'Russian Twist',
        'strength',
        ['core'],
        [],
        ['bodyweight', 'dumbbell'],
        { trackWeight: false }
    ),
    seedExercise(
        'ab-wheel-rollout',
        'Ab Wheel Rollout',
        'strength',
        ['core'],
        ['shoulders'],
        ['other'],
        { trackWeight: false }
    ),

    // ============================================
    // CARDIO
    // ============================================
    seedExercise(
        'treadmill-run',
        'Treadmill Running',
        'cardio',
        ['quads', 'hamstrings', 'calves'],
        ['glutes', 'core'],
        ['treadmill'],
        { trackWeight: false, trackReps: false, trackTime: true, trackDistance: true }
    ),
    seedExercise(
        'outdoor-run',
        'Outdoor Running',
        'cardio',
        ['quads', 'hamstrings', 'calves'],
        ['glutes', 'core'],
        ['none'],
        { trackWeight: false, trackReps: false, trackTime: true, trackDistance: true }
    ),
    seedExercise(
        'stationary-bike',
        'Stationary Bike',
        'cardio',
        ['quads', 'hamstrings'],
        ['calves', 'glutes'],
        ['stationary_bike'],
        { trackWeight: false, trackReps: false, trackTime: true, trackDistance: true }
    ),
    seedExercise(
        'outdoor-cycling',
        'Outdoor Cycling',
        'cardio',
        ['quads', 'hamstrings'],
        ['calves', 'glutes'],
        ['none'],
        { trackWeight: false, trackReps: false, trackTime: true, trackDistance: true }
    ),
    seedExercise(
        'rowing-machine',
        'Rowing Machine',
        'cardio',
        ['back', 'quads'],
        ['biceps', 'core', 'shoulders'],
        ['rowing_machine'],
        { trackWeight: false, trackReps: false, trackTime: true, trackDistance: true }
    ),
    seedExercise(
        'elliptical',
        'Elliptical',
        'cardio',
        ['quads', 'glutes'],
        ['hamstrings', 'core'],
        ['elliptical'],
        { trackWeight: false, trackReps: false, trackTime: true, trackDistance: true }
    ),
    seedExercise(
        'stair-climber',
        'Stair Climber',
        'cardio',
        ['quads', 'glutes', 'calves'],
        ['hamstrings'],
        ['stair_climber'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'jump-rope',
        'Jump Rope',
        'cardio',
        ['calves'],
        ['quads', 'shoulders', 'core'],
        ['jump_rope'],
        { trackWeight: false, trackTime: true }
    ),
    seedExercise(
        'battle-ropes',
        'Battle Ropes',
        'cardio',
        ['shoulders', 'core'],
        ['biceps', 'triceps', 'back'],
        ['battle_ropes'],
        { trackWeight: false, trackTime: true }
    ),
    seedExercise(
        'box-jumps',
        'Box Jumps',
        'cardio',
        ['quads', 'glutes'],
        ['calves', 'hamstrings'],
        ['plyo_box'],
        { trackWeight: false, trackTime: false }
    ),
    seedExercise(
        'burpees',
        'Burpees',
        'cardio',
        ['full_body'],
        [],
        ['none'],
        { trackWeight: false, trackTime: false }
    ),
    seedExercise(
        'mountain-climbers',
        'Mountain Climbers',
        'cardio',
        ['core', 'shoulders'],
        ['quads', 'hip_flexors'],
        ['none'],
        { trackWeight: false, trackTime: true }
    ),
    seedExercise(
        'jumping-jacks',
        'Jumping Jacks',
        'cardio',
        ['full_body'],
        [],
        ['none'],
        { trackWeight: false, trackTime: true }
    ),
    seedExercise(
        'high-knees',
        'High Knees',
        'cardio',
        ['hip_flexors', 'core'],
        ['quads', 'calves'],
        ['none'],
        { trackWeight: false, trackTime: true }
    ),

    // ============================================
    // STRETCHES
    // ============================================
    seedExercise(
        'hamstring-stretch',
        'Hamstring Stretch',
        'stretch',
        ['hamstrings'],
        [],
        ['yoga_mat', 'none'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'quad-stretch',
        'Quad Stretch',
        'stretch',
        ['quads'],
        [],
        ['none'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'chest-stretch',
        'Chest Stretch',
        'stretch',
        ['chest'],
        ['shoulders'],
        ['none'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'shoulder-stretch',
        'Shoulder Stretch',
        'stretch',
        ['shoulders'],
        [],
        ['none'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'hip-flexor-stretch',
        'Hip Flexor Stretch',
        'stretch',
        ['hip_flexors'],
        [],
        ['yoga_mat', 'none'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'pigeon-pose',
        'Pigeon Pose',
        'stretch',
        ['glutes', 'hip_flexors'],
        [],
        ['yoga_mat'],
        { trackWeight: false, trackReps: false, trackTime: true }
    ),
    seedExercise(
        'cat-cow-stretch',
        'Cat-Cow Stretch',
        'mobility',
        ['back', 'core'],
        [],
        ['yoga_mat'],
        { trackWeight: false, trackTime: true }
    ),
];

/**
 * Get exercises by muscle group
 */
export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
    return SEED_EXERCISES.filter(ex =>
        ex.muscleGroups.some(mg => mg.muscle === muscle && mg.isPrimary)
    );
}

/**
 * Get exercises by equipment
 */
export function getExercisesByEquipment(equipment: Equipment): Exercise[] {
    return SEED_EXERCISES.filter(ex => ex.equipment.includes(equipment));
}

/**
 * Get exercises by category
 */
export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
    return SEED_EXERCISES.filter(ex => ex.category === category);
}

/**
 * Search exercises by name
 */
export function searchExercises(query: string): Exercise[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return SEED_EXERCISES;

    return SEED_EXERCISES.filter(ex =>
        ex.name.toLowerCase().includes(lowerQuery)
    );
}
