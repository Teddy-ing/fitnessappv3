/**
 * About Tab — Exercise Details
 *
 * Form guide with exercise icon placeholder, metadata pills,
 * numbered instructions, and multi-note exercise notes with Save button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { getExerciseNotes, saveExerciseNote, deleteExerciseNote } from '../../services/exerciseDetailsService';
import { getExerciseById } from '../../services/exerciseService';
import { Exercise } from '../../models/exercise';
import { ExerciseNote } from '../../models/exerciseDetails';
import { MUSCLE_LABELS } from '../../models/muscleGroups';

// ============================================================
// Helpers
// ============================================================

/** Map category to a MaterialIcons name */
function getCategoryIcon(category: string): keyof typeof MaterialIcons.glyphMap {
    switch (category) {
        case 'cardio': return 'directions-run';
        case 'stretch':
        case 'mobility':
        case 'warmup': return 'self-improvement';
        case 'plyometric': return 'sports-gymnastics';
        default: return 'fitness-center';
    }
}

/** Format equipment name for display */
function formatEquipment(eq: string): string {
    return eq
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format ISO date to a readable string */
function formatNoteDate(isoDate: string): string {
    try {
        return new Date(isoDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return isoDate;
    }
}

// ============================================================
// Sub-components
// ============================================================

function MetadataPill({ label }: { label: string }) {
    return (
        <View style={styles.pill}>
            <Text style={styles.pillText}>{label}</Text>
        </View>
    );
}

function NoteCard({
    note,
    onDelete,
}: {
    note: ExerciseNote;
    onDelete: (id: string) => void;
}) {
    return (
        <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
                <Text style={styles.noteDate}>{formatNoteDate(note.createdAt)}</Text>
                <TouchableOpacity
                    onPress={() => onDelete(note.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialIcons name="close" size={16} color={colors.text.disabled} />
                </TouchableOpacity>
            </View>
            <Text style={styles.noteText}>{note.note}</Text>
        </View>
    );
}

// ============================================================
// Main Tab Component
// ============================================================

interface AboutTabProps {
    exerciseId: string;
}

export default function AboutTab({ exerciseId }: AboutTabProps) {
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [notes, setNotes] = useState<ExerciseNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false); // BH-039: error state for missing exercises

    // Load exercise data + notes
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        Promise.all([
            getExerciseById(exerciseId),
            getExerciseNotes(exerciseId),
        ]).then(([ex, existingNotes]) => {
            if (cancelled) return;
            if (!ex) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            setExercise(ex);
            setNotes(existingNotes);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [exerciseId]);

    // Save a new note
    const handleSaveNote = useCallback(async () => {
        const trimmed = newNote.trim();
        if (!trimmed || saving) return;

        setSaving(true);
        await saveExerciseNote(exerciseId, trimmed);
        // Refresh notes list
        const updated = await getExerciseNotes(exerciseId);
        setNotes(updated);
        setNewNote('');
        setSaving(false);
    }, [exerciseId, newNote, saving]);

    // Delete a note with confirmation
    const handleDeleteNote = useCallback((noteId: string) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteExerciseNote(noteId);
                        setNotes((prev) => prev.filter((n) => n.id !== noteId));
                    },
                },
            ],
        );
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // BH-039: Show error state for deleted/missing exercises instead of infinite spinner
    if (notFound || !exercise) {
        return (
            <View style={styles.loadingContainer}>
                <MaterialIcons name="error-outline" size={48} color={colors.text.disabled} />
                <Text style={styles.loadingText}>Exercise not found</Text>
            </View>
        );
    }

    // Metadata
    const primaryMuscle = exercise.muscleGroups.find((mg) => mg.isPrimary);
    const muscleLabel = primaryMuscle
        ? (MUSCLE_LABELS[primaryMuscle.muscle] ?? primaryMuscle.muscle)
        : null;
    const equipmentList = exercise.equipment.filter((e) => e !== 'none');
    const instructions = exercise.instructions ?? [];

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Icon placeholder */}
            <View style={styles.iconContainer}>
                <MaterialIcons
                    name={getCategoryIcon(exercise.category)}
                    size={48}
                    color={colors.accent.primary}
                />
            </View>

            {/* Metadata pills */}
            <View style={styles.pillRow}>
                {muscleLabel && <MetadataPill label={muscleLabel} />}
                {equipmentList.map((eq) => (
                    <MetadataPill key={eq} label={formatEquipment(eq)} />
                ))}
                <MetadataPill label={exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)} />
            </View>

            {/* Instructions */}
            <Text style={styles.sectionTitle}>Instructions</Text>
            {instructions.length > 0 ? (
                <View style={styles.instructionsCard}>
                    {instructions.map((step, i) => (
                        <View key={i} style={styles.instructionRow}>
                            <Text style={styles.instructionNumber}>{i + 1}.</Text>
                            <Text style={styles.instructionText}>{step}</Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.instructionsCard}>
                    <Text style={styles.placeholderText}>Instructions coming soon</Text>
                </View>
            )}

            {/* Notes — input + save button */}
            <Text style={styles.sectionTitle}>Your Notes</Text>
            <View style={styles.noteInputCard}>
                <TextInput
                    style={styles.noteInput}
                    value={newNote}
                    onChangeText={setNewNote}
                    placeholder="Add a cue or reminder… (e.g., Keep elbows tucked)"
                    placeholderTextColor={colors.text.disabled}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                />
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        (!newNote.trim() || saving) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSaveNote}
                    disabled={!newNote.trim() || saving}
                    activeOpacity={0.7}
                >
                    <MaterialIcons
                        name="save"
                        size={16}
                        color={!newNote.trim() || saving ? colors.text.disabled : colors.text.primary}
                    />
                    <Text style={[
                        styles.saveButtonText,
                        (!newNote.trim() || saving) && styles.saveButtonTextDisabled,
                    ]}>
                        {saving ? 'Saving...' : 'Save Note'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Saved notes list */}
            {notes.length > 0 && (
                <View style={styles.notesList}>
                    {notes.map((n) => (
                        <NoteCard key={n.id} note={n} onDelete={handleDeleteNote} />
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Icon
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.background.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: spacing.md,
    },

    // Metadata pills
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 1,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
    },
    pillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },

    // Section titles
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },

    // Instructions
    instructionsCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    instructionRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    instructionNumber: {
        width: 24,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    instructionText: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
        lineHeight: 20,
    },
    placeholderText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: spacing.md,
    },

    // Note input area
    noteInputCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    noteInput: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        minHeight: 72,
        maxHeight: 160,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: spacing.xs,
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
    saveButtonDisabled: {
        backgroundColor: colors.background.tertiary,
    },
    saveButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    saveButtonTextDisabled: {
        color: colors.text.disabled,
    },

    // Saved notes list
    notesList: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    noteCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    noteDate: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
    },
    noteText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        lineHeight: 20,
    },
});
