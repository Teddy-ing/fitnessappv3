/**
 * PhotoCell Component
 *
 * Grid thumbnail for a progress photo.
 * Shows date badge, optional bodyweight, and compare-mode selection overlay.
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    Dimensions,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { getPhotoUri } from '../../services';
import type { ProgressPhoto } from '../../models';
import { useWeightUnit } from '../../hooks/useWeightUnit';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 3;
const NUM_COLUMNS = 3;
export const CELL_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
export { GRID_GAP, NUM_COLUMNS };

// ============================================================
// Component
// ============================================================

interface PhotoCellProps {
    photo: ProgressPhoto;
    index: number;
    onGridPress: (index: number) => void;
    onDeletePress: (id: string) => void;
    isCompareMode: boolean;
    isSelected: boolean;
}

const PhotoCell = React.memo(function PhotoCell({
    photo, index, onGridPress, onDeletePress, isCompareMode, isSelected,
}: PhotoCellProps) {
    const weightUnit = useWeightUnit();
    const uri = getPhotoUri(photo.filePath);
    const dateLabel = new Date(photo.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    const handlePress = useCallback(() => onGridPress(index), [onGridPress, index]);
    const handleLongPress = useCallback(() => {
        Alert.alert('Delete Photo', 'Delete this progress photo?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDeletePress(photo.id) },
        ]);
    }, [onDeletePress, photo.id]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.8}
            style={[
                styles.container,
                isCompareMode && isSelected && styles.selected,
            ]}
        >
            <Image source={{ uri }} style={styles.image} />
            <View style={styles.badge}>
                <Text style={styles.badgeDate}>{dateLabel}</Text>
                {photo.bodyweight && (
                    <Text style={styles.badgeWeight}>{photo.bodyweight} {weightUnit}</Text>
                )}
            </View>
            {isCompareMode && (
                <View style={[styles.selectOverlay, isSelected && styles.selectOverlayActive]}>
                    <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
});

export default PhotoCell;

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        margin: GRID_GAP / 2,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    selected: {
        borderWidth: 2,
        borderColor: colors.accent.primary,
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.background.tertiary,
    },
    badge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
    },
    badgeDate: {
        color: '#fff',
        fontSize: 10,
        fontWeight: typography.weight.medium as '500',
    },
    badgeWeight: {
        color: colors.accent.primary,
        fontSize: 9,
        fontWeight: typography.weight.semibold as '600',
    },
    selectOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: spacing.xs,
    },
    selectOverlayActive: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    selectCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectCircleActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: typography.weight.bold as '700',
    },
});
