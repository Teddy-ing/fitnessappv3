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
