import React, { act } from 'react';
import { ThemeProvider, palettes } from '../../theme';
import { BAR_CHART_MARGINS, createLabelProcessor } from '../chartLabels';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', StyleSheet: { create: (styles: unknown) => styles },
}));

const { create } = require('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;

beforeEach(() => {
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
});

it('updates cached month/day label colors when the palette changes', () => {
    // Chart libraries can retain the factories. Only the rendered label uses a
    // hook; constructing the processor outside React remains valid.
    const processLabel = createLabelProcessor(BAR_CHART_MARGINS, {
        fontSize: 12, color: palettes.ironjot.text.secondary,
    });
    const monthHeader = processLabel('3/14');
    const dayOnly = processLabel('3/15');
    const labels = <>{monthHeader.labelComponent!()}{dayOnly.labelComponent!()}</>;
    act(() => { renderer = create(<ThemeProvider themeId="ironjot">{labels}</ThemeProvider>); });
    expect(renderer.root.findAllByType('Text').map((text: any) => text.props.children)).toEqual(['14', 'Mar', '15']);
    act(() => { renderer.update(<ThemeProvider themeId="purple">{labels}</ThemeProvider>); });
    const textStyles = renderer.root.findAllByType('Text').map((text: any) => Object.assign({}, ...text.props.style));
    expect(textStyles.map((style: any) => style.color)).toEqual([
        palettes.purple.text.primary, palettes.purple.text.secondary, palettes.purple.text.secondary,
    ]);
});

it('keeps month boundaries and non-date labels intact', () => {
    const processLabel = createLabelProcessor(BAR_CHART_MARGINS, { fontSize: 12 });
    expect(processLabel('Week 1')).toEqual({ displayLabel: 'Week 1', labelComponent: undefined });
    const march = processLabel('3/31');
    const april = processLabel('4/1');
    act(() => { renderer = create(<>{march.labelComponent!()}{april.labelComponent!()}</>); });
    expect(renderer.root.findAllByType('Text').map((text: any) => text.props.children)).toEqual(['31', 'Mar', '1', 'Apr']);
});
