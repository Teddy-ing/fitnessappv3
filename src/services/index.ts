// Service exports
export { getDatabase, isDatabaseAvailable, closeDatabase, clearAllData } from './database';
export {
    saveWorkout,
    updateWorkout,
    getWorkouts,
    getWorkoutById,
    deleteWorkout,
    getWorkoutCount,
    getWorkoutDatesThisWeek
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
export {
    getSettings,
    updateSettings,
    type UserSettings,
} from './preferencesService';
export {
    getAggregatedMetric,
    getConsistencyStats,
    getMuscleDistribution,
} from './analyticsService';
export {
    getPerformedExercises,
    getEstimated1RM,
    getMaxWeight,
    getExerciseVolume,
    getMaxReps,
    getBestWeightForReps,
    getFatigueRatio,
} from './exerciseAnalyticsService';
export { generateMockData } from './mockDataService';
export {
    getWorkoutsForMonth,
    getWorkoutStreak,
    getRestDaysThisWeek,
    getWorkoutDetail,
    getWorkoutsForDate,
    getNoteDates,
    searchNotes,
    type CalendarDayData,
    type JournalEntry,
} from './calendarService';
export {
    getPersonalRecordDates,
    backfillPersonalRecords,
    getFatigueDates,
    getPRSetIdsForDate,
    type PRSetIds,
} from './personalRecordsService';
export {
    getMeasurementTypes,
    getVisibleMeasurementTypes,
    logMeasurement,
    updateMeasurement,
    deleteMeasurement,
    getMeasurementHistory,
    getLatestMeasurements,
    getSparklineData,
    getSparklineDataBatch,
    getMeasurementsForDate,
} from './measurementService';
export {
    saveProgressPhoto,
    getProgressPhotos,
    deleteProgressPhoto,
    getPhotoWithBodyweight,
    getPhotoUri,
} from './photoService';
export {
    createGoal,
    getActiveGoals,
    getCompletedGoals,
    updateGoal,
    deleteGoal,
    markGoalCompleted,
    abandonGoal,
} from './goalService';
export {
    computeCurrentBest,
    refreshAllGoalProgress,
    getCurrentBestForTarget,
} from './goalProgressService';
export {
    exportAllData,
    importAllData,
} from './dataTransferService';
