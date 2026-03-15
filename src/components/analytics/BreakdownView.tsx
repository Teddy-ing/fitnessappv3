/**
 * BreakdownView
 *
 * Breakdown tab content: muscle group distribution chart
 * with metric and range selectors.
 */

import React, { useState } from 'react';
import { View } from 'react-native';

import {
    MetricType,
    ChartRange,
    CHART_RANGE_LABELS,
} from '../../models/analytics';
import MuscleDistributionChart from '../MuscleDistributionChart';
import MetricSelector from './MetricSelector';
import PillRow from './PillRow';

/** Breakdown tab excludes duration — it can't be distributed per muscle group */
const BREAKDOWN_METRICS: MetricType[] = ['volume', 'sets', 'reps'];
const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export default function BreakdownView() {
    const [metric, setMetric] = useState<MetricType>('volume');
    const [chartRange, setChartRange] = useState<ChartRange>('3M');

    return (
        <View>
            {/* Metric selector (excludes duration — can't distribute per muscle) */}
            <MetricSelector selected={metric} onSelect={setMetric} items={BREAKDOWN_METRICS} />

            {/* Range pills */}
            <PillRow
                items={CHART_RANGES}
                labels={CHART_RANGE_LABELS}
                selected={chartRange}
                onSelect={setChartRange}
            />

            {/* Pie chart */}
            <MuscleDistributionChart metric={metric} range={chartRange} />
        </View>
    );
}
