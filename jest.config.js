module.exports = {
    // No preset — we configure everything manually to avoid
    // conflicts between react-native's Babel transform and ts-jest
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
                diagnostics: false,
            },
        ],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|expo-.*|@expo|zustand|@react-navigation)/)',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)', '**/*.(test|spec).(ts|tsx)'],
    testEnvironment: 'node',
    setupFiles: ['./jest.setup.js'],
};
