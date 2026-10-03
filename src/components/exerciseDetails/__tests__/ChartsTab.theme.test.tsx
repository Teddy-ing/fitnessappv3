import React from 'react';
import ChartsTab from '../ChartsTab';
import { ThemeProvider, ironjotColors, purpleColors, type ThemeId } from '../../../theme';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (styles: unknown) => styles },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));
jest.mock('react-native-gifted-charts', () => ({ BarChart: 'BarChart', LineChart: 'LineChart' }));
jest.mock('../../../hooks/useWeightUnit', () => ({ useWeightUnit: () => 'kg' }));

const mockPoints = [{ label: '10/1', value: 100 }, { label: '10/2', value: 110 }];
let mockData = mockPoints;
jest.mock('../../../hooks/useExerciseAnalytics', () => ({
    useExerciseAnalytics: () => {
        const [chartRange, setChartRange] = require('react').useState('1M');
        return { chartRange, setChartRange, est1rm: mockData, maxWeight: mockData, volume: mockData, loading: false };
    },
}));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const app = (themeId: ThemeId) => <ThemeProvider themeId={themeId}><ChartsTab exerciseId="squat" /></ThemeProvider>;
const rangeButton = (label: string) => renderer.root.findAllByType('TouchableOpacity')
    .find((node: any) => node.findByType('Text').props.children === label);

beforeEach(() => { mockData = mockPoints; });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = undefined; });

it('recolors memoized chart data in place while keeping the selected range', async () => {
    await act(async () => { renderer = create(app('purple')); });
    await act(async () => rangeButton('3M').props.onPress());
    expect(renderer.root.findByType('BarChart').props.data[0].frontColor).toBe(purpleColors.accent.primary);

    await act(async () => renderer.update(app('ironjot')));
    const chart = renderer.root.findByType('BarChart');
    expect(chart.props.data[0].frontColor).toBe(ironjotColors.accent.primary);
    expect(chart.props.data[0].gradientColor).toBe(ironjotColors.accent.tertiary);
    expect(chart.props.yAxisTextStyle.color).toBe(ironjotColors.text.secondary);
    expect(rangeButton('3M').props.style[1].backgroundColor).toBe(ironjotColors.accent.primary);
    expect(rangeButton('3M').findByType('Text').props.style[1].color).toBe(ironjotColors.text.onAccent);
    expect(rangeButton('1M').props.style[1]).toBe(false);
});

it('keeps hook order stable when a chart range changes between empty and populated data', async () => {
    mockData = [];
    await act(async () => { renderer = create(app('ironjot')); });
    expect(renderer.root.findAllByType('BarChart')).toHaveLength(0);
    mockData = mockPoints;
    await act(async () => renderer.update(app('purple')));
    expect(renderer.root.findAllByType('BarChart')).toHaveLength(1);
    expect(renderer.root.findAllByType('LineChart')).toHaveLength(2);
    mockData = [];
    await act(async () => renderer.update(app('purple')));
    expect(renderer.root.findAllByType('BarChart')).toHaveLength(0);
});
