// Service exports
export { getDatabase, closeDatabase, clearAllData } from './database';
export {
    saveWorkout,
    getWorkouts,
    getWorkoutById,
    deleteWorkout,
    getWorkoutCount
} from './workoutService';
export {
    createTemplateFromWorkout,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    startWorkoutFromTemplate,
    type Template,
    type TemplateExercise
} from './templateService';
