/**
 * RirSelector Component
 *
 * Quick-select popover for RIR (Reps in Reserve) values (0–5+).
 * Thin wrapper around NumericPillSelector (TD-032 DRY fix).
 */

import React from 'react';
import NumericPillSelector from './NumericPillSelector';

// Standard RIR options for quick logging. 5 represents 5+
export const RIR_VALUES = [0, 1, 2, 3, 4, 5];

const isHard = (val: number) => val === 0;
const formatLabel = (val: number) =>
    val === 5 ? '5+' : val.toString();

interface RirSelectorProps {
    visible: boolean;
    currentValue: number | null;
    onSelect: (value: number | null) => void;
    onClose: () => void;
}

export default function RirSelector(props: RirSelectorProps) {
    return (
        <NumericPillSelector
            {...props}
            title="RIR"
            subtitle="(Reps in Reserve)"
            values={RIR_VALUES}
            isHard={isHard}
            formatLabel={formatLabel}
        />
    );
}
