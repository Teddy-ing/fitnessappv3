import React from 'react';
import { createExercise } from '../../models/exercise';
import { Template } from '../../models/template';
import TemplateActionSheet from '../TemplateActionSheet';
import ExercisePicker from '../ExercisePicker';
import { getExercises, getSettings, updateTemplate } from '../../services';
import { getExerciseById } from '../../services/exerciseService';
import { getExerciseNotes, saveExerciseNote } from '../../services/exerciseDetailsService';

// The project uses ts-jest without the RN Babel preset. Keep native boundaries
// as host components while rendering the real editor, picker, guide and notes.
jest.mock('react-native', () => {
    const React = require('react');
    return {
        View: 'View', Text: 'Text', TextInput: 'TextInput',
        TouchableOpacity: 'TouchableOpacity', Image: 'Image',
        ActivityIndicator: 'ActivityIndicator',
        Modal: ({ visible, children, ...props }: any) => visible
            ? React.createElement('Modal', props, children) : null,
        ScrollView: ({ children, ...props }: any) => {
            const nativeScroll = React.useRef({ offset: 0 }).current;
            return React.createElement('ScrollView', { ...props, nativeScroll }, children);
        },
        FlatList: ({ data, renderItem, ListHeaderComponent, ListFooterComponent, ListEmptyComponent, ...props }: any) => {
            const nativeScroll = React.useRef({ offset: 0 }).current;
            return React.createElement('FlatList', { ...props, data, nativeScroll },
                ListHeaderComponent,
                data.length ? data.map((item: any, index: number) =>
                    React.createElement(React.Fragment, { key: item.id ?? item.key }, renderItem({ item, index })))
                    : ListEmptyComponent,
                ListFooterComponent,
            );
        },
        StyleSheet: { create: (styles: any) => styles, absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } },
        Keyboard: { dismiss: jest.fn() },
        Alert: { alert: jest.fn() },
    };
});
jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView',
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../../assets/exercise-placeholder.png', () => 1);
jest.mock('../../../assets/exercises/optimized/bench-press-barbell.jpg', () => 101, { virtual: true });
jest.mock('../../../assets/exercises/optimized/squat-barbell.jpg', () => 102, { virtual: true });
jest.mock('../../../assets/exercises/optimized/barbell-curl.jpg', () => 103, { virtual: true });
jest.mock('../../screens/AddExerciseScreen', () => () => null);
jest.mock('../../stores', () => ({ useWorkoutStore: { getState: () => ({ activeWorkout: null }) } }));
jest.mock('../../services', () => ({
    updateTemplate: jest.fn(), deleteTemplate: jest.fn(),
    getExercises: jest.fn(), getSettings: jest.fn(), getSuggestedExercises: jest.fn(),
    toggleExerciseFavorite: jest.fn(), toggleExerciseHidden: jest.fn(),
}));
jest.mock('../../services/exerciseService', () => ({ getExerciseById: jest.fn() }));
jest.mock('../../services/exerciseDetailsService', () => ({
    getExerciseNotes: jest.fn(), saveExerciseNote: jest.fn(), deleteExerciseNote: jest.fn(),
}));
jest.mock('../exerciseDetails/HistoryTab', () => () => null);
jest.mock('../exerciseDetails/ChartsTab', () => () => null);
jest.mock('../exerciseDetails/RecordsTab', () => () => null);

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const bench = createExercise({ id: 'bench', name: 'Bench Press', isFavorite: true });
const squat = createExercise({ id: 'squat', name: 'Squat' });
const row = createExercise({ id: 'row', name: 'Cable Row', isFavorite: true });
const run = createExercise({ id: 'run', name: 'Row Intervals', category: 'cardio', isFavorite: true });
const template: Template = {
    id: 'template-1', name: 'Push Day', description: null,
    exerciseCount: 2, lastUsedAt: null, useCount: 0, isFavorite: false,
    createdAt: new Date(), updatedAt: new Date(),
    exercises: [bench, squat].map((exercise, i) => ({
        id: `entry-${i}`, exercise, orderIndex: i, defaultSets: 3,
        note: null, supersetGroupId: 'existing-superset',
    })),
};

let renderer: any;
const host = (type: string) => renderer.root.findAll((node: any) => node.type === type);
const byLabel = (label: string) => host('TouchableOpacity').find((node: any) => node.props.accessibilityLabel === label);
const byText = (text: string) => host('Text').find((node: any) => node.props.children === text);
const pressText = async (text: string) => {
    const textNode = byText(text);
    if (!textNode) throw new Error(`Missing text: ${text}`);
    let button = textNode.parent;
    while (button && !button.props.onPress) button = button.parent;
    if (!button) throw new Error(`Missing button for: ${text}`);
    await act(async () => { await button.props.onPress(); });
};
const pressLabel = async (label: string) => {
    const button = byLabel(label);
    if (!button) throw new Error(`Missing button: ${label}`);
    await act(async () => { await button.props.onPress(); });
};
const hardwareBack = async () => {
    const modals = host('Modal');
    await act(async () => { modals[modals.length - 1].props.onRequestClose(); });
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getExercises).mockResolvedValue([bench, squat, row, run]);
    jest.mocked(getSettings).mockResolvedValue({ smartSuggestions: false } as any);
    jest.mocked(getExerciseById).mockImplementation(async id => [bench, squat, row, run].find(ex => ex.id === id) ?? null);
    jest.mocked(getExerciseNotes).mockResolvedValue([{
        id: 'note-1', exerciseId: 'bench', note: 'Keep elbows tucked',
        createdAt: '2026-09-29T12:00:00Z',
    }]);
    // React 19 reports renderer deprecation; it remains the native boundary test
    // harness here. Keep all other console errors visible.
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

it('keeps edited template name, sets, order and scroll while reading and saving exercise notes', async () => {
    const onClose = jest.fn();
    const onTemplateChanged = jest.fn();
    await act(async () => {
        renderer = create(<TemplateActionSheet template={template} visible onClose={onClose} onTemplateChanged={onTemplateChanged} />);
    });
    const editorScroll = host('ScrollView')[0].props.nativeScroll;
    editorScroll.offset = 240;
    await act(async () => { host('TextInput')[0].props.onChangeText('My Push Day'); });
    await pressLabel('Increase sets for Bench Press');
    await pressLabel('Move Squat up');
    await pressLabel('Information about Bench Press');
    expect(byText('Keep elbows tucked')).toBeDefined();
    expect(jest.mocked(getExerciseNotes)).toHaveBeenCalledWith('bench');

    const noteInput = host('TextInput').find((node: any) => node.props.multiline);
    await act(async () => { noteInput.props.onChangeText('Pause at the bottom'); });
    await pressText('Save Note');
    expect(saveExerciseNote).toHaveBeenCalledWith('bench', 'Pause at the bottom');
    await hardwareBack();

    expect(onClose).not.toHaveBeenCalled();
    expect(byLabel('Back to template')).toBeUndefined();
    expect(host('ScrollView')[0].props.nativeScroll).toBe(editorScroll);
    expect(editorScroll.offset).toBe(240);
    expect(host('TextInput')[0].props.value).toBe('My Push Day');
    await pressText('Save');
    expect(updateTemplate).toHaveBeenCalledWith('template-1', 'My Push Day', [
        { exercise: squat, defaultSets: 3, supersetGroupId: 'existing-superset' },
        { exercise: bench, defaultSets: 4, supersetGroupId: 'existing-superset' },
    ]);
    expect(onTemplateChanged).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
});

it('returns from picker information to the same filters, search and list, then adds to the original draft', async () => {
    const onClose = jest.fn();
    await act(async () => {
        renderer = create(<TemplateActionSheet template={template} visible onClose={onClose} onTemplateChanged={jest.fn()} />);
    });
    await act(async () => { host('TextInput')[0].props.onChangeText('Draft with row'); });
    await pressText('Add Exercise');
    await pressText('Strength');
    await pressText('★ Favorites');
    const search = host('TextInput').find((node: any) => node.props.placeholder === 'Search exercises...');
    await act(async () => { search.props.onChangeText('row'); });
    const list = () => host('FlatList').find((node: any) => !node.props.horizontal);
    const pickerScroll = list().props.nativeScroll;
    pickerScroll.offset = 180;
    expect(list().props.data.map((ex: any) => ex.id)).toEqual(['row']);

    await pressLabel('Information about Cable Row');
    expect(byLabel('Back to exercise picker')).toBeDefined();
    expect(updateTemplate).not.toHaveBeenCalled();
    await pressLabel('Back to exercise picker');
    expect(list().props.nativeScroll).toBe(pickerScroll);
    expect(pickerScroll.offset).toBe(180);
    expect(search.props.value).toBe('row');
    expect(list().props.data.map((ex: any) => ex.id)).toEqual(['row']);

    await pressLabel('Information about Cable Row');
    await hardwareBack();
    expect(byLabel('Back to exercise picker')).toBeUndefined();
    expect(list().props.data.map((ex: any) => ex.id)).toEqual(['row']);
    expect(onClose).not.toHaveBeenCalled();
    await pressLabel('Add Cable Row');
    expect(host('Modal')).toHaveLength(1);
    expect(host('TextInput')[0].props.value).toBe('Draft with row');
    await pressText('Save');
    const saved = jest.mocked(updateTemplate).mock.calls[0];
    expect(saved[0]).toBe('template-1');
    expect(saved[1]).toBe('Draft with row');
    expect(saved[2].map(entry => entry.exercise.id)).toEqual(['bench', 'squat', 'row']);
});

it('hardware back closes the picker before the template and header back closes only exercise info', async () => {
    const onClose = jest.fn();
    await act(async () => {
        renderer = create(<TemplateActionSheet template={template} visible onClose={onClose} onTemplateChanged={jest.fn()} />);
    });
    await pressLabel('Information about Bench Press');
    await pressLabel('Back to template');
    expect(onClose).not.toHaveBeenCalled();
    await pressText('Add Exercise');
    await hardwareBack();
    expect(host('Modal')).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
    await hardwareBack();
    expect(onClose).toHaveBeenCalledTimes(1);
});

it('uses modal-local top and bottom safe areas for the Android template and picker headers', async () => {
    await act(async () => {
        renderer = create(<TemplateActionSheet template={template} visible onClose={jest.fn()} onTemplateChanged={jest.fn()} />);
    });
    await pressText('Add Exercise');
    expect(host('SafeAreaProvider')).toHaveLength(2);
    for (const area of host('SafeAreaView')) {
        expect(area.props.edges).toEqual(['top', 'bottom']);
    }
    for (const modal of host('Modal')) {
        expect(modal.props.statusBarTranslucent).toBe(true);
        expect(modal.props.navigationBarTranslucent).toBe(true);
    }
});

it('information is separate from add and favorite actions in the picker', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await act(async () => {
        renderer = create(<ExercisePicker visible onSelect={onSelect} onClose={onClose} />);
    });
    const infoButton = byLabel('Information about Bench Press');
    expect(infoButton.parent.type).toBe('View');
    await pressLabel('Information about Bench Press');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await hardwareBack();
    await pressLabel('Add Bench Press');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(bench);
});
