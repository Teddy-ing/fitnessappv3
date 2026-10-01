import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, colors, spacing } from '../../theme';

interface TutorialInvitationProps {
    experienced: boolean;
    onOpen: () => void;
    onSkip: () => void;
}

export default function TutorialInvitation({ experienced, onOpen, onSkip }: TutorialInvitationProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>Quick start <Text style={styles.duration}>· About 1 minute</Text></Text>
            <Text style={styles.description}>{experienced
                ? 'Bring your routine and get familiar with the controls.'
                : 'Learn the basics, then log your first set with a little help.'}</Text>
            <View style={styles.actions}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open quick start tutorial" onPress={onOpen} style={styles.openButton}>
                    <Text style={styles.openText}>Show me</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skip quick start tutorial" onPress={onSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.xl, backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.accent.secondary, gap: spacing.sm },
    title: { color: colors.text.primary, fontSize: 17, fontWeight: '600' },
    duration: { color: colors.text.secondary, fontSize: 14, fontWeight: '400' },
    description: { color: colors.text.secondary, fontSize: 15, lineHeight: 22 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
    openButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.accent.secondary },
    openText: { color: colors.text.primary, fontSize: 16, fontWeight: '600' },
    skipButton: { minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'center', padding: spacing.sm },
    skipText: { color: colors.text.secondary, fontSize: 16 },
});
