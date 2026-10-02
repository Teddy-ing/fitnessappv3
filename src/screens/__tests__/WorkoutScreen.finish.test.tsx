import React from 'react';
const { act, create } = require('react-test-renderer');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockTutorial = { status: 'skipped', requestedAction: null as string | null, consumeAction: jest.fn(), complete: jest.fn(), skip: jest.fn() };
const mockHomeData = { templates: [], currentTemplate: null as any, isLoading: false, loadData: jest.fn().mockResolvedValue(undefined) };
let mockIsFocused = true;
let mockKeyboardFocus: any = null;
jest.mock('../../components/tutorial/TutorialProvider', () => ({ useTutorial: () => mockTutorial }));
jest.mock('../../components/tutorial/WorkoutTutorialTip', () => ({ __esModule: true, default: 'WorkoutTutorialTip' }));
jest.mock('../SplitsScreen', () => ({ __esModule: true, default: 'SplitsScreen' }));

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', FlatList: 'FlatList', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
    Alert: { alert: jest.fn() }, Keyboard: { dismiss: jest.fn() },
    BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('expo-file-system', () => ({ File: class { exists = true; write() {} }, Paths: { document: 'test' } }));
jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined), deactivateKeepAwake: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockIsFocused }));
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
jest.mock('../../navigation/navigationRef', () => ({ navigateToTab: jest.fn(), navigationRef: { isReady: () => true, navigate: jest.fn() } }));
jest.mock('../../hooks', () => ({
    useElapsedTimer: () => ({ elapsedTime: 120 }),
    useHomeScreenData: () => mockHomeData,
    useWorkoutKeyboard: () => ({ focusState: mockKeyboardFocus, handleHideKeyboard: jest.fn(), getKeyboardFieldType: () => 'weight', getFieldLabel: () => 'Weight' }),
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
import { saveWorkout, updateWorkout, markWorkoutCompletedToday, findMatchingTemplate, startWorkoutFromTemplate } from '../../services';
import { navigateToTab, navigationRef } from '../../navigation/navigationRef';
import { Alert } from 'react-native';

describe('workout finish flow', () => {
    let renderer: any;
    const mockSave = saveWorkout as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsFocused = true;
        mockKeyboardFocus = null;
        mockTutorial.status = 'skipped';
        mockTutorial.requestedAction = null;
        mockTutorial.consumeAction.mockImplementation(() => { mockTutorial.requestedAction = null; });
        mockHomeData.currentTemplate = null;
        mockHomeData.isLoading = false;
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

    it('deactivates the workout keyboard while a child screen is focused, preserving the workout', async () => {
        const workout = useWorkoutStore.getState().activeWorkout;
        mockKeyboardFocus = { exerciseId: workout!.main.exercises[0].id, setIndex: 0, field: 'weight' };
        await render();
        expect(renderer.root.findByType('WorkoutKeyboard').props.visible).toBe(true);
        mockIsFocused = false;
        await act(async () => renderer.update(<WorkoutScreen />));
        expect(renderer.root.findByType('WorkoutKeyboard').props.visible).toBe(false);
        expect(useWorkoutStore.getState().activeWorkout).toBe(workout);
        mockIsFocused = true;
        await act(async () => renderer.update(<WorkoutScreen />));
        expect(renderer.root.findByType('WorkoutKeyboard').props.visible).toBe(true);
    });

    it('opens home settings in the Workout stack', async () => {
        useWorkoutStore.setState({ activeWorkout: null });
        await render();
        await act(async () => renderer.root.findByType('WorkoutHomeView').props.onSettingsPress());
        expect(navigationRef.navigate).toHaveBeenCalledWith('Workout', { screen: 'Settings', initial: false });
    });

    it('shows a saved summary, opens the template modal, and returns home on Done', async () => {
        await render();
        await act(async () => { await renderer.root.findByType('WorkoutHeader').props.onFinish(); });
        const completion = renderer.root.findByType('WorkoutCompletion');
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockTutorial.complete).toHaveBeenCalledTimes(1);
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
        expect(mockTutorial.complete).not.toHaveBeenCalled();
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
        expect(mockTutorial.complete).not.toHaveBeenCalled();
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

    function tutorialTip() {
        const header = renderer.root.findByType('FlatList').props.ListHeaderComponent;
        return React.Children.toArray(header.props.children).find((child: any) => child.type === 'WorkoutTutorialTip') as React.ReactElement<any> | undefined;
    }

    it('derives optional tips from real workout actions and leaves unguided workouts alone', async () => {
        await render();
        expect(tutorialTip()).toBeUndefined();
        mockTutorial.status = 'active';
        const workout = createWorkout('Guided workout');
        await act(async () => useWorkoutStore.setState({ activeWorkout: workout }));
        expect(tutorialTip()?.props.stage).toBe('add');
        await act(async () => tutorialTip()?.props.onAddExercise());
        expect(renderer.root.findAllByType('ExercisePicker')[0].props.visible).toBe(true);
        expect(tutorialTip()).toBeUndefined();
        await act(async () => renderer.root.findAllByType('ExercisePicker')[0].props.onClose());
        await act(async () => useWorkoutStore.getState().addExercise(createExercise({ name: 'Squat' })));
        expect(tutorialTip()?.props.stage).toBe('log');
        const logged = useWorkoutStore.getState().activeWorkout!;
        logged.main.exercises[0].sets[0].status = 'completed';
        await act(async () => useWorkoutStore.setState({ activeWorkout: { ...logged } }));
        expect(tutorialTip()?.props.stage).toBe('finish');
        await act(async () => tutorialTip()?.props.onSkip());
        expect(mockTutorial.skip).toHaveBeenCalledTimes(1);
        expect(useWorkoutStore.getState().activeWorkout?.id).toBe(workout.id);
    });

    it('hides logging tips while editing history', async () => {
        mockTutorial.status = 'active';
        useWorkoutStore.setState({ isEditMode: true });
        await render();
        expect(tutorialTip()).toBeUndefined();
    });

    it.each([false, true])('preserves an existing workout when guided logging is requested (edit=%s)', async editing => {
        const workout = useWorkoutStore.getState().activeWorkout;
        useWorkoutStore.setState({ isEditMode: editing });
        mockTutorial.requestedAction = 'workout';
        await render();
        expect(useWorkoutStore.getState().activeWorkout).toBe(workout);
        expect(startWorkoutFromTemplate).not.toHaveBeenCalled();
        expect(mockTutorial.consumeAction).toHaveBeenCalledTimes(1);
    });

    it('starts an empty workout only after an explicit guided request', async () => {
        useWorkoutStore.setState({ activeWorkout: null });
        mockTutorial.requestedAction = 'workout';
        await render();
        expect(useWorkoutStore.getState().activeWorkout?.main.exercises).toEqual([]);
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('loads the current template for an explicit guided request', async () => {
        const workout = createWorkout('Planned workout');
        useWorkoutStore.setState({ activeWorkout: null });
        mockHomeData.currentTemplate = { id: 'plan' };
        (startWorkoutFromTemplate as jest.Mock).mockResolvedValueOnce(workout);
        mockTutorial.requestedAction = 'workout';
        await render();
        expect(startWorkoutFromTemplate).toHaveBeenCalledWith('plan');
        expect(useWorkoutStore.getState().activeWorkout?.id).toBe(workout.id);
    });

    it('does not overwrite a workout restored while loading the guided template', async () => {
        let resolve!: (value: unknown) => void;
        (startWorkoutFromTemplate as jest.Mock).mockReturnValueOnce(new Promise(done => { resolve = done; }));
        useWorkoutStore.setState({ activeWorkout: null });
        mockHomeData.currentTemplate = { id: 'plan' };
        mockTutorial.requestedAction = 'workout';
        await render();
        const restored = createWorkout('Restored workout');
        await act(async () => { useWorkoutStore.setState({ activeWorkout: restored }); resolve(createWorkout('Late template')); });
        expect(useWorkoutStore.getState().activeWorkout?.id).toBe(restored.id);
    });

    it('opens the split builder without changing an active workout', async () => {
        const workout = useWorkoutStore.getState().activeWorkout;
        mockTutorial.requestedAction = 'split';
        await render();
        expect(renderer.root.findByType('SplitsScreen').props).toMatchObject({ visible: true, startCreating: true });
        expect(useWorkoutStore.getState().activeWorkout).toBe(workout);
        expect(mockSave).not.toHaveBeenCalled();
    });
});
