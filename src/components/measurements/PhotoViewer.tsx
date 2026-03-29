/**
 * PhotoViewer Component
 *
 * Full-screen modal for viewing progress photos.
 * Supports horizontal swiping, page indicator, and delete.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    Modal,
    Alert,
    Dimensions,
} from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { getPhotoUri } from '../../services';
import type { ProgressPhoto } from '../../models';
import { useWeightUnit } from '../../hooks/useWeightUnit';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================
// Component
// ============================================================

interface PhotoViewerProps {
    visible: boolean;
    photos: ProgressPhoto[];
    initialIndex: number;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export default function PhotoViewer({ visible, photos, initialIndex, onClose, onDelete }: PhotoViewerProps) {
    const weightUnit = useWeightUnit();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        if (visible && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            }, 50);
        }
        setCurrentIndex(initialIndex);
    }, [visible, initialIndex]);

    // Clamp index when photos array shrinks (e.g., after delete)
    useEffect(() => {
        if (photos.length > 0 && currentIndex >= photos.length) {
            setCurrentIndex(photos.length - 1);
        }
    }, [photos.length]);

    if (!visible) return null;

    const currentPhoto = photos[currentIndex];

    const handleDelete = () => {
        if (!currentPhoto) return;
        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this progress photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(currentPhoto.id);
                        if (photos.length <= 1) {
                            onClose();
                        }
                    },
                },
            ],
        );
    };

    return (
        <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Text style={styles.headerBtnText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        {currentPhoto && (
                            <>
                                <Text style={styles.headerDate}>
                                    {new Date(currentPhoto.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Text>
                                {currentPhoto.bodyweight && (
                                    <Text style={styles.headerWeight}>
                                        {currentPhoto.bodyweight} {weightUnit}
                                    </Text>
                                )}
                            </>
                        )}
                    </View>
                    <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
                        <Text style={styles.deleteBtn}>🗑️</Text>
                    </TouchableOpacity>
                </View>

                {/* Swipeable photo list */}
                <FlatList
                    ref={flatListRef}
                    data={photos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                        setCurrentIndex(idx);
                    }}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                    renderItem={({ item }) => (
                        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                            <Image
                                source={{ uri: getPhotoUri(item.filePath) }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                            {item.note && (
                                <View style={styles.noteBar}>
                                    <Text style={styles.noteText}>{item.note}</Text>
                                </View>
                            )}
                        </View>
                    )}
                />

                {/* Page indicator */}
                {photos.length > 1 && (
                    <Text style={styles.pageIndicator}>
                        {currentIndex + 1} / {photos.length}
                    </Text>
                )}
            </View>
        </Modal>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnText: {
        color: '#fff',
        fontSize: 22,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerDate: {
        color: '#fff',
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
    headerWeight: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        marginTop: 2,
    },
    deleteBtn: {
        fontSize: 20,
    },
    fullImage: {
        flex: 1,
        width: SCREEN_WIDTH,
    },
    noteBar: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    noteText: {
        color: '#fff',
        fontSize: typography.size.sm,
        textAlign: 'center',
    },
    pageIndicator: {
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        paddingVertical: spacing.md,
        fontSize: typography.size.sm,
    },
});
