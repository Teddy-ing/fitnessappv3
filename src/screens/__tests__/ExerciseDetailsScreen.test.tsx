import React from 'react';
import ExerciseDetailsScreen from '../ExerciseDetailsScreen';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../components/exerciseDetails/ExerciseDetailsContent', () => 'ExerciseDetailsContent');

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const props = (exerciseId: string, initialTab?: string) => ({
    route: { key: exerciseId, name: 'ExerciseDetails', params: { exerciseId, exerciseName: exerciseId, initialTab } },
}) as any;

beforeEach(() => {
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(async () => {
    if (renderer) await act(async () => { renderer.unmount(); });
    renderer = undefined;
    jest.restoreAllMocks();
});

it('passes the exercise and requested tab to the shared content in either stack', async () => {
    await act(async () => { renderer = create(<ExerciseDetailsScreen {...props('bench', 'about')} />); });
    expect(renderer.root.findByType('ExerciseDetailsContent').props).toMatchObject({ exerciseId: 'bench', initialTab: 'about' });

    await act(async () => { renderer.update(<ExerciseDetailsScreen {...props('squat', 'charts')} />); });
    expect(renderer.root.findByType('ExerciseDetailsContent').props).toMatchObject({ exerciseId: 'squat', initialTab: 'charts' });
});
