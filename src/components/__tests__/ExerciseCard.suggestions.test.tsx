import React from 'react';
import ExerciseCard from '../ExerciseCard';
import { createExercise } from '../../models/exercise';
import { createWorkoutExercise } from '../../models/workout';
import type { ExerciseSuggestion } from '../../models/smartSuggestions';

const { act, create } = require('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let mockWeightUnit = 'lbs';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', TextInput: 'TextInput',
    LayoutAnimation: { configureNext: jest.fn(), Presets: { easeInEaseOut: {} } },
    Platform: { OS: 'ios' }, UIManager: {},
    StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../hooks/useWeightUnit', () => ({ useWeightUnit: () => mockWeightUnit }));
jest.mock('../../navigation/navigationRef', () => ({ openWorkoutExerciseDetails: jest.fn() }));
jest.mock('../SetRow', () => ({ __esModule: true, default: 'SetRow' }));
jest.mock('../ActiveRestLine', () => ({ __esModule: true, default: 'ActiveRestLine' }));
jest.mock('../ExerciseMenu', () => ({ __esModule: true, default: 'ExerciseMenu' }));

const exercise = createWorkoutExercise(createExercise({ id: 'preacher', name: 'Preacher Curl' }), 0, 3);
const previousSets = [10, 7, 4].map(reps => ({ weight: 60, reps, type: 'working' as const }));
const suggestion: ExerciseSuggestion = {
    exerciseId: 'preacher',
    sets: [10, 7, 4].map(reps => ({ suggestedWeight: 60, suggestedReps: reps, confidence: 'medium', source: 'direct' })),
    progressionNudge: null,
    predictedSetCount: 3,
    smartRestDuration: null,
};
const props = {
    workoutExercise: exercise, exerciseId: exercise.id, previousSets,
    showProgressionNudges: true, exerciseSuggestion: suggestion,
    onUpdateSet: jest.fn(), onCompleteSet: jest.fn(), onAddSet: jest.fn(),
    onRemoveSet: jest.fn(), onRemoveExercise: jest.fn(),
};
let renderer: any;
const hosts = (type: string) => renderer.root.findAll((node: any) => node.type === type);
const banners = () => hosts('Text').map((node: any) => node.children.join('')).filter((text: string) => text.includes('sessions'));

beforeEach(() => { mockWeightUnit = 'lbs'; });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = undefined; });

it('removes an obsolete nudge while keeping the latest previous sets and suggestions intact', async () => {
    const oldSuggestion: ExerciseSuggestion = {
        ...suggestion, progressionNudge: { currentWeight: 50, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 55 },
    };
    await act(async () => { renderer = create(<ExerciseCard {...props} exerciseSuggestion={oldSuggestion} />); });
    expect(banners()).toEqual(['50×10 for 3 sessions — try 55!']);
    await act(async () => renderer.update(<ExerciseCard {...props} />));
    expect(banners()).toEqual([]);
    expect(hosts('SetRow').map((row: any) => row.props.previousData)).toEqual(previousSets);
    expect(hosts('SetRow').map((row: any) => row.props.suggestion.suggestedWeight)).toEqual([60, 60, 60]);
    expect(props.onUpdateSet).not.toHaveBeenCalled();
});

it.each([
    ['lbs', '50×10 for 3 sessions — try 55!'],
    ['kg', '22.7×10 for 3 sessions — try 24.9!'],
])('uses the selected %s unit for both weights in the nudge', async (unit, expected) => {
    mockWeightUnit = unit;
    await act(async () => {
        renderer = create(<ExerciseCard {...props} exerciseSuggestion={{
            ...suggestion, progressionNudge: { currentWeight: 50, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 55 },
        }} />);
    });
    expect(banners()).toEqual([expected]);
    expect(hosts('SetRow').every((row: any) => row.props.weightUnit === unit)).toBe(true);
});

it('keeps progression banners optional', async () => {
    await act(async () => {
        renderer = create(<ExerciseCard {...props} showProgressionNudges={false} exerciseSuggestion={{
            ...suggestion, progressionNudge: { currentWeight: 50, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 55 },
        }} />);
    });
    expect(banners()).toEqual([]);
});
