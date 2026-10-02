import React from 'react';
import { Alert } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import ExerciseMappingScreen, { type ExerciseMappingParams } from '../ExerciseMappingScreen';
import { executeCompetitorImport, getImportSummary } from '../../services/competitorImportService';
import type { ExerciseMapping } from '../../services/importParsers/types';

let mockParams: ExerciseMappingParams;
const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
    useRoute: () => ({ params: mockParams }),
    useNavigation: () => mockNavigation,
    usePreventRemove: jest.fn(),
}));
jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (styles: unknown) => styles },
    Alert: { alert: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../components', () => ({ ExercisePicker: 'ExercisePicker' }));
jest.mock('../../components/import/CustomExerciseConfigModal', () => 'CustomExerciseConfigModal');
jest.mock('../../services/exerciseService', () => ({ getExercises: jest.fn() }));
jest.mock('../../services/competitorImportService', () => ({
    executeCompetitorImport: jest.fn(), getImportSummary: jest.fn(),
}));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const mapping = (name: string): ExerciseMapping => ({
    originalName: name,
    suggestedMatch: { id: `${name}-best`, name: `${name} best match` },
    suggestedMatches: [
        { id: `${name}-best`, name: `${name} best match`, confidence: 65 },
        { id: `${name}-other`, name: `${name} other match`, confidence: 50 },
    ],
    confidence: 65, action: 'map', resolvedExerciseId: null,
});
const findText = (text: string) => renderer.root.findAllByType('Text')
    .find((node: any) => node.children.join('') === text);
const pressText = async (text: string) => {
    let button = findText(text);
    if (!button) throw new Error(`Missing text: ${text}`);
    while (!button.props.onPress) button = button.parent;
    await act(async () => { button.props.onPress(); });
};
const renderScreen = async () => {
    await act(async () => { renderer = create(<ExerciseMappingScreen />); });
};

beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
        source: 'hevy', workouts: [], measurements: [], warnings: [],
        mappings: [mapping('A'), mapping('B'), mapping('C')], skipToSummary: false,
    };
    jest.mocked(getImportSummary).mockReturnValue({
        source: 'hevy', totalWorkouts: 1, totalSets: 3, totalExercises: 3,
        totalMeasurements: 0, mappedExercises: 3, unmappedExercises: 0,
        skippedExercises: 0, warnings: [],
    });
    jest.mocked(executeCompetitorImport).mockResolvedValue({
        workoutsInserted: 1, setsInserted: 3, exercisesCreated: 1, measurementsInserted: 0,
    });
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(async () => {
    if (renderer) await act(async () => { renderer.unmount(); });
    renderer = undefined;
    jest.restoreAllMocks();
});

it('reviews every initial unresolved exercise and imports the actual suggestion, search, and custom choices', async () => {
    // Defaults to custom when no match exists, but still offers configuration.
    mockParams.mappings[2] = { ...mapping('C'), action: 'create', suggestedMatch: null, suggestedMatches: [] };
    await renderScreen();
    expect(findText('1 of 3')).toBeDefined();
    await pressText('A other match');
    expect(findText('B')).toBeDefined();
    expect(findText('2 of 3')).toBeDefined();
    await pressText('Search All Exercises');
    await act(async () => {
        renderer.root.findByType('ExercisePicker').props.onSelect({ id: 'searched-b', name: 'Searched B' });
    });
    expect(findText('C')).toBeDefined();
    expect(findText('3 of 3')).toBeDefined();
    await pressText('Create as Custom Exercise');
    await act(async () => {
        renderer.root.findByType('CustomExerciseConfigModal').props.onConfirm('back', 'dumbbell');
    });
    expect(findText('Import Summary')).toBeDefined();
    expect(executeCompetitorImport).not.toHaveBeenCalled();
    await pressText('Import Data');
    expect(executeCompetitorImport).toHaveBeenCalledWith([], [
        expect.objectContaining({ originalName: 'A', action: 'map', resolvedExerciseId: 'A-other' }),
        expect.objectContaining({ originalName: 'B', action: 'map', resolvedExerciseId: 'searched-b' }),
        expect.objectContaining({ originalName: 'C', action: 'create', customMuscleGroup: 'back', customEquipment: 'dumbbell' }),
    ], []);
});

it('keeps skipped items in the review order so Previous can revise the decision without losing the next item', async () => {
    await renderScreen();
    await pressText('Skip This Exercise');
    expect(findText('B')).toBeDefined();
    await pressText('Previous');
    expect(findText('A')).toBeDefined();
    await pressText('A best match');
    expect(findText('B')).toBeDefined();
    await pressText('Skip This Exercise');
    expect(findText('C')).toBeDefined();
    await pressText('Skip This Exercise');
    expect(findText('Import Summary')).toBeDefined();
    const summaryMappings = jest.mocked(getImportSummary).mock.calls.at(-1)![3];
    expect(summaryMappings.map(({ action }) => action)).toEqual(['map', 'skip', 'skip']);
});

it('does not advance past the next exercise when the same choice is tapped twice before rendering', async () => {
    await renderScreen();
    const firstChoice = findText('A best match').parent.parent;
    await act(async () => { firstChoice.props.onPress(); firstChoice.props.onPress(); });
    expect(findText('B')).toBeDefined();
    expect(findText('2 of 3')).toBeDefined();
    expect(findText('Import Summary')).toBeUndefined();
});

it.each([true, false])('opens summary without changing hook order when skipToSummary=%s and no review items remain', async (skipToSummary) => {
    mockParams.skipToSummary = skipToSummary;
    mockParams.mappings = [{ ...mapping('A'), resolvedExerciseId: 'already-mapped' }];
    await renderScreen();
    expect(findText('Import Summary')).toBeDefined();
    await act(async () => {
        renderer.root.findByProps({ accessibilityLabel: 'Close import summary' }).props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(executeCompetitorImport).not.toHaveBeenCalled();
});

it('allows canceling mapping without writing import data', async () => {
    await renderScreen();
    await act(async () => {
        renderer.root.findByProps({ accessibilityLabel: 'Close exercise mapping' }).props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(executeCompetitorImport).not.toHaveBeenCalled();
});

it('blocks close, route removal, and duplicate import while saving, then restores return navigation', async () => {
    mockParams.skipToSummary = true;
    let finishImport!: (result: Awaited<ReturnType<typeof executeCompetitorImport>>) => void;
    jest.mocked(executeCompetitorImport).mockReturnValue(new Promise(resolve => { finishImport = resolve; }));
    await renderScreen();
    const staleClose = renderer.root.findByProps({ accessibilityLabel: 'Close import summary' }).props.onPress;
    const importButton = findText('Import Data').parent;
    await act(async () => { importButton.props.onPress(); importButton.props.onPress(); staleClose(); });
    expect(executeCompetitorImport).toHaveBeenCalledTimes(1);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Close import summary' }).props.disabled).toBe(true);
    expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
    await act(async () => {
        finishImport({ workoutsInserted: 1, setsInserted: 3, exercisesCreated: 0, measurementsInserted: 0 });
    });
    expect(usePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
    expect(renderer.root.findByProps({ accessibilityLabel: 'Close import summary' }).props.disabled).toBe(false);
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;
    await act(async () => { buttons[0].onPress!(); });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});

it('restores close navigation if import fails', async () => {
    mockParams.skipToSummary = true;
    jest.mocked(executeCompetitorImport).mockRejectedValue(new Error('Unable to save import'));
    jest.mocked(console.error).mockImplementation(() => {});
    await renderScreen();
    await pressText('Import Data');
    expect(Alert.alert).toHaveBeenCalledWith('Import Failed', 'Unable to save import');
    expect(usePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
    const close = renderer.root.findByProps({ accessibilityLabel: 'Close import summary' });
    expect(close.props.disabled).toBe(false);
    await act(async () => { close.props.onPress(); });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});
