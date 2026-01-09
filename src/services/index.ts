// Service exports
export { getDatabase, isDatabaseAvailable, closeDatabase, clearAllData } from './database';
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
    findMatchingTemplate,
    findTemplateByName,
    findTemplatesByName,
    overwriteTemplate,
    updateTemplate,
    toggleTemplateFavorite,
    startWorkoutFromTemplate,
    type Template,
    type TemplateExercise
} from './templateService';
export {
    getSplits,
    getSplitById,
    saveSplit,
    deleteSplit,
    getActiveSplit,
    setActiveSplit,
    getTemplatesForSplit,
    getSplitsForTemplate,
    getCurrentTemplateIndex,
    setCurrentTemplateIndex,
    advanceToNextTemplate,
    getCurrentTemplate,
    checkAndAdvanceIfNewDay,
    markWorkoutCompletedToday,
    toggleSplitFavorite,
    type SplitInfo,
} from './splitService';
export {
    requestNotificationPermissions,
    sendRestTimerNotification,
    scheduleRestTimerNotification,
    cancelScheduledNotification,
    clearAllNotifications
} from './notificationService';
export { seedPremadeSplits } from './premadeSplits';
export {
    getExercises,
    getExerciseById,
    createCustomExercise,
    updateExercise as updateCustomExercise,
    deleteExercise,
    toggleExerciseHidden,
    toggleExerciseFavorite,
    getExercisesByCategory,
    searchExercises,
} from './exerciseService';
