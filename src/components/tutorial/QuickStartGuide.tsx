import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, createThemedStyles, useThemeColors } from '../../theme';

export interface QuickStartGuideProps {
    visible: boolean;
    experienced: boolean;
    hasPlan: boolean;
    weightUnit: 'lbs' | 'kg';
    onSkip: () => void;
    onStartWorkout: () => void;
    onCreateSplit: () => void;
    onDone: () => void;
    onDismiss?: () => void;
}

function GuideCard({ title, children }: { title: string; children: React.ReactNode }) {
    const styles = useStyles();
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {children}
        </View>
    );
}

/** A read-only overview. Only an explicit action can start a real workout. */
export default function QuickStartGuide({
    visible, experienced, hasPlan, weightUnit, onSkip, onStartWorkout, onCreateSplit, onDone, onDismiss,
}: QuickStartGuideProps) {
    const styles = useStyles();
    const colors = useThemeColors();
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (visible) setPage(0);
    }, [visible]);

    const primaryAction = experienced ? onCreateSplit : onStartWorkout;
    const secondaryAction = experienced ? onStartWorkout : onCreateSplit;
    const primaryLabel = experienced ? 'Create my split' : 'Start guided workout';
    const secondaryLabel = experienced ? 'Start guided workout' : 'Create my split';

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onSkip} onDismiss={onDismiss} presentationStyle="fullScreen">
            <SafeAreaView style={styles.container} accessibilityViewIsModal>
                <View style={styles.header}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={page === 0 ? 'Back to app' : 'Previous tutorial page'}
                        onPress={() => page === 0 ? onSkip() : setPage(value => Math.max(0, value - 1))}
                        style={styles.headerButton}
                    >
                        <Text style={styles.linkText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Quick start</Text>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skip tutorial" onPress={onSkip} style={styles.headerButton}>
                        <Text style={styles.linkText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView key={page} contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.progress} accessibilityLabel={`Tutorial page ${page + 1} of 3`}>STEP {page + 1} OF 3</Text>
                    {page === 0 && (experienced ? (
                        <>
                            <Text style={styles.title} accessibilityRole="header">Bring your routine.</Text>
                            <Text style={styles.body}>A template is a reusable workout. A split puts your workouts and rest days in order.</Text>
                            <GuideCard title="Build your split">
                                <Text style={styles.sequence}>1. Name your split.</Text>
                                <Text style={styles.sequence}>2. Choose workouts. Need one? Tap + Create New Template.</Text>
                                <Text style={styles.sequence}>3. Add rest days and arrange the order.</Text>
                                <Text style={styles.sequence}>4. Tap Create Split, then select it in the list.</Text>
                            </GuideCard>
                            <Text style={styles.helper}>You can also start an empty workout and build your routine later.</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.title} accessibilityRole="header">Start with one workout.</Text>
                            <Text style={styles.body}>{hasPlan
                                ? 'Your plan is ready on the Workout tab. Take it one set at a time.'
                                : 'You can log your first workout right away. No plan is required.'}</Text>
                            <GuideCard title={hasPlan ? 'Use your plan' : 'Use a saved workout'}>
                                <Text style={styles.body}>{hasPlan
                                    ? 'Tap START WORKOUT to load today’s exercises.'
                                    : 'Browse all templates to choose a workout.'} A template is a reusable workout; a split puts workouts and rest days in order.</Text>
                            </GuideCard>
                            <GuideCard title="Or start empty">
                                <Text style={styles.body}>Choose Start an empty workout, then add your first exercise. Build your routine as you go.</Text>
                            </GuideCard>
                        </>
                    ))}

                    {page === 1 && (
                        <>
                            <Text style={styles.title} accessibilityRole="header">One set at a time.</Text>
                            <Text style={styles.body}>Enter your weight and reps, or time for a timed exercise. Tap the checkmark after you finish that set.</Text>
                            <View style={styles.card}>
                                <Text style={styles.exampleLabel}>EXAMPLE SET</Text>
                                <View
                                    style={styles.exampleRow}
                                    accessible
                                    accessibilityLabel={`Example set: ${weightUnit === 'kg' ? '20 kilograms' : '45 pounds'}, 8 reps, then tap the checkmark. Illustration only.`}
                                >
                                    <View style={styles.exampleCell}>
                                        <Text style={styles.exampleHeading}>{weightUnit.toUpperCase()}</Text>
                                        <Text style={styles.exampleValue}>{weightUnit === 'kg' ? '20' : '45'}</Text>
                                    </View>
                                    <View style={styles.exampleCell}>
                                        <Text style={styles.exampleHeading}>REPS</Text>
                                        <Text style={styles.exampleValue}>8</Text>
                                    </View>
                                    <View style={[styles.exampleCell, styles.checkCell]}>
                                        <Text style={styles.exampleHeading}>DONE</Text>
                                        <MaterialIcons name="check" size={30} color={colors.accent.success} importantForAccessibility="no" />
                                    </View>
                                </View>
                                <Text style={styles.helper}>Example only. Use your own numbers when you train.</Text>
                            </View>
                            <GuideCard title="Rest when you need to">
                                <Text style={styles.body}>The rest timer is optional. Keep logging your sets at your own pace.</Text>
                            </GuideCard>
                        </>
                    )}

                    {page === 2 && (
                        <>
                            <Text style={styles.title} accessibilityRole="header">Finish. Come back stronger.</Text>
                            <GuideCard title="Save your session">
                                <Text style={styles.body}>When your workout is done, tap Finish at the top to save it to your history.</Text>
                            </GuideCard>
                            <GuideCard title="See your progress">
                                <Text style={styles.body}>Open Profile → Calendar to revisit workouts, or Statistics to see your progress.</Text>
                            </GuideCard>
                            <Text style={styles.helper}>Start guided workout opens a real workout with a few tips you can skip. Just looking around? Choose Done.</Text>
                        </>
                    )}

                    <View style={styles.actions}>
                        {page < 2 ? (
                            <>
                                {page === 0 && experienced && (
                                    <TouchableOpacity accessibilityRole="button" onPress={onCreateSplit} style={styles.primaryButton}>
                                        <Text style={[styles.buttonText, styles.primaryButtonText]}>Create my split</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next tutorial page" onPress={() => setPage(value => Math.min(2, value + 1))} style={page === 0 && experienced ? styles.secondaryButton : styles.primaryButton}>
                                    <Text style={[styles.buttonText, !(page === 0 && experienced) && styles.primaryButtonText]}>{page === 0 && experienced ? 'Next: logging' : 'Next'}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity accessibilityRole="button" onPress={primaryAction} style={styles.primaryButton} testID="tutorial-primary-action">
                                    <Text style={[styles.buttonText, styles.primaryButtonText]}>{primaryLabel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity accessibilityRole="button" onPress={secondaryAction} style={styles.secondaryButton}>
                                    <Text style={styles.buttonText}>{secondaryLabel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity accessibilityRole="button" onPress={onDone} style={styles.doneButton}>
                                    <Text style={styles.linkText}>Done</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const useStyles = createThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, gap: spacing.sm },
    headerButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingVertical: spacing.sm },
    headerTitle: { flexShrink: 1, color: colors.text.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    linkText: { color: colors.accent.tertiary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
    progress: { color: colors.accent.tertiary, fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
    title: { color: colors.text.primary, fontSize: 30, fontWeight: '700' },
    body: { color: colors.text.secondary, fontSize: 17, lineHeight: 26 },
    card: { padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
    cardTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '600' },
    sequence: { color: colors.text.secondary, fontSize: 16, lineHeight: 25 },
    helper: { color: colors.text.secondary, fontSize: 14, lineHeight: 22 },
    exampleLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
    exampleCell: { flexGrow: 1, flexBasis: 70, minWidth: 70, borderRadius: borderRadius.md, backgroundColor: colors.background.tertiary, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    checkCell: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
    exampleHeading: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
    exampleValue: { color: colors.text.primary, fontSize: 26, fontWeight: '600' },
    actions: { marginTop: 'auto', paddingTop: spacing.md, gap: spacing.sm },
    primaryButton: { backgroundColor: colors.accent.secondary, borderRadius: borderRadius.lg, padding: spacing.md, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
    secondaryButton: { backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg, padding: spacing.md, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: colors.text.primary, fontSize: 17, fontWeight: '600', textAlign: 'center' },
    primaryButtonText: { color: colors.text.onAccent },
    doneButton: { minHeight: 48, padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
}));
