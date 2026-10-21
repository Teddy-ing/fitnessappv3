import React from 'react';
import WorkoutHomeView from '../WorkoutHomeView';
import { createSplit } from '../../models/split';
import type { Template } from '../../services/templateService';

const { act, create } = require('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView',
    RefreshControl: 'RefreshControl', Modal: 'Modal',
    StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../components', () => ({ TemplatePickerModal: jest.requireActual('../../components/TemplatePickerModal').default }));
jest.mock('../SplitsScreen', () => ({ __esModule: true, default: 'SplitsScreen' }));
jest.mock('../TemplatesScreen', () => ({ __esModule: true, default: 'TemplatesScreen' }));
jest.mock('../../components/tutorial/TutorialProvider', () => ({ useTutorial: () => ({ status: 'skipped' }) }));
jest.mock('../../components/tutorial/TutorialInvitation', () => ({ __esModule: true, default: 'TutorialInvitation' }));

const templates = ['Ted upper', 'Lower', 'Push', 'Pull', 'Arms'].map((name, index) => ({
    id: `template-${index}`, name, exerciseCount: index + 1,
} as Template));
const split = createSplit('Ted Split', templates.map(template => template.id), [
    ...templates.map(template => ({ type: 'template' as const, templateId: template.id })),
    { type: 'rest' }, { type: 'rest' },
]);
const onStartFromTemplate = jest.fn();
const onChangeIndex = jest.fn();
let renderer: any;
const textOf = (node: any): string => node.children.map((child: any) => typeof child === 'string' ? child : textOf(child)).join('');
const hosts = (type: string) => renderer.root.findAll((node: any) => node.type === type);

function Home({ index = 0, empty = false }: { index?: number; empty?: boolean }) {
    return <WorkoutHomeView
        activeSplit={empty ? createSplit('Empty') : split}
        currentTemplate={empty ? null : templates[index] ?? null}
        currentTemplateIndex={index}
        templates={templates}
        workoutDatesThisWeek={[]}
        refreshing={false}
        onRefresh={jest.fn()}
        onStartWorkout={jest.fn()}
        onStartFromTemplate={onStartFromTemplate}
        onSplitSelected={jest.fn()}
        onTemplateIndexChanged={onChangeIndex}
        onSettingsPress={jest.fn()}
    />;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // A late start on Tuesday still uses the first position in the split.
    jest.setSystemTime(new Date(2026, 9, 20, 11, 32));
});
afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    renderer = undefined;
    jest.useRealTimers();
});

it('shows the split position on Tuesday and selects and starts that same workout', async () => {
    await act(async () => { renderer = create(<Home />); });
    expect(hosts('Text').some((node: any) => textOf(node) === 'SPLIT DAY 1 OF 7')).toBe(true);
    await act(async () => hosts('TouchableOpacity').find((node: any) => node.props.accessibilityLabel === 'Choose split day').props.onPress());
    expect(hosts('Modal')[0].props.visible).toBe(true);
    const selected = hosts('TouchableOpacity').filter((node: any) => node.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('Split day 1: Ted upper');
    await act(async () => hosts('TouchableOpacity').find((node: any) => textOf(node) === 'START WORKOUT').props.onPress());
    expect(onStartFromTemplate).toHaveBeenCalledWith(templates[0]);
});

it('changes by schedule position, including rest days, and preserves a coherent picker selection', async () => {
    await act(async () => { renderer = create(<Home index={4} />); });
    await act(async () => hosts('TouchableOpacity').find((node: any) => node.props.accessibilityLabel === 'Choose split day').props.onPress());
    const restDay = hosts('TouchableOpacity').find((node: any) => node.props.accessibilityLabel === 'Split day 6: Rest Day');
    await act(async () => restDay.props.onPress());
    expect(onChangeIndex).toHaveBeenCalledWith(5);
    expect(hosts('Modal')[0].props.visible).toBe(false);
    await act(async () => renderer.update(<Home index={5} />));
    expect(hosts('Text').some((node: any) => textOf(node) === 'SPLIT DAY 6 OF 7')).toBe(true);
    expect(hosts('Text').some((node: any) => textOf(node) === 'Up next: ')).toBe(false);
    const selected = hosts('TouchableOpacity').filter((node: any) => node.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('Split day 6: Rest Day');
});

it('does not display an impossible day count for an empty split', async () => {
    await act(async () => { renderer = create(<Home empty />); });
    expect(hosts('Text').some((node: any) => textOf(node).includes('SPLIT DAY'))).toBe(false);
});
