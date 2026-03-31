/**
 * RpeSelector Component
 *
 * Quick-select popover for RPE values (6–10 in 0.5 steps).
 * Thin wrapper around NumericPillSelector (TD-032 DRY fix).
 */

import React from 'react';
import NumericPillSelector from './NumericPillSelector';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const isHard = (val: number) => val >= 9.5;
const formatLabel = (val: number) =>
    val % 1 === 0 ? val.toString() : val.toFixed(1);

interface RpeSelectorProps {
    visible: boolean;
    currentValue: number | null;
    onSelect: (value: number | null) => void;
    onClose: () => void;
}

export default function RpeSelector(props: RpeSelectorProps) {
    return (
        <NumericPillSelector
            {...props}
            title="RPE"
            values={RPE_VALUES}
            isHard={isHard}
            formatLabel={formatLabel}
        />
    );
}
