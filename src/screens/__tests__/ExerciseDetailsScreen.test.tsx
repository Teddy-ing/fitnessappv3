import React from 'react';
import { BackHandler } from 'react-native';
import ExerciseDetailsScreen from '../ExerciseDetailsScreen';
import { navigateToTab } from '../../navigation/navigationRef';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
    useFocusEffect: (callback: () => (() => void) | undefined) => {
        const React = require('react');
        React.useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]);
    },
}));
jest.mock('react-native', () => ({
    Text: 'Text', TouchableOpacity: 'TouchableOpacity',
    BackHandler: { addEventListener: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../components/exerciseDetails/ExerciseDetailsContent', () => 'ExerciseDetailsContent');
jest.mock('../../navigation/navigationRef', () => ({ navigateToTab: jest.fn() }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const remove = jest.fn();
const navigation = { setOptions: jest.fn() };
const props = (source?: 'workout') => ({
    navigation,
    route: { params: { exerciseId: 'bench', exerciseName: 'Bench Press', source } },
}) as any;

beforeEach(() => {
    jest.clearAllMocks();
    mockFocused = true;
    jest.mocked(BackHandler.addEventListener).mockReturnValue({ remove });
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

it('returns to workout on Android back and releases its back listener when the guide loses focus', async () => {
    await act(async () => { renderer = create(<ExerciseDetailsScreen {...props('workout')} />); });
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    const back = jest.mocked(BackHandler.addEventListener).mock.calls[0][1];
    expect(back()).toBe(true);
    expect(navigateToTab).toHaveBeenCalledWith('Workout');

    mockFocused = false;
    await act(async () => { renderer.update(<ExerciseDetailsScreen {...props('workout')} />); });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);

    mockFocused = true;
    await act(async () => { renderer.update(<ExerciseDetailsScreen {...props('workout')} />); });
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(2);
});

it('restores normal header and Android back behavior when reopened without a workout source', async () => {
    await act(async () => { renderer = create(<ExerciseDetailsScreen {...props('workout')} />); });
    expect(navigation.setOptions.mock.calls[0][0].headerLeft).toEqual(expect.any(Function));

    await act(async () => { renderer.update(<ExerciseDetailsScreen {...props()} />); });
    expect(navigation.setOptions).toHaveBeenLastCalledWith({ headerLeft: undefined });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
});
