/**
 * SparklineRow Component
 *
 * A row displaying a measurement type name, a miniature SVG sparkline,
 * and the latest value. Used in the TrendsTab sparkline list.
 *
 * Includes the SparklineSVG sub-component for the pure SVG rendering.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Svg, { Polyline, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { colors, spacing, typography } from '../../theme';
import type { MeasurementType } from '../../models';

// ============================================================
// Constants
// ============================================================

const SPARKLINE_WIDTH = 100;
const SPARKLINE_HEIGHT = 32;

// ============================================================
// SparklineSVG — pure SVG sparkline
// ============================================================

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
}

function SparklineSVG({ data, width = SPARKLINE_WIDTH, height = SPARKLINE_HEIGHT, color = colors.accent.primary }: SparklineProps) {
    if (data.length < 2) {
        return (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.text.disabled, fontSize: 10 }}>—</Text>
            </View>
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4;

    const points = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <Svg width={width} height={height}>
            <Defs>
                <SvgGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <Stop offset="100%" stopColor={color} stopOpacity={0} />
                </SvgGradient>
            </Defs>
            <Polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

// ============================================================
// SparklineRow data shape
// ============================================================

export interface SparklineRowData {
    type: MeasurementType;
    dataPoints: number[];
    latestValue: number | null;
    unit: string;
}

// ============================================================
// SparklineRow
// ============================================================

interface SparklineRowProps {
    row: SparklineRowData;
    onPress: () => void;
}

export default function SparklineRow({ row, onPress }: SparklineRowProps) {
    const trendColor = row.dataPoints.length >= 2
        ? row.dataPoints[row.dataPoints.length - 1] >= row.dataPoints[0]
            ? colors.accent.success
            : colors.accent.error
        : colors.accent.primary;

    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.name}>{row.type.name}</Text>
            <View style={styles.chart}>
                <SparklineSVG data={row.dataPoints} color={trendColor} />
            </View>
            <View style={styles.valueCol}>
                <Text style={styles.value}>
                    {row.latestValue !== null ? row.latestValue : '—'}
                </Text>
                <Text style={styles.unit}>{row.unit}</Text>
            </View>
        </TouchableOpacity>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    name: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium as '500',
    },
    chart: {
        width: SPARKLINE_WIDTH,
        height: SPARKLINE_HEIGHT,
        marginHorizontal: spacing.sm,
    },
    valueCol: {
        alignItems: 'flex-end',
        minWidth: 55,
    },
    value: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
    unit: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        marginTop: 1,
    },
});
