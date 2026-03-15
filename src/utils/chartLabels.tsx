/**
 * Chart Label Utilities
 *
 * Shared logic for building x-axis label components across analytics charts.
 * Handles the month-header / day-only pattern used by all chart types.
 *
 * Created to eliminate TD-002 (label logic copy-pasted 3×).
 */

import React from 'react';
import { View, Text, TextStyle } from 'react-native';

import { colors } from '../theme';

// ============================================================
// Constants
// ============================================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ============================================================
// Types
// ============================================================

/** Layout margins that differ between bar charts and line charts */
export interface ChartLabelMargins {
    /** marginLeft for month-header labels (day + month name) */
    monthHeaderMarginLeft: number;
    /** Width of the month-header container */
    monthHeaderWidth: number;
    /** marginLeft for day-only labels */
    dayOnlyMarginLeft: number;
    /** Width of the day-only container */
    dayOnlyWidth: number;
}

/** Result from processing a data point's label */
export interface ProcessedLabel {
    /** Display label string (the day number when split, or original) */
    displayLabel: string;
    /** React component factory for the x-axis, or undefined if no custom label needed */
    labelComponent: (() => React.ReactElement) | undefined;
}

// ============================================================
// Preset margin configs
// ============================================================

/** Margins tuned for bar charts (BarChart from gifted-charts) */
export const BAR_CHART_MARGINS: ChartLabelMargins = {
    monthHeaderMarginLeft: -11,
    monthHeaderWidth: 34,
    dayOnlyMarginLeft: -4,
    dayOnlyWidth: 20,
};

/** Margins tuned for line charts (LineChart from gifted-charts) */
export const LINE_CHART_MARGINS: ChartLabelMargins = {
    monthHeaderMarginLeft: -17,
    monthHeaderWidth: 34,
    dayOnlyMarginLeft: -10,
    dayOnlyWidth: 20,
};

// ============================================================
// Label processor
// ============================================================

/**
 * Create a stateful label processor for a sequence of chart data points.
 *
 * Tracks which month was last shown so that month headers only appear
 * on the first data point of each new month. Must be called once per
 * render pass (the returned function is called per data point in order).
 *
 * @param margins - Layout margins for the chart type
 * @param axisTextStyle - Base text style for axis labels
 */
export function createLabelProcessor(
    margins: ChartLabelMargins,
    axisTextStyle: TextStyle,
) {
    let lastMonth = '';

    /**
     * Process a single label string (e.g., "3/14") and return
     * the display label + an optional labelComponent factory.
     */
    return function processLabel(label: string): ProcessedLabel {
        const parts = label.split('/');
        if (parts.length !== 2) {
            return { displayLabel: label, labelComponent: undefined };
        }

        const currentMonth = parts[0];
        const currentDay = parts[1];

        let labelComponent: (() => React.ReactElement) | undefined;

        if (currentMonth !== lastMonth) {
            lastMonth = currentMonth;
            const monthIndex = parseInt(currentMonth, 10) - 1;
            const monthName = MONTH_NAMES[monthIndex] || currentMonth;
            labelComponent = () => (
                <View style={{
                    alignItems: 'center',
                    width: margins.monthHeaderWidth,
                    marginLeft: margins.monthHeaderMarginLeft,
                    marginTop: 12,
                }}>
                    <Text style={[axisTextStyle, { color: colors.text.primary }]}>
                        {currentDay}
                    </Text>
                    <Text style={[axisTextStyle, {
                        fontWeight: 'bold',
                        color: colors.text.secondary,
                        marginTop: 2,
                    }]}>
                        {monthName}
                    </Text>
                </View>
            );
        } else {
            labelComponent = () => (
                <View style={{
                    alignItems: 'center',
                    width: margins.dayOnlyWidth,
                    marginLeft: margins.dayOnlyMarginLeft,
                    marginTop: 12,
                }}>
                    <Text style={axisTextStyle}>{currentDay}</Text>
                </View>
            );
        }

        return { displayLabel: currentDay, labelComponent };
    };
}
