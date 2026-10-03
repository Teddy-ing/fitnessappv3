import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, spacing, createThemedStyles } from '../../theme';

interface WorkoutTutorialTipProps {
    stage: 'add' | 'log' | 'finish';
    onSkip: () => void;
    onAddExercise?: () => void;
}

const tips = {
    add: { title: '1. Add your first exercise', body: 'Choose an exercise you want to do. You can add more as you train.' },
    log: { title: '2. Log your first set', body: 'Enter weight and reps, or time, then tap the checkmark after the set. The rest timer is optional.' },
    finish: { title: '3. Keep going, then Finish', body: 'Keep logging your sets. When your workout is done, tap Finish at the top to save it. Find it again in Profile → Calendar.' },
};

/** The parent derives the current tip from the active workout, so it stays in context. */
export default function WorkoutTutorialTip({ stage, onSkip, onAddExercise }: WorkoutTutorialTipProps) {
    const styles = useStyles();
    const tip = tips[stage];
    return (
        <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">{tip.title}</Text>
            <Text style={styles.body}>{tip.body}</Text>
            <View style={styles.actions}>
                {stage === 'add' && onAddExercise && (
                    <TouchableOpacity accessibilityRole="button" onPress={onAddExercise} style={styles.addButton}>
                        <Text style={styles.addText}>Add exercise</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skip workout tips" onPress={onSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip tips</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const useStyles = createThemedStyles((colors) => ({
    card: { padding: spacing.md, marginBottom: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.background.secondary, borderLeftWidth: 3, borderLeftColor: colors.accent.primary, gap: spacing.sm },
    title: { color: colors.text.primary, fontSize: 16, fontWeight: '600' },
    body: { color: colors.text.secondary, fontSize: 15, lineHeight: 23 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    addButton: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: 'center', backgroundColor: colors.accent.secondary, borderRadius: borderRadius.md },
    addText: { color: colors.text.onAccent, fontSize: 16, fontWeight: '600' },
    skipButton: { minHeight: 48, padding: spacing.sm, justifyContent: 'center' },
    skipText: { color: colors.accent.tertiary, fontSize: 15, fontWeight: '600' },
}));
