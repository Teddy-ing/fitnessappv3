import React from 'react';
import QuickStartGuide, { QuickStartGuideProps } from '../tutorial/QuickStartGuide';
import TutorialInvitation from '../tutorial/TutorialInvitation';
import WorkoutTutorialTip from '../tutorial/WorkoutTutorialTip';

jest.mock('react-native', () => {
    const React = require('react');
    return {
        View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView',
        Modal: ({ visible, children, ...props }: any) => visible ? React.createElement('Modal', props, children) : null,
        StyleSheet: { create: (value: unknown) => value },
    };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
let props: QuickStartGuideProps;

beforeEach(() => {
    props = {
        visible: true, experienced: false, hasPlan: false, weightUnit: 'lbs',
        onSkip: jest.fn(), onStartWorkout: jest.fn(), onCreateSplit: jest.fn(), onDone: jest.fn(), onDismiss: jest.fn(),
    };
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

async function mount(overrides: Partial<QuickStartGuideProps> = {}) {
    props = { ...props, ...overrides };
    await act(async () => { renderer = create(<QuickStartGuide {...props} />); });
}

async function press(label: string) {
    await act(async () => { renderer.root.findByProps({ accessibilityLabel: label }).props.onPress(); });
}

async function lastPage() {
    await press('Next tutorial page');
    await press('Next tutorial page');
}

function buttonWithText(label: string) {
    return renderer.root.findAllByType('TouchableOpacity').find((button: any) =>
        button.findAllByType('Text').some((text: any) => text.props.children === label));
}

it.each([0, 1, 2])('allows skipping page %i without starting or creating anything', async page => {
    await mount();
    for (let index = 0; index < page; index++) await press('Next tutorial page');
    await press('Skip tutorial');
    expect(props.onSkip).toHaveBeenCalledTimes(1);
    expect(props.onStartWorkout).not.toHaveBeenCalled();
    expect(props.onCreateSplit).not.toHaveBeenCalled();
    expect(props.onDone).not.toHaveBeenCalled();
});

it.each([0, 1, 2])('treats native back on page %i as skip', async page => {
    await mount();
    for (let index = 0; index < page; index++) await press('Next tutorial page');
    await act(async () => { renderer.root.findByType('Modal').props.onRequestClose(); });
    expect(props.onSkip).toHaveBeenCalledTimes(1);
    expect(props.onStartWorkout).not.toHaveBeenCalled();
});

it('navigates backward and resets to the first page when reopened', async () => {
    await mount();
    await lastPage();
    await press('Previous tutorial page');
    expect(JSON.stringify(renderer.toJSON())).toContain('One set at a time.');
    await act(async () => { renderer.update(<QuickStartGuide {...props} visible={false} />); });
    await act(async () => { renderer.update(<QuickStartGuide {...props} visible />); });
    expect(JSON.stringify(renderer.toJSON())).toContain('Start with one workout.');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('One set at a time.');
    await press('Back to app');
    expect(props.onSkip).toHaveBeenCalledTimes(1);
});

it('keeps browsing read-only and provides a Done exit', async () => {
    await mount();
    await lastPage();
    expect(props.onStartWorkout).not.toHaveBeenCalled();
    expect(props.onCreateSplit).not.toHaveBeenCalled();
    await act(async () => { buttonWithText('Done').props.onPress(); });
    expect(props.onDone).toHaveBeenCalledTimes(1);
    expect(props.onStartWorkout).not.toHaveBeenCalled();
});

it('keeps rapid repeated page taps within the three-page guide', async () => {
    await mount();
    const next = renderer.root.findByProps({ accessibilityLabel: 'Next tutorial page' }).props.onPress;
    await act(async () => { next(); next(); next(); });
    expect(JSON.stringify(renderer.toJSON())).toContain('Tutorial page 3 of 3');
    const back = renderer.root.findByProps({ accessibilityLabel: 'Previous tutorial page' }).props.onPress;
    await act(async () => { back(); back(); back(); });
    expect(JSON.stringify(renderer.toJSON())).toContain('Tutorial page 1 of 3');
    expect(props.onStartWorkout).not.toHaveBeenCalled();
});

it('starts a guided workout only after the explicit final choice', async () => {
    await mount();
    await lastPage();
    const primary = renderer.root.findByProps({ testID: 'tutorial-primary-action' });
    expect(primary.findByType('Text').props.children).toBe('Start guided workout');
    await act(async () => { primary.props.onPress(); });
    expect(props.onStartWorkout).toHaveBeenCalledTimes(1);
    expect(props.onCreateSplit).not.toHaveBeenCalled();
});

it('prioritizes split creation for experienced lifters and still offers guided logging', async () => {
    await mount({ experienced: true });
    const firstPage = JSON.stringify(renderer.toJSON());
    expect(firstPage).toContain('Create New Template');
    expect(firstPage).toContain('select it in the list');
    expect(firstPage).toContain('rest days');
    await lastPage();
    const primary = renderer.root.findByProps({ testID: 'tutorial-primary-action' });
    expect(primary.findByType('Text').props.children).toBe('Create my split');
    await act(async () => { primary.props.onPress(); });
    expect(props.onCreateSplit).toHaveBeenCalledTimes(1);
    expect(props.onStartWorkout).not.toHaveBeenCalled();
    await act(async () => { buttonWithText('Start guided workout').props.onPress(); });
    expect(props.onStartWorkout).toHaveBeenCalledTimes(1);
});

it('lets experienced lifters go straight to split creation from the first page', async () => {
    await mount({ experienced: true });
    await act(async () => { buttonWithText('Create my split').props.onPress(); });
    expect(props.onCreateSplit).toHaveBeenCalledTimes(1);
    expect(props.onStartWorkout).not.toHaveBeenCalled();
    expect(props.onDone).not.toHaveBeenCalled();
});

it.each(['lbs', 'kg'] as const)('shows the illustrative set in the selected %s unit', async weightUnit => {
    await mount({ weightUnit });
    await press('Next tutorial page');
    const content = JSON.stringify(renderer.toJSON());
    expect(content).toContain(weightUnit.toUpperCase());
    expect(content).toContain(weightUnit === 'kg' ? '20 kilograms' : '45 pounds');
    expect(content).toContain('Example only. Use your own numbers');
    expect(props.onStartWorkout).not.toHaveBeenCalled();
});

it.each([true, false])('explains the existing plan state (hasPlan=%s)', async hasPlan => {
    await mount({ hasPlan });
    expect(JSON.stringify(renderer.toJSON())).toContain(hasPlan
        ? 'Your plan is ready on the Workout tab.'
        : 'No plan is required.');
});

it('forwards native modal dismissal separately from skip', async () => {
    await mount();
    await act(async () => { renderer.root.findByType('Modal').props.onDismiss(); });
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onSkip).not.toHaveBeenCalled();
});

it('lets the user open or skip the optional invitation', async () => {
    const onOpen = jest.fn();
    const onSkip = jest.fn();
    await act(async () => { renderer = create(<TutorialInvitation experienced={false} onOpen={onOpen} onSkip={onSkip} />); });
    expect(onOpen).not.toHaveBeenCalled();
    await press('Open quick start tutorial');
    expect(onOpen).toHaveBeenCalledTimes(1);
    await press('Skip quick start tutorial');
    expect(onSkip).toHaveBeenCalledTimes(1);
});

it.each(['add', 'log', 'finish'] as const)('keeps %s workout tips skippable', async stage => {
    const onSkip = jest.fn();
    const onAddExercise = jest.fn();
    await act(async () => { renderer = create(<WorkoutTutorialTip stage={stage} onSkip={onSkip} onAddExercise={onAddExercise} />); });
    await press('Skip workout tips');
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onAddExercise).not.toHaveBeenCalled();
    if (stage === 'add') {
        await act(async () => { buttonWithText('Add exercise').props.onPress(); });
        expect(onAddExercise).toHaveBeenCalledTimes(1);
    } else {
        expect(buttonWithText('Add exercise')).toBeUndefined();
    }
});
