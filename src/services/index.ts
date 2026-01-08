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
    getCurrentTemplateIndex,
    setCurrentTemplateIndex,
    advanceToNextTemplate,
    getCurrentTemplate,
} from './splitService';
export {
    requestNotificationPermissions,
    sendRestTimerNotification,
    scheduleRestTimerNotification,
    cancelScheduledNotification,
    clearAllNotifications
} from './notificationService';
