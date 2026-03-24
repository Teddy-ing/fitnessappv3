/**
 * CompareView Component
 *
 * Side-by-side split comparison of two progress photos.
 * Shows date labels, bodyweight badges, and ± weight delta.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    Dimensions,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { getPhotoUri } from '../../services';
import type { ProgressPhoto } from '../../models';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================
// Component
// ============================================================

interface CompareViewProps {
    photos: [ProgressPhoto, ProgressPhoto];
    onClose: () => void;
}

export default function CompareView({ photos, onClose }: CompareViewProps) {
    const [left, right] = photos;
    const halfWidth = SCREEN_WIDTH / 2 - 1;

    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕ Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Compare</Text>
                    <View style={{ width: 80 }} />
                </View>

                <View style={styles.splitContainer}>
                    {/* Left photo */}
                    <View style={{ width: halfWidth }}>
                        <Image
                            source={{ uri: getPhotoUri(left.filePath) }}
                            style={styles.splitImage}
                            resizeMode="cover"
                        />
                        <View style={styles.splitLabel}>
                            <Text style={styles.splitDate}>
                                {new Date(left.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: '2-digit',
                                })}
                            </Text>
                            {left.bodyweight && (
                                <Text style={styles.splitWeight}>{left.bodyweight} lbs</Text>
                            )}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Right photo */}
                    <View style={{ width: halfWidth }}>
                        <Image
                            source={{ uri: getPhotoUri(right.filePath) }}
                            style={styles.splitImage}
                            resizeMode="cover"
                        />
                        <View style={styles.splitLabel}>
                            <Text style={styles.splitDate}>
                                {new Date(right.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: '2-digit',
                                })}
                            </Text>
                            {right.bodyweight && (
                                <Text style={styles.splitWeight}>{right.bodyweight} lbs</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Weight change delta */}
                {left.bodyweight && right.bodyweight && (
                    <View style={styles.deltaBar}>
                        {(() => {
                            const diff = right.bodyweight - left.bodyweight;
                            const sign = diff >= 0 ? '+' : '';
                            const changeColor = diff >= 0 ? colors.accent.success : colors.accent.error;
                            return (
                                <Text style={[styles.deltaText, { color: changeColor }]}>
                                    {sign}{diff.toFixed(1)} lbs
                                </Text>
                            );
                        })()}
                    </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
    },
    closeBtn: {
        width: 80,
    },
    closeBtnText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium as '500',
    },
    title: {
        color: '#fff',
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold as '600',
    },
    splitContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    splitImage: {
        flex: 1,
        width: '100%',
    },
    divider: {
        width: 2,
        backgroundColor: colors.accent.primary,
    },
    splitLabel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    splitDate: {
        color: '#fff',
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold as '600',
    },
    splitWeight: {
        color: colors.accent.primary,
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    deltaBar: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    deltaText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold as '700',
    },
});
