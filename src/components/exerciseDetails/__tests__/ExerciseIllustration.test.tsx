import React from 'react';
import { createExercise } from '../../../models/exercise';
import ExerciseIllustration from '../ExerciseIllustration';
import AboutTab from '../AboutTab';
import { getExerciseById } from '../../../services/exerciseService';
import { getExerciseNotes } from '../../../services/exerciseDetailsService';

jest.mock('react-native', () => ({
    View: 'View', Image: 'Image', Text: 'Text', ScrollView: 'ScrollView',
    TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (styles: any) => styles },
    Alert: { alert: jest.fn() },
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../../../assets/exercises/optimized/bench-press-barbell.jpg', () => 101, { virtual: true });
jest.mock('../../../../assets/exercises/optimized/squat-barbell.jpg', () => 102, { virtual: true });
jest.mock('../../../../assets/exercises/optimized/barbell-curl.jpg', () => 103, { virtual: true });
jest.mock('../../../services/exerciseService', () => ({ getExerciseById: jest.fn() }));
jest.mock('../../../services/exerciseDetailsService', () => ({
    getExerciseNotes: jest.fn(), saveExerciseNote: jest.fn(), deleteExerciseNote: jest.fn(),
}));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let renderer: any;
const host = (type: string) => renderer.root.findAll((node: any) => node.type === type);
const image = () => host('Image')[0];
const bench = createExercise({ id: 'bench-press-barbell', name: 'Bench Press (Barbell)' });
const squat = createExercise({ id: 'squat-barbell', name: 'Squat (Barbell)' });
const curl = createExercise({ id: 'barbell-curl', name: 'Barbell Curl' });

beforeEach(() => {
    jest.clearAllMocks();
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

it.each([
    [bench, 101, /bench press/i],
    [squat, 102, /back squat/i],
    [curl, 103, /barbell curl/i],
])('selects bundled artwork by exercise ID even after renaming: %s', async (exercise, source, label) => {
    await act(async () => {
        renderer = create(<ExerciseIllustration exercise={{ ...exercise, name: 'Renamed exercise' }} />);
    });
    expect(image().props.source).toBe(source);
    expect(image().props.resizeMode).toBe('contain');
    expect(image().props.accessibilityLabel).toMatch(label);
});

it.each([
    { ...bench, isCustom: true },
    { ...bench, id: 'custom-bench', isCustom: true },
    { ...bench, id: 'unlisted-strength-exercise' },
    { ...bench, id: 'toString' },
])('does not assign built-in art to custom or unknown exercises: %s', async exercise => {
    await act(async () => { renderer = create(<ExerciseIllustration exercise={exercise} />); });
    expect(host('Image')).toHaveLength(0);
    expect(host('MaterialIcons')[0].props.name).toBe('fitness-center');
});

it('preserves a supplied image and falls back to bundled artwork if it fails', async () => {
    await act(async () => {
        renderer = create(<ExerciseIllustration exercise={{ ...bench, imageUrl: 'file:///my-bench.jpg' }} />);
    });
    expect(image().props.source).toEqual({ uri: 'file:///my-bench.jpg' });
    expect(image().props.accessibilityLabel).toBe('Bench Press (Barbell) exercise image');

    await act(async () => { image().props.onError(); });
    expect(image().props.source).toBe(101);
    await act(async () => { image().props.onError(); });
    expect(host('Image')).toHaveLength(0);
    expect(host('MaterialIcons')[0].props.name).toBe('fitness-center');
});

it('uses the category fallback for a custom image failure without borrowing built-in art', async () => {
    await act(async () => {
        renderer = create(<ExerciseIllustration exercise={{ ...bench, isCustom: true, imageUrl: 'file:///custom.jpg', category: 'cardio' }} />);
    });
    expect(image().props.source).toEqual({ uri: 'file:///custom.jpg' });
    await act(async () => { image().props.onError(); });
    expect(host('Image')).toHaveLength(0);
    expect(host('MaterialIcons')[0].props.name).toBe('directions-run');
});

it('resets image failures when changing exercises or replacing the image URL', async () => {
    await act(async () => { renderer = create(<ExerciseIllustration exercise={bench} />); });
    await act(async () => { image().props.onError(); });
    expect(host('Image')).toHaveLength(0);

    await act(async () => { renderer.update(<ExerciseIllustration exercise={squat} />); });
    expect(image().props.source).toBe(102);
    await act(async () => { renderer.update(<ExerciseIllustration exercise={{ ...squat, imageUrl: 'file:///first.jpg' }} />); });
    await act(async () => { image().props.onError(); });
    expect(image().props.source).toBe(102);

    await act(async () => { renderer.update(<ExerciseIllustration exercise={{ ...squat, imageUrl: 'file:///replacement.jpg' }} />); });
    expect(image().props.source).toEqual({ uri: 'file:///replacement.jpg' });
});

it('shows bundled art alongside existing exercise instructions and notes in About', async () => {
    jest.mocked(getExerciseById).mockResolvedValue({ ...bench, instructions: ['Plant your feet.'] });
    jest.mocked(getExerciseNotes).mockResolvedValue([{
        id: 'note-1', exerciseId: bench.id, note: 'Pause each rep', createdAt: '2026-09-30T12:00:00Z',
    }]);
    await act(async () => { renderer = create(<AboutTab exerciseId={bench.id} />); });
    expect(getExerciseById).toHaveBeenCalledWith(bench.id);
    expect(image().props.source).toBe(101);
    expect(host('Text').some((node: any) => node.props.children === 'Plant your feet.')).toBe(true);
    expect(host('Text').some((node: any) => node.props.children === 'Pause each rep')).toBe(true);
});
