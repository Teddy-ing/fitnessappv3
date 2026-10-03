import React from 'react';
import { ThemeProvider, palettes, ThemeId } from '../theme';
import SaveTemplateModal from './SaveTemplateModal';
import NumericPillSelector from './NumericPillSelector';
import ErrorBoundary from './ErrorBoundary';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TextInput: 'TextInput', Modal: 'Modal',
    TouchableOpacity: 'TouchableOpacity', Pressable: 'Pressable',
    StyleSheet: { create: (styles: unknown) => styles },
    Alert: { alert: jest.fn() },
}));
jest.mock('../services', () => ({
    createTemplateFromWorkout: jest.fn(), findTemplatesByName: jest.fn(),
    overwriteTemplate: jest.fn(), getSplitsForTemplate: jest.fn(),
}));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const host = (type: string) => renderer.root.findAll((node: any) => node.type === type);
const text = (value: string) => host('Text').find((node: any) => node.props.children === value);
const flatten = (style: any): any => Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style;

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
});

it('changes an open modal palette while preserving its unsaved template name', () => {
    const onClose = jest.fn();
    const render = (themeId: ThemeId) => (
        <ThemeProvider themeId={themeId}>
            <SaveTemplateModal visible pendingWorkout={null} activeSplit={null}
                onClose={onClose} onSaved={jest.fn()} />
        </ThemeProvider>
    );
    act(() => { renderer = create(render('purple')); });
    act(() => host('TextInput')[0].props.onChangeText('My unsaved split'));
    expect(text('Save').props.style.color).toBe(palettes.purple.text.onAccent);
    act(() => { renderer.update(render('ironjot')); });
    expect(host('TextInput')[0].props.value).toBe('My unsaved split');
    expect(host('TextInput')[0].props.style.backgroundColor).toBe(palettes.ironjot.background.tertiary);
    expect(host('TextInput')[0].props.placeholderTextColor).toBe(palettes.ironjot.text.secondary);
    expect(text('Save').props.style.color).toBe(palettes.ironjot.text.onAccent);
    expect(text('Save').parent.props.style.backgroundColor).toBe(palettes.ironjot.accent.primary);
    expect(onClose).not.toHaveBeenCalled();
});

it('uses contrasting selected-pill text and preserves the hard-effort semantic color', () => {
    const render = (currentValue: number) => (
        <ThemeProvider themeId="ironjot">
            <NumericPillSelector visible title="Effort" values={[8, 10]} currentValue={currentValue}
                isHard={value => value === 10} onSelect={jest.fn()} onClose={jest.fn()} />
        </ThemeProvider>
    );
    act(() => { renderer = create(render(8)); });
    expect(flatten(text('8').props.style).color).toBe(palettes.ironjot.text.onAccent);
    expect(flatten(text('8').parent.props.style).backgroundColor).toBe(palettes.ironjot.accent.primary);
    act(() => { renderer.update(render(10)); });
    expect(flatten(text('10').props.style).color).toBe(palettes.ironjot.text.onAccent);
    expect(flatten(text('10').parent.props.style).backgroundColor).toBe(palettes.ironjot.accent.error);
});

it('updates an existing error fallback without resetting the boundary until Retry', () => {
    let failing = true;
    function Child() {
        if (failing) throw new Error('Test failure');
        return <React.Fragment>Recovered</React.Fragment>;
    }
    const render = (themeId: ThemeId) => (
        <ThemeProvider themeId={themeId}><ErrorBoundary><Child /></ErrorBoundary></ThemeProvider>
    );
    act(() => { renderer = create(render('purple')); });
    expect(text('Try Again').props.style.color).toBe(palettes.purple.text.onAccent);
    failing = false;
    act(() => { renderer.update(render('ironjot')); });
    expect(text('Test failure')).toBeDefined();
    expect(text('Try Again').props.style.color).toBe(palettes.ironjot.text.onAccent);
    act(() => text('Try Again').parent.props.onPress());
    expect(renderer.toJSON()).toBe('Recovered');
});
