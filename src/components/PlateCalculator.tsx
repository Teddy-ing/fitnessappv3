/**
 * PlateCalculator Component
 * 
 * Modal showing the plate breakdown for a given weight.
 * Assumes standard Olympic barbell (45 lbs / 20 kg).
 * Shows plates per side.
 */

import React, { useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

// Standard plate inventory (in lbs, descending)
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARBELL_LBS = 45;
const BARBELL_KG = 20;

interface PlateResult {
    weight: number;
    count: number;
}

function calculatePlates(totalWeight: number, unit: string): PlateResult[] {
    const plates = unit === 'kg' ? PLATES_KG : PLATES_LBS;
    const barbellWeight = unit === 'kg' ? BARBELL_KG : BARBELL_LBS;

    let remaining = (totalWeight - barbellWeight) / 2; // per side
    if (remaining <= 0) return [];

    const result: PlateResult[] = [];

    for (const plate of plates) {
        if (remaining >= plate) {
            const count = Math.floor(remaining / plate);
            result.push({ weight: plate, count });
            remaining -= count * plate;
        }
    }

    return result;
}

// Plate color mapping for visual distinction
function getPlateColor(weight: number, unit: string): string {
    if (unit === 'kg') {
        if (weight >= 25) return '#E53E3E'; // Red
        if (weight >= 20) return '#3182CE'; // Blue
        if (weight >= 15) return '#ECC94B'; // Yellow
        if (weight >= 10) return '#48BB78'; // Green
        if (weight >= 5) return '#E2E8F0';  // White
        return '#A0AEC0'; // Gray
    }
    // lbs
    if (weight >= 45) return '#3182CE'; // Blue
    if (weight >= 35) return '#ECC94B'; // Yellow
    if (weight >= 25) return '#48BB78'; // Green
    if (weight >= 10) return '#E2E8F0'; // White
    if (weight >= 5) return '#E53E3E';  // Red
    return '#A0AEC0'; // Gray
}

interface PlateCalculatorProps {
    visible: boolean;
    weight: number;
    unit: string;
    onClose: () => void;
}

export default function PlateCalculator({
    visible,
    weight,
    unit,
    onClose,
}: PlateCalculatorProps) {
    const barbellWeight = unit === 'kg' ? BARBELL_KG : BARBELL_LBS;
    const plates = useMemo(() => calculatePlates(weight, unit), [weight, unit]);
    const isValid = weight > barbellWeight;
    const remainder = isValid
        ? (weight - barbellWeight) / 2 - plates.reduce((sum, p) => sum + p.weight * p.count, 0)
        : 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.container} onPress={() => {}}>
                    <Text style={styles.title}>Plate Calculator</Text>
                    <Text style={styles.subtitle}>
                        {weight} {unit} — {barbellWeight} {unit} barbell
                    </Text>

                    {!isValid ? (
                        <Text style={styles.info}>
                            Weight must be greater than the barbell ({barbellWeight} {unit})
                        </Text>
                    ) : (
                        <>
                            <Text style={styles.perSide}>Per side:</Text>
                            <View style={styles.platesList}>
                                {plates.map(plate => (
                                    <View key={plate.weight} style={styles.plateRow}>
                                        <View style={[
                                            styles.plateVisual,
                                            { backgroundColor: getPlateColor(plate.weight, unit) },
                                        ]}>
                                            <Text style={styles.plateWeight}>
                                                {plate.weight % 1 === 0 ? plate.weight : plate.weight.toFixed(1)}
                                            </Text>
                                        </View>
                                        <Text style={styles.plateCount}>
                                            ×{plate.count}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            {remainder > 0.01 && (
                                <Text style={styles.remainder}>
                                    +{remainder.toFixed(1)} {unit} cannot be loaded with standard plates
                                </Text>
                            )}
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: 280,
        alignItems: 'center',
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.xs,
    },
    subtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.lg,
    },
    info: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
        paddingVertical: spacing.md,
    },
    perSide: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
    },
    platesList: {
        width: '100%',
        gap: spacing.sm,
    },
    plateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    plateVisual: {
        width: 60,
        height: 36,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plateWeight: {
        color: '#1A202C',
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
    },
    plateCount: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    remainder: {
        color: colors.accent.warning,
        fontSize: typography.size.xs,
        marginTop: spacing.md,
        textAlign: 'center',
    },
});
