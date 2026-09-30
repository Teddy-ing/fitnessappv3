import React from 'react';
const { act, create } = require('react-test-renderer');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', FlatList: 'FlatList', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
    Alert: { alert: jest.fn() }, Keyboard: { dismiss: jest.fn() },
    BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('expo-file-system', () => ({ File: class { exists = true; write() {} }, Paths: { document: 'test' } }));
jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined), deactivateKeepAwake: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../../stores/workoutPersistence', () => ({ persistWorkoutState: jest.fn(), loadPersistedWorkout: jest.fn(), clearPersistedWorkout: jest.fn() }));
jest.mock('../../services/workoutService', () => ({ getPreviousSetsForExercise: jest.fn().mockResolvedValue([]), getPreviousSetsForExercises: jest.fn().mockResolvedValue(new Map()) }));
jest.mock('../../services/smartSuggestionsService', () => ({ getSuggestionsForExercise: jest.fn(), getSuggestionsForExercises: jest.fn() }));
jest.mock('../../services/preferencesService', () => ({ getSettings: jest.fn().mockResolvedValue({ smartSuggestions: false }) }));
jest.mock('../../stores', () => ({ useWorkoutStore: jest.requireActual('../../stores/workoutStore').useWorkoutStore }));
jest.mock('../../services', () => ({
    saveWorkout: jest.fn().mockResolvedValue([]), updateWorkout: jest.fn().mockResolvedValue([]),
    findMatchingTemplate: jest.fn().mockResolvedValue(null), markWorkoutCompletedToday: jest.fn().mockResolvedValue(undefined),
    startWorkoutFromTemplate: jest.fn(),
}));
jest.mock('../../services/cloudBackupService', () => ({ triggerAutoBackupIfEnabled: jest.fn() }));
jest.mock('../../navigation/navigationRef', () => ({ navigateToTab: jest.fn(), navigationRef: { isReady: () => true } }));
jest.mock('../../hooks', () => ({
    useElapsedTimer: () => ({ elapsedTime: 120 }),
    useHomeScreenData: () => ({ templates: [], loadData: jest.fn().mockResolvedValue(undefined) }),
    useWorkoutKeyboard: () => ({ focusState: null, handleHideKeyboard: jest.fn(), getKeyboardFieldType: () => 'weight', getFieldLabel: () => 'Weight' }),
}));
jest.mock('../../hooks/useWorkoutKeyboard', () => ({ isKeyboardField: () => true }));
jest.mock('../../hooks/workout/useWorkoutSettings', () => {
    const settings = { weightUnit: 'kg', refreshSettings: jest.fn() };
    return { useWorkoutSettings: () => settings };
});
jest.mock('../../components', () => ({
    ExercisePicker: 'ExercisePicker', RestTimer: 'RestTimer', WorkoutKeyboard: 'WorkoutKeyboard', SaveTemplateModal: 'SaveTemplateModal', WorkoutSettingsMenu: 'WorkoutSettingsMenu',
}));
jest.mock('../../components/workout/RenderableExerciseItem', () => ({ __esModule: true, default: 'RenderableExerciseItem' }));
jest.mock('../../components/workout/WorkoutNoteSection', () => ({ __esModule: true, default: 'WorkoutNoteSection' }));
jest.mock('../../components/workout/WorkoutHeader', () => ({ __esModule: true, default: 'WorkoutHeader' }));
jest.mock('../../components/workout/WorkoutCompletion', () => ({ __esModule: true, default: 'WorkoutCompletion' }));
jest.mock('../WorkoutHomeView', () => ({ __esModule: true, default: 'WorkoutHomeView' }));

import WorkoutScreen from '../WorkoutScreen';
import { useWorkoutStore } from '../../stores/workoutStore';
import { createWorkout, createWorkoutExercise, createSet } from '../../models/workout';
import { createExercise } from '../../models/exercise';
import { saveWorkout, updateWorkout, markWorkoutCompletedToday, findMatchingTemplate } from '../../services';
import { navigateToTab } from '../../navigation/navigationRef';
import { Alert } from 'react-native';

describe('workout finish flow', () => {
    let renderer: any;
    const mockSave = saveWorkout as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        const workout = createWorkout('Push day');
        const exercise = createWorkoutExercise(createExercise({ name: 'Bench press' }), 0);
        exercise.sets = [{ ...createSet(0), weight: 100, reps: 8, status: 'completed' }];
        workout.main.exercises = [exercise];
        useWorkoutStore.setState({ activeWorkout: workout, isFinishing: false, isEditMode: false, originalDuration: null, originalCompletedAt: null, originalStartedAt: null });
    });

    afterEach(async () => {
        if (renderer) await act(async () => renderer.unmount());
        renderer = null;
    });

    async function render() {
        await act(async () => { renderer = create(<WorkoutScreen />); });
    }

    it('shows a saved summary, opens the template modal, and returns home on Done', async () => {
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        const completion = renderer.root.findByType('WorkoutCompletion');
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(completion.props.workout).toMatchObject({ name: 'Push day', status: 'completed', totalSets: 1, totalVolume: 800 });
        expect(completion.props.weightUnit).toBe('kg');

        await act(async () => completion.props.onSaveTemplate());
        const template = renderer.root.findByType('SaveTemplateModal');
        expect(template.props.visible).toBe(true);
        expect(template.props.pendingWorkout.id).toBe(completion.props.workout.id);
        await act(async () => template.props.onClose());
        await act(async () => completion.props.onDone());
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(0);
        expect(renderer.root.findAllByType('WorkoutHomeView')).toHaveLength(1);
    });

    it('keeps logging available without celebrating when the save fails', async () => {
        const warning = jest.spyOn(console, 'error').mockImplementation();
        mockSave.mockRejectedValueOnce(new Error('Disk full'));
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(0);
        expect(renderer.root.findAllByType('WorkoutHeader')).toHaveLength(1);
        expect(Alert.alert).toHaveBeenCalledWith('Could not save workout', 'Your workout is still here. Please try again.');
        warning.mockRestore();
    });

    it('still celebrates a saved workout when its split follow-up fails', async () => {
        const warning = jest.spyOn(console, 'warn').mockImplementation();
        (markWorkoutCompletedToday as jest.Mock).mockRejectedValueOnce(new Error('Split write failed'));
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(1);
        expect(Alert.alert).not.toHaveBeenCalledWith('Could not save workout', expect.anything());
        warning.mockRestore();
    });

    it('saves history edits and returns to Profile without a completion screen', async () => {
        useWorkoutStore.setState({ isEditMode: true, originalDuration: 300, originalStartedAt: new Date('2026-08-01T12:00:00Z'), originalCompletedAt: new Date('2026-08-01T12:05:00Z') });
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        expect(updateWorkout).toHaveBeenCalledTimes(1);
        expect(mockSave).not.toHaveBeenCalled();
        expect(navigateToTab).toHaveBeenCalledWith('Profile');
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(0);
        expect(markWorkoutCompletedToday).not.toHaveBeenCalled();
    });

    it('returns home without celebrating when a workout is discarded', async () => {
        await render();
        await act(async () => renderer.root.findByType('WorkoutHeader').props.onDiscard());
        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        await act(async () => buttons.find((button: any) => button.text === 'Discard').onPress());
        expect(mockSave).not.toHaveBeenCalled();
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(0);
        expect(renderer.root.findAllByType('WorkoutHomeView')).toHaveLength(1);
    });

    it.each(['save', 'discard'])('clears the previous celebration when a calendar edit is loaded then %s', async action => {
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(1);
        const historyWorkout = { ...createWorkout('Historical workout'), status: 'completed' as const };
        await act(async () => useWorkoutStore.getState().loadWorkoutForEditing(historyWorkout));
        if (action === 'save') {
            await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        } else {
            await act(async () => useWorkoutStore.getState().discardWorkout());
        }
        expect(renderer.root.findAllByType('WorkoutCompletion')).toHaveLength(0);
        expect(renderer.root.findAllByType('WorkoutHomeView')).toHaveLength(1);
    });

    it('ignores an old template lookup after a different workout finishes', async () => {
        let resolveOldLookup!: (value: unknown) => void;
        (findMatchingTemplate as jest.Mock).mockReturnValueOnce(new Promise(resolve => { resolveOldLookup = resolve; }));
        const firstWorkout = useWorkoutStore.getState().activeWorkout!;
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        await act(async () => useWorkoutStore.getState().startFromTemplate({ ...firstWorkout, id: 'second-workout' }));
        (findMatchingTemplate as jest.Mock).mockResolvedValueOnce({ id: 'existing-template' });
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        await act(async () => resolveOldLookup(null));
        const completion = renderer.root.findByType('WorkoutCompletion');
        expect(completion.props.workout.id).toBe('second-workout');
        expect(completion.props.onSaveTemplate).toBeUndefined();
    });
});
