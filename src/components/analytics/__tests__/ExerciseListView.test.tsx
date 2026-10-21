import React from 'react';
import ExerciseListView from '../ExerciseListView';
import { getPerformedExercises } from '../../../services/exerciseAnalyticsService';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

jest.mock('react-native', () => {
    const React = require('react');
    return {
        View: 'View', Text: 'Text', Image: 'Image', ScrollView: 'ScrollView',
        TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator', TextInput: 'TextInput',
        StyleSheet: { create: (styles: any) => styles },
        FlatList: ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent }: any) =>
            React.createElement('FlatList', null, ListHeaderComponent, data.length
                ? data.map((item: any, index: number) => React.createElement(React.Fragment,
                    { key: keyExtractor(item) }, renderItem({ item, index })))
                : ListEmptyComponent),
    };
});
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('../../../services/exerciseAnalyticsService', () => ({ getPerformedExercises: jest.fn() }));
jest.mock('../../../../assets/exercises/optimized/bench-press-barbell.jpg', () => 101, { virtual: true });
jest.mock('../../../../assets/exercises/optimized/barbell-curl.jpg', () => 103, { virtual: true });

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let renderer: any;
const hosts = (type: string) => renderer.root.findAll((node: any) => node.type === type);
const rowFor = (name: string) => {
    let node = hosts('Text').find((item: any) => item.props.children === name);
    if (!node) throw new Error(`Missing exercise: ${name}`);
    while (node && node.type !== 'TouchableOpacity') node = node.parent;
    return node;
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPerformedExercises).mockResolvedValue([
        { exerciseId: 'bench-press-barbell', exerciseName: 'Renamed bench', totalSessions: 4, lastPerformed: '2026-10-20T12:00:00Z' },
        { exerciseId: 'barbell-curl', exerciseName: 'Barbell Curl', totalSessions: 2, lastPerformed: '2026-10-19T12:00:00Z' },
        { exerciseId: '7542b0c9-8f67-48f0-a49a-cbb6520683b7', exerciseName: 'Bench Press (Barbell)', totalSessions: 1, lastPerformed: '2026-10-18T12:00:00Z' },
    ]);
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

it('uses exact bundled IDs for renamed exercises and keeps custom names from borrowing art', async () => {
    await act(async () => { renderer = create(<ExerciseListView />); });

    expect(hosts('Image').map((image: any) => image.props.source)).toEqual([101, 103]);
    expect(rowFor('Renamed bench').findByType('Image').props.resizeMode).toBe('contain');
    expect(rowFor('Bench Press (Barbell)').findAllByType('Image')).toHaveLength(0);
    expect(rowFor('Bench Press (Barbell)').findAllByType('MaterialIcons')
        .some((icon: any) => icon.props.name === 'fitness-center')).toBe(true);
});

it('falls back for a failed image while keeping other thumbnails and chart navigation working', async () => {
    await act(async () => { renderer = create(<ExerciseListView />); });
    await act(async () => { rowFor('Renamed bench').findByType('Image').props.onError(); });

    expect(hosts('Image').map((image: any) => image.props.source)).toEqual([103]);
    expect(rowFor('Renamed bench').findAllByType('MaterialIcons')
        .some((icon: any) => icon.props.name === 'fitness-center')).toBe(true);
    await act(async () => { rowFor('Renamed bench').props.onPress(); });
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetails', {
        exerciseId: 'bench-press-barbell', exerciseName: 'Renamed bench', initialTab: 'charts',
    });
});

it('keeps thumbnails attached to the correct exercises when search changes the visible rows', async () => {
    await act(async () => { renderer = create(<ExerciseListView />); });
    await act(async () => { hosts('TextInput')[0].props.onChangeText('curl'); });

    expect(hosts('Image').map((image: any) => image.props.source)).toEqual([103]);
    await act(async () => { rowFor('Barbell Curl').props.onPress(); });
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetails', {
        exerciseId: 'barbell-curl', exerciseName: 'Barbell Curl', initialTab: 'charts',
    });
    expect(getPerformedExercises).toHaveBeenCalledTimes(1);
});
