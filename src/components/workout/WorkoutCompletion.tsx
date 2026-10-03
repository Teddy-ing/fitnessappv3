import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Workout } from '../../models/workout';
import { spacing, borderRadius, typography, createThemedStyles, useThemeColors } from '../../theme';
import { getWorkoutSummary, formatWorkoutDuration, formatWorkoutVolume } from '../../utils/workoutSummary';

interface Props {
    workout: Workout;
    weightUnit: string;
    onDone: () => void;
    onSaveTemplate?: () => void;
}

export default function WorkoutCompletion({ workout, weightUnit, onDone, onSaveTemplate }: Props) {
    const styles = useStyles();
    const colors = useThemeColors();
    const summary = useMemo(() => getWorkoutSummary(workout), [workout]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <View style={styles.trophyHalo}>
                        <LinearGradient colors={colors.gradient.celebration} style={styles.trophy}>
                            <MaterialIcons name="emoji-events" size={56} color="#fbbf24" />
                        </LinearGradient>
                        <View style={styles.check}><MaterialIcons name="check" size={20} color={colors.background.primary} /></View>
                    </View>
                    <Text style={styles.eyebrow}>WORKOUT COMPLETE</Text>
                    <Text style={styles.title} accessibilityRole="header">Strong finish.</Text>
                    <Text style={styles.message}>You showed up. You put in the work.</Text>
                </View>

                <View style={styles.summary}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <View style={styles.stats}>
                        <Stat value={formatWorkoutDuration(workout.totalDuration)} label="Duration" />
                        <Stat value={String(summary.completedExercises)} label={summary.completedExercises === 1 ? 'Exercise' : 'Exercises'} />
                        <Stat value={String(summary.completedSets)} label={summary.completedSets === 1 ? 'Set' : 'Sets'} />
                    </View>
                    {summary.totalVolume > 0 && (
                        <View style={styles.volume}>
                            <MaterialIcons name="fitness-center" size={19} color={colors.accent.tertiary} />
                            <Text style={styles.volumeValue}>{formatWorkoutVolume(summary.totalVolume, weightUnit)}</Text>
                            <Text style={styles.statLabel}>total volume</Text>
                        </View>
                    )}
                </View>

                <View style={styles.saved}>
                    <MaterialIcons name="check-circle" size={16} color={colors.accent.success} />
                    <Text style={styles.savedText}>Saved to your workout history</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity accessibilityRole="button" style={styles.doneButton} onPress={onDone}>
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                    {onSaveTemplate && (
                        <TouchableOpacity accessibilityRole="button" style={styles.templateButton} onPress={onSaveTemplate}>
                            <MaterialIcons name="add" size={18} color={colors.accent.tertiary} />
                            <Text style={styles.templateText}>Save as template</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    const styles = useStyles();
    return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const useStyles = createThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background.primary },
    content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingBottom: spacing.xxl },
    hero: { alignItems: 'center', marginBottom: spacing.xl },
    trophyHalo: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.decorative.purpleOrb, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
    trophy: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent.secondary },
    check: { position: 'absolute', bottom: 4, right: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent.success, justifyContent: 'center', alignItems: 'center' },
    eyebrow: { color: colors.accent.tertiary, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 2, marginBottom: spacing.sm },
    title: { color: colors.text.primary, fontSize: 36, fontWeight: '700', textAlign: 'center' },
    message: { color: colors.text.secondary, fontSize: typography.size.md, textAlign: 'center', marginTop: spacing.sm },
    summary: { backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius['2xl'], padding: spacing.md },
    workoutName: { color: colors.text.primary, fontSize: typography.size.lg, fontWeight: '600', textAlign: 'center', marginBottom: spacing.lg },
    stats: { flexDirection: 'row', gap: spacing.sm },
    stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
    statValue: { color: colors.text.primary, fontSize: typography.size.xl, fontWeight: '700', textAlign: 'center' },
    statLabel: { color: colors.text.secondary, fontSize: typography.size.sm },
    volume: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.lg },
    volumeValue: { color: colors.text.primary, fontSize: typography.size.md, fontWeight: '600' },
    saved: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    savedText: { color: colors.text.secondary, fontSize: typography.size.xs },
    actions: { marginTop: spacing.xl, gap: spacing.sm },
    doneButton: { backgroundColor: colors.accent.primary, borderRadius: borderRadius.lg, alignItems: 'center', padding: spacing.md },
    doneText: { color: colors.text.onAccent, fontSize: typography.size.lg, fontWeight: '700' },
    templateButton: { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
    templateText: { color: colors.accent.tertiary, fontSize: typography.size.md, fontWeight: '500' },
}));
