/**
 * GalleryTab Component
 *
 * Progress photo gallery with three modes:
 * 1. Grid — responsive photo grid with date/weight badges
 * 2. Viewer — full-screen photo with swipe navigation
 * 3. Compare — side-by-side split for progress comparison
 *
 * Uses expo-image-picker for camera/library access.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, borderRadius, typography } from '../../theme';
import {
    saveProgressPhoto,
    getProgressPhotos,
    deleteProgressPhoto,
} from '../../services';
import type { ProgressPhoto } from '../../models';

import PhotoCell, { GRID_GAP, NUM_COLUMNS } from './PhotoCell';
import PhotoViewer from './PhotoViewer';
import CompareView from './CompareView';

// ============================================================
// Main GalleryTab
// ============================================================

export default function GalleryTab() {
    const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [compareMode, setCompareMode] = useState(false);
    const [compareSelection, setCompareSelection] = useState<string[]>([]);
    const [showCompare, setShowCompare] = useState(false);

    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = useCallback(async () => {
        setLoading(true);
        const data = await getProgressPhotos();
        setPhotos(data);
        setLoading(false);
    }, []);

    // --------------------------------------------------------
    // Add photo
    // --------------------------------------------------------

    const handleAddPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library to add progress photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const saved = await saveProgressPhoto(asset.uri, dateStr);
        if (saved) {
            loadPhotos();
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow camera access to take progress photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const saved = await saveProgressPhoto(asset.uri, dateStr);
        if (saved) {
            loadPhotos();
        }
    };

    const showAddOptions = () => {
        Alert.alert('Add Progress Photo', 'Choose a source', [
            { text: 'Camera', onPress: handleTakePhoto },
            { text: 'Photo Library', onPress: handleAddPhoto },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    // --------------------------------------------------------
    // Delete + Compare
    // --------------------------------------------------------

    const handleDeletePhoto = async (id: string) => {
        await deleteProgressPhoto(id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    const handleGridPress = (index: number) => {
        if (compareMode) {
            const photoId = photos[index].id;
            setCompareSelection((prev) => {
                if (prev.includes(photoId)) {
                    return prev.filter((id) => id !== photoId);
                }
                if (prev.length < 2) {
                    return [...prev, photoId];
                }
                // Replace the second selection
                return [prev[0], photoId];
            });
        } else {
            setViewerIndex(index);
            setViewerVisible(true);
        }
    };

    const handleToggleCompareMode = () => {
        setCompareMode((prev) => !prev);
        setCompareSelection([]);
        setShowCompare(false);
    };

    const comparePhotos = compareSelection.length === 2
        ? [
            photos.find((p) => p.id === compareSelection[0])!,
            photos.find((p) => p.id === compareSelection[1])!,
        ] as [ProgressPhoto, ProgressPhoto]
        : null;

    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={colors.accent.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {/* Toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={showAddOptions} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ Add Photo</Text>
                </TouchableOpacity>
                {photos.length >= 2 && (
                    <TouchableOpacity onPress={handleToggleCompareMode} style={styles.compareBtn}>
                        <Text style={[
                            styles.compareBtnText,
                            compareMode && styles.compareBtnTextActive,
                        ]}>
                            {compareMode ? 'Cancel' : 'Compare'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Compare mode banner */}
            {compareMode && (
                <View style={styles.compareBanner}>
                    <Text style={styles.compareBannerText}>
                        Select 2 photos to compare ({compareSelection.length}/2)
                    </Text>
                    {compareSelection.length === 2 && (
                        <TouchableOpacity
                            style={styles.compareLaunchBtn}
                            onPress={() => setShowCompare(true)}
                        >
                            <Text style={styles.compareLaunchText}>View Comparison</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Empty state */}
            {photos.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>📸</Text>
                    <Text style={styles.emptyTitle}>No Progress Photos</Text>
                    <Text style={styles.emptySubtitle}>
                        Take or import photos to track your visual progress over time.
                    </Text>
                    <TouchableOpacity onPress={showAddOptions} style={styles.emptyBtn}>
                        <Text style={styles.emptyBtnText}>Add Your First Photo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* Photo grid */
                <FlatList
                    data={photos}
                    numColumns={NUM_COLUMNS}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: GRID_GAP / 2 }}
                    renderItem={({ item, index }) => (
                        <PhotoCell
                            photo={item}
                            index={index}
                            onGridPress={handleGridPress}
                            onDeletePress={handleDeletePhoto}
                            isCompareMode={compareMode}
                            isSelected={compareSelection.includes(item.id)}
                        />
                    )}
                />
            )}

            {/* Full-screen viewer */}
            <PhotoViewer
                visible={viewerVisible}
                photos={photos}
                initialIndex={viewerIndex}
                onClose={() => setViewerVisible(false)}
                onDelete={(id) => {
                    handleDeletePhoto(id);
                    if (photos.length <= 1) {
                        setViewerVisible(false);
                    }
                }}
            />

            {/* Compare view */}
            {showCompare && comparePhotos && (
                <CompareView
                    photos={comparePhotos}
                    onClose={() => {
                        setShowCompare(false);
                        setCompareMode(false);
                        setCompareSelection([]);
                    }}
                />
            )}
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    addBtn: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    addBtnText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold as '600',
    },
    compareBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    compareBtnText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium as '500',
    },
    compareBtnTextActive: {
        color: colors.accent.error,
    },
    compareBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.accent.primary + '20',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
    },
    compareBannerText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
    },
    compareLaunchBtn: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    compareLaunchText: {
        color: colors.text.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold as '600',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold as '700',
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    emptyBtn: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    emptyBtnText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
});
