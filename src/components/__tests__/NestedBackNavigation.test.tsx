import React from 'react';
import { BackHandler } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import CreateTemplateWizard from '../CreateTemplateWizard';
import WidgetEditorModal from '../widgets/WidgetEditorModal';
import TrendsTab from '../measurements/TrendsTab';
import { createExercise } from '../../models/exercise';
import { getActiveGoals, getSparklineDataBatch, getVisibleMeasurementTypes, updateSettings } from '../../services';
import { getSettings } from '../../services/preferencesService';

const mockBackHandlers = new Set<() => boolean>();

jest.mock('react-native', () => {
    const React = require('react');
    return {
        View: 'View', Text: 'Text', TextInput: 'TextInput',
        TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView',
        ActivityIndicator: 'ActivityIndicator',
        Modal: ({ visible, children, ...props }: any) => visible
            ? React.createElement('Modal', props, children) : null,
        StyleSheet: { create: (styles: any) => styles },
        Dimensions: { get: () => ({ width: 400, height: 800 }) },
        Alert: { alert: jest.fn() },
        BackHandler: {
            addEventListener: jest.fn((_event: string, handler: () => boolean) => {
                mockBackHandlers.add(handler);
                return { remove: () => mockBackHandlers.delete(handler) };
            }),
        },
    };
});
jest.mock('@react-navigation/native', () => ({ useIsFocused: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('..', () => ({ ExercisePicker: 'ExercisePicker' }));
jest.mock('../widgets/ExercisePickerView', () => 'WidgetExercisePicker');
jest.mock('../measurements/SparklineRow', () => 'SparklineRow');
jest.mock('../measurements/DetailChartView', () => 'DetailChartView');
jest.mock('../../hooks/useWeightUnit', () => ({ getWeightUnitSync: () => 'lbs' }));
jest.mock('../../services', () => ({
    getTemplates: jest.fn(), createTemplateFromWorkout: jest.fn(), updateSettings: jest.fn(),
    getActiveGoals: jest.fn(), getSparklineDataBatch: jest.fn(), getVisibleMeasurementTypes: jest.fn(),
}));
jest.mock('../../services/preferencesService', () => ({ getSettings: jest.fn() }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let renderer: any;
const hosts = (type: string) => renderer.root.findAll((node: any) => node.type === type);
const hasText = (text: string) => hosts('Text').some((node: any) => node.props.children === text);
const pressText = async (text: string) => {
    const label = hosts('Text').find((node: any) => node.props.children === text);
    if (!label) throw new Error(`Missing text: ${text}`);
    let button = label.parent;
    while (button && !button.props.onPress) button = button.parent;
    if (!button) throw new Error(`Missing button: ${text}`);
    await act(async () => { await button.props.onPress(); });
};
const modalBack = async () => {
    await act(async () => { hosts('Modal').at(-1).props.onRequestClose(); });
};
const hardwareBack = async () => {
    let handled = false;
    await act(async () => {
        for (const handler of Array.from(mockBackHandlers).reverse()) {
            if (handler()) { handled = true; break; }
        }
    });
    return handled;
};

beforeEach(() => {
    jest.clearAllMocks();
    mockBackHandlers.clear();
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.mocked(getSettings).mockResolvedValue({ weightUnit: 'lbs', visibleMeasurements: ['bodyweight'] } as any);
    jest.mocked(getActiveGoals).mockResolvedValue([]);
    jest.mocked(getVisibleMeasurementTypes).mockResolvedValue([{
        id: 'bodyweight', name: 'Bodyweight', category: 'core',
        unitImperial: 'lbs', unitMetric: 'kg', defaultVisible: true, orderIndex: 0,
    }]);
    jest.mocked(getSparklineDataBatch).mockResolvedValue(new Map([
        ['bodyweight', [{ date: '2026-10-01', value: 180 }]],
    ]));
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(async () => {
    if (renderer) await act(async () => { renderer.unmount(); });
    renderer = undefined;
    expect(mockBackHandlers.size).toBe(0);
    jest.restoreAllMocks();
});

it('returns from template exercises to the name step without losing the draft, then closes from the first step', async () => {
    const onClose = jest.fn();
    await act(async () => {
        renderer = create(<CreateTemplateWizard visible onClose={onClose} onTemplateCreated={jest.fn()} />);
    });
    await act(async () => { hosts('TextInput')[0].props.onChangeText('My Push Day'); });
    await pressText('Next →');
    await pressText('+ Add Exercise');
    await act(async () => {
        hosts('ExercisePicker')[0].props.onSelect(createExercise({ id: 'bench', name: 'Bench Press' }));
    });
    await pressText('+');
    await modalBack();
    expect(onClose).not.toHaveBeenCalled();
    expect(hosts('TextInput')[0].props.value).toBe('My Push Day');
    await pressText('Next →');
    expect(hasText('Bench Press')).toBe(true);
    expect(hosts('Text').some((node: any) => Array.isArray(node.props.children)
        && node.props.children[0] === 4 && node.props.children[1] === ' sets')).toBe(true);
    await modalBack();
    await modalBack();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hosts('TextInput')[0].props.value).toBe('');
});

it('backs from the widget exercise picker through catalog and editor without changing the widget configuration', async () => {
    const onClose = jest.fn();
    const onWidgetsChange = jest.fn();
    await act(async () => {
        renderer = create(<WidgetEditorModal visible widgets={[]} onClose={onClose} onWidgetsChange={onWidgetsChange} />);
    });
    await pressText('Add Widget');
    await pressText('Pinned Exercise');
    expect(hosts('WidgetExercisePicker')).toHaveLength(1);
    await modalBack();
    expect(hosts('WidgetExercisePicker')).toHaveLength(0);
    expect(hasText('Back to editor')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    await modalBack();
    expect(hasText('Edit Widgets')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    await modalBack();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onWidgetsChange).not.toHaveBeenCalled();
    expect(updateSettings).not.toHaveBeenCalled();
});

it('returns from a measurement chart to its list before allowing the stack to handle Back', async () => {
    await act(async () => { renderer = create(<TrendsTab />); });
    expect(mockBackHandlers.size).toBe(0);
    await act(async () => { hosts('SparklineRow')[0].props.onPress(); });
    expect(hosts('DetailChartView')).toHaveLength(1);
    expect(await hardwareBack()).toBe(true);
    expect(hosts('DetailChartView')).toHaveLength(0);
    expect(hosts('SparklineRow')).toHaveLength(1);
    expect(await hardwareBack()).toBe(false);
});

it('keeps a deep-linked chart selected across blur without intercepting another screen’s Back', async () => {
    await act(async () => { renderer = create(<TrendsTab autoSelectTypeId="bodyweight" />); });
    expect(hosts('DetailChartView')[0].props.type.id).toBe('bodyweight');
    expect(BackHandler.addEventListener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    jest.mocked(useIsFocused).mockReturnValue(false);
    await act(async () => { renderer.update(<TrendsTab autoSelectTypeId="bodyweight" />); });
    expect(await hardwareBack()).toBe(false);
    expect(hosts('DetailChartView')).toHaveLength(1);
    jest.mocked(useIsFocused).mockReturnValue(true);
    await act(async () => { renderer.update(<TrendsTab autoSelectTypeId="bodyweight" />); });
    expect(await hardwareBack()).toBe(true);
    expect(hosts('SparklineRow')).toHaveLength(1);
});
