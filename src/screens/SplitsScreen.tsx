/**
 * SplitsScreen
 *
 * Modal screen for browsing, selecting, creating, and deleting splits.
 * Orchestrates SplitListView, SplitFormView, and CreateTemplateWizard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { CreateTemplateWizard, SplitListView, SplitFormView } from '../components';
import {
    getSplits,
    getActiveSplit,
    setActiveSplit,
    getTemplates,
    getSplitsForTemplate,
    toggleSplitFavorite,
    type Template,
    type SplitInfo
} from '../services';
import { Split } from '../models/split';

interface SplitsScreenProps {
    visible: boolean;
    onClose: () => void;
    onSplitSelected?: (split: Split | null) => void;
}

export default function SplitsScreen({ visible, onClose, onSplitSelected }: SplitsScreenProps) {
    const [splits, setSplits] = useState<Split[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [activeSplitState, setActiveSplitState] = useState<Split | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingSplit, setEditingSplit] = useState<Split | null>(null);

    // Template creation wizard
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);

    // Expanded templates (to show exercise details)
    const [expandedTemplateIds, setExpandedTemplateIds] = useState<Set<string>>(new Set());

    // Template to splits mapping for display
    const [templateSplitsMap, setTemplateSplitsMap] = useState<Map<string, SplitInfo[]>>(new Map());

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [splitsData, templatesData, active] = await Promise.all([
                getSplits(),
                getTemplates(),
                getActiveSplit(),
            ]);
            setSplits(splitsData);
            setTemplates(templatesData);
            setActiveSplitState(active);

            // Fetch split membership for all templates
            const splitsMap = new Map<string, SplitInfo[]>();
            await Promise.all(templatesData.map(async (template) => {
                const templateSplits = await getSplitsForTemplate(template.id);
                splitsMap.set(template.id, templateSplits);
            }));
            setTemplateSplitsMap(splitsMap);
        } catch (error) {
            console.error('Error loading splits:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible, loadData]);

    const handleSelectSplit = async (split: Split | null) => {
        try {
            await setActiveSplit(split?.id || null);
            setActiveSplitState(split);
            onSplitSelected?.(split);
            onClose();
        } catch (error) {
            console.error('Error selecting split:', error);
        }
    };

    const handleEditSplit = (split: Split) => {
        setEditingSplit(split);
        setIsCreating(true);
    };

    const handleToggleSplitFavorite = async (splitId: string) => {
        // Optimistically update local state
        setSplits(prev => prev.map(s =>
            s.id === splitId ? { ...s, isFavorite: !s.isFavorite } : s
        ));
        await toggleSplitFavorite(splitId);
    };

    const toggleTemplateExpand = (templateId: string) => {
        setExpandedTemplateIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(templateId)) {
                newSet.delete(templateId);
            } else {
                newSet.add(templateId);
            }
            return newSet;
        });
    };

    const handleFormCancel = () => {
        setIsCreating(false);
        setEditingSplit(null);
    };

    const handleFormSaved = async (options?: { deletedActiveSplit?: boolean }) => {
        if (options?.deletedActiveSplit) {
            setActiveSplitState(null);
            onSplitSelected?.(null);
        }
        setIsCreating(false);
        setEditingSplit(null);
        await loadData();

        // If the active split was edited (schedule may have changed),
        // notify the home screen to re-read split + clamp the index
        if (!options?.deletedActiveSplit && activeSplitState) {
            const refreshedSplit = await getActiveSplit();
            if (refreshedSplit) {
                setActiveSplitState(refreshedSplit);
                onSplitSelected?.(refreshedSplit);
            }
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {isCreating ? (editingSplit ? 'Edit Split' : 'Create Split') : 'Browse Splits'}
                    </Text>
                    {!isCreating ? (
                        <TouchableOpacity onPress={() => setIsCreating(true)}>
                            <Text style={styles.createButton}>+ New</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerPlaceholder} />
                    )}
                </View>

                {isCreating ? (
                    <SplitFormView
                        editingSplit={editingSplit}
                        templates={templates}
                        templateSplitsMap={templateSplitsMap}
                        expandedTemplateIds={expandedTemplateIds}
                        activeSplit={activeSplitState}
                        onToggleExpand={toggleTemplateExpand}
                        onOpenCreateTemplate={() => setShowCreateTemplateModal(true)}
                        onCancel={handleFormCancel}
                        onSaved={handleFormSaved}
                        onTemplatesChanged={loadData}
                    />
                ) : (
                    <SplitListView
                        splits={splits}
                        activeSplit={activeSplitState}
                        isLoading={isLoading}
                        onSelectSplit={handleSelectSplit}
                        onEditSplit={handleEditSplit}
                        onToggleFavorite={handleToggleSplitFavorite}
                        onRefresh={loadData}
                    />
                )}
            </SafeAreaView>

            {/* Create Template Wizard */}
            <CreateTemplateWizard
                visible={showCreateTemplateModal}
                onClose={() => setShowCreateTemplateModal(false)}
                onTemplateCreated={(templateId, updatedTemplates) => {
                    setTemplates(updatedTemplates);
                }}
            />
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
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    createButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    headerPlaceholder: {
        width: 50,
    },
});
