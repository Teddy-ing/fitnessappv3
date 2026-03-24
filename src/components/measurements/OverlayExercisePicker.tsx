/**
 * OverlayExercisePicker Component
 *
 * Bottom-sheet style exercise picker for the relative strength overlay.
 * Extracted from DetailChartView to keep component sizes under the 600-line guardrail.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Exercise } from '../../models/exercise';

interface OverlayExercisePickerProps {
    exercises: Exercise[];
    selectedId: string | null;
    onSelect: (exercise: Exercise) => void;
    onClose: () => void;
}

export default function OverlayExercisePicker({
    exercises,
    selectedId,
    onSelect,
    onClose,
}: OverlayExercisePickerProps) {
    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                <View style={styles.header}>
                    <Text style={styles.title}>Select Exercise</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.done}>Done</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    style={styles.list}
                    data={exercises.filter(e => e.trackWeight)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: ex }) => (
                        <TouchableOpacity
                            style={[
                                styles.row,
                                ex.id === selectedId && styles.rowActive,
                            ]}
                            onPress={() => onSelect(ex)}
                        >
                            <Text style={[
                                styles.rowText,
                                ex.id === selectedId && styles.rowTextActive,
                            ]}>
                                {ex.name}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    modal: {
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '60%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold as '600',
    },
    done: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
    list: {
        paddingBottom: spacing.xl,
    },
    row: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    rowActive: {
        backgroundColor: colors.accent.primary + '15',
    },
    rowText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    rowTextActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold as '600',
    },
});
