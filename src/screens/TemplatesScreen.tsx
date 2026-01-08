/**
 * TemplatesScreen
 * 
 * Modal screen for browsing and managing all templates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getTemplates, deleteTemplate, type Template } from '../services';

interface TemplatesScreenProps {
    visible: boolean;
    onClose: () => void;
    onSelectTemplate?: (template: Template) => void;
}

export default function TemplatesScreen({ visible, onClose, onSelectTemplate }: TemplatesScreenProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const templatesData = await getTemplates();
            setTemplates(templatesData);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible, loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleDeleteTemplate = (template: Template) => {
        Alert.alert(
            'Delete Template',
            `Are you sure you want to delete "${template.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTemplate(template.id);
                        loadData();
                    }
                }
            ]
        );
    };

    const handleSelectTemplate = (template: Template) => {
        if (onSelectTemplate) {
            onSelectTemplate(template);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>All Templates</Text>
                    <View style={styles.headerPlaceholder} />
                </View>

                {/* Template list */}
                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.text.primary}
                        />
                    }
                >
                    {isLoading ? (
                        <Text style={styles.loadingText}>Loading...</Text>
                    ) : templates.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No Templates</Text>
                            <Text style={styles.emptySubtitle}>
                                Complete a workout and save it as a template to see it here.
                            </Text>
                        </View>
                    ) : (
                        templates.map(template => (
                            <TouchableOpacity
                                key={template.id}
                                style={styles.templateCard}
                                onPress={() => handleSelectTemplate(template)}
                                onLongPress={() => handleDeleteTemplate(template)}
                            >
                                <View style={styles.templateInfo}>
                                    <Text style={styles.templateName}>{template.name}</Text>
                                    <Text style={styles.templateMeta}>
                                        {template.exerciseCount} exercises • Used {template.useCount} times
                                    </Text>
                                    {template.exercises && template.exercises.length > 0 && (
                                        <Text style={styles.templateExercises} numberOfLines={1}>
                                            {template.exercises.map(e => e.exercise.name).join(', ')}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteTemplate(template)}
                                >
                                    <Text style={styles.deleteButtonText}>✕</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}

                    <Text style={styles.hint}>
                        Long-press a template to delete it
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    headerPlaceholder: {
        width: 50,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loadingText: {
        color: colors.text.secondary,
        textAlign: 'center',
        padding: spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.xs,
    },
    templateMeta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.xs,
    },
    templateExercises: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
    },
    deleteButton: {
        padding: spacing.sm,
    },
    deleteButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    hint: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
});
