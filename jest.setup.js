// Mock expo-haptics (uses native module)
jest.mock('expo-haptics', () => ({
    notificationAsync: jest.fn(),
    NotificationFeedbackType: { Success: 'success' },
}));

// Mock expo-crypto (uses native module)
jest.mock('expo-crypto', () => ({
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
}));

// Mock notification service
jest.mock('./src/services/notificationService', () => ({
    sendRestTimerNotification: jest.fn(),
    requestNotificationPermissions: jest.fn(),
    scheduleRestTimerNotification: jest.fn(),
    cancelScheduledNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
}));
