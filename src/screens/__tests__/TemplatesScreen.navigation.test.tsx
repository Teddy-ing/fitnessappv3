import React from 'react';
import TemplatesScreen from '../TemplatesScreen';
import { getTemplates, updateTemplate } from '../../services';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView', Modal: 'Modal', TextInput: 'TextInput', RefreshControl: 'RefreshControl',
    StyleSheet: { create: (styles: unknown) => styles }, Alert: { alert: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../services', () => ({
    getTemplates: jest.fn(), deleteTemplate: jest.fn(), updateTemplate: jest.fn(), toggleTemplateFavorite: jest.fn(),
}));
jest.mock('../../components', () => ({ ExercisePicker: 'ExercisePicker' }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTemplates).mockResolvedValue([{
        id: 'template-1', name: 'Push Day', exerciseCount: 0, useCount: 0, exercises: [], isFavorite: false,
    } as any]);
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

it('cancels the unsaved edit on Android Back, then closes the template list on the next Back', async () => {
    const onClose = jest.fn();
    await act(async () => { renderer = create(<TemplatesScreen visible onClose={onClose} />); });
    const card = renderer.root.findAllByType('TouchableOpacity').find((node: any) => node.props.onLongPress);
    await act(async () => { card.props.onLongPress(); });
    await act(async () => { renderer.root.findByType('TextInput').props.onChangeText('Unsaved edit'); });
    await act(async () => { renderer.root.findByType('Modal').props.onRequestClose(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType('TextInput')).toHaveLength(0);
    expect(updateTemplate).not.toHaveBeenCalled();
    const reopenedCard = renderer.root.findAllByType('TouchableOpacity').find((node: any) => node.props.onLongPress);
    await act(async () => { reopenedCard.props.onLongPress(); });
    expect(renderer.root.findByType('TextInput').props.value).toBe('Push Day');
    await act(async () => { renderer.root.findByType('Modal').props.onRequestClose(); });
    await act(async () => { renderer.root.findByType('Modal').props.onRequestClose(); });
    expect(onClose).toHaveBeenCalledTimes(1);
});
