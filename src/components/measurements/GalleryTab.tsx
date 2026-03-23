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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
    FlatList,
    Modal,
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, borderRadius, typography } from '../../theme';
import {
    saveProgressPhoto,
    getProgressPhotos,
    deleteProgressPhoto,
    getPhotoUri,
} from '../../services';
import type { ProgressPhoto } from '../../models';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 3;
const NUM_COLUMNS = 3;
const CELL_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

// ============================================================
// PhotoCell — grid thumbnail
// ============================================================

interface PhotoCellProps {
    photo: ProgressPhoto;
    onPress: () => void;
    onLongPress: () => void;
    isCompareMode: boolean;
    isSelected: boolean;
}

function PhotoCell({ photo, onPress, onLongPress, isCompareMode, isSelected }: PhotoCellProps) {
    const uri = getPhotoUri(photo.filePath);
    const dateLabel = new Date(photo.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
            style={[
                cellStyles.container,
                isCompareMode && isSelected && cellStyles.selected,
            ]}
        >
            <Image source={{ uri }} style={cellStyles.image} />
            <View style={cellStyles.badge}>
                <Text style={cellStyles.badgeDate}>{dateLabel}</Text>
                {photo.bodyweight && (
                    <Text style={cellStyles.badgeWeight}>{photo.bodyweight} lbs</Text>
                )}
            </View>
            {isCompareMode && (
                <View style={[cellStyles.selectOverlay, isSelected && cellStyles.selectOverlayActive]}>
                    <View style={[cellStyles.selectCircle, isSelected && cellStyles.selectCircleActive]}>
                        {isSelected && <Text style={cellStyles.checkmark}>✓</Text>}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
}

const cellStyles = StyleSheet.create({
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

// ============================================================
// PhotoViewer — full-screen modal
// ============================================================

interface PhotoViewerProps {
    visible: boolean;
    photos: ProgressPhoto[];
    initialIndex: number;
    onClose: () => void;
    onDelete: (id: string) => void;
}

function PhotoViewer({ visible, photos, initialIndex, onClose, onDelete }: PhotoViewerProps) {
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
            <View style={viewerStyles.container}>
                {/* Header */}
                <View style={viewerStyles.header}>
                    <TouchableOpacity onPress={onClose} style={viewerStyles.headerBtn}>
                        <Text style={viewerStyles.headerBtnText}>✕</Text>
                    </TouchableOpacity>
                    <View style={viewerStyles.headerCenter}>
                        {currentPhoto && (
                            <>
                                <Text style={viewerStyles.headerDate}>
                                    {new Date(currentPhoto.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Text>
                                {currentPhoto.bodyweight && (
                                    <Text style={viewerStyles.headerWeight}>
                                        {currentPhoto.bodyweight} lbs
                                    </Text>
                                )}
                            </>
                        )}
                    </View>
                    <TouchableOpacity onPress={handleDelete} style={viewerStyles.headerBtn}>
                        <Text style={viewerStyles.deleteBtn}>🗑️</Text>
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
                                style={viewerStyles.fullImage}
                                resizeMode="contain"
                            />
                            {item.note && (
                                <View style={viewerStyles.noteBar}>
                                    <Text style={viewerStyles.noteText}>{item.note}</Text>
                                </View>
                            )}
                        </View>
                    )}
                />

                {/* Page indicator */}
                {photos.length > 1 && (
                    <Text style={viewerStyles.pageIndicator}>
                        {currentIndex + 1} / {photos.length}
                    </Text>
                )}
            </View>
        </Modal>
    );
}

const viewerStyles = StyleSheet.create({
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

// ============================================================
// CompareView — side-by-side split
// ============================================================

interface CompareViewProps {
    photos: [ProgressPhoto, ProgressPhoto];
    onClose: () => void;
}

function CompareView({ photos, onClose }: CompareViewProps) {
    const [left, right] = photos;
    const halfWidth = SCREEN_WIDTH / 2 - 1;

    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen">
            <View style={compareStyles.container}>
                <View style={compareStyles.header}>
                    <TouchableOpacity onPress={onClose} style={compareStyles.closeBtn}>
                        <Text style={compareStyles.closeBtnText}>✕ Close</Text>
                    </TouchableOpacity>
                    <Text style={compareStyles.title}>Compare</Text>
                    <View style={{ width: 80 }} />
                </View>

                <View style={compareStyles.splitContainer}>
                    {/* Left photo */}
                    <View style={{ width: halfWidth }}>
                        <Image
                            source={{ uri: getPhotoUri(left.filePath) }}
                            style={compareStyles.splitImage}
                            resizeMode="cover"
                        />
                        <View style={compareStyles.splitLabel}>
                            <Text style={compareStyles.splitDate}>
                                {new Date(left.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: '2-digit',
                                })}
                            </Text>
                            {left.bodyweight && (
                                <Text style={compareStyles.splitWeight}>{left.bodyweight} lbs</Text>
                            )}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={compareStyles.divider} />

                    {/* Right photo */}
                    <View style={{ width: halfWidth }}>
                        <Image
                            source={{ uri: getPhotoUri(right.filePath) }}
                            style={compareStyles.splitImage}
                            resizeMode="cover"
                        />
                        <View style={compareStyles.splitLabel}>
                            <Text style={compareStyles.splitDate}>
                                {new Date(right.recordedAt + 'T12:00:00').toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: '2-digit',
                                })}
                            </Text>
                            {right.bodyweight && (
                                <Text style={compareStyles.splitWeight}>{right.bodyweight} lbs</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Weight change delta */}
                {left.bodyweight && right.bodyweight && (
                    <View style={compareStyles.deltaBar}>
                        {(() => {
                            const diff = right.bodyweight - left.bodyweight;
                            const sign = diff >= 0 ? '+' : '';
                            const changeColor = diff >= 0 ? colors.accent.success : colors.accent.error;
                            return (
                                <Text style={[compareStyles.deltaText, { color: changeColor }]}>
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

const compareStyles = StyleSheet.create({
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
            <View style={tabStyles.loading}>
                <ActivityIndicator color={colors.accent.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {/* Toolbar */}
            <View style={tabStyles.toolbar}>
                <TouchableOpacity onPress={showAddOptions} style={tabStyles.addBtn}>
                    <Text style={tabStyles.addBtnText}>+ Add Photo</Text>
                </TouchableOpacity>
                {photos.length >= 2 && (
                    <TouchableOpacity onPress={handleToggleCompareMode} style={tabStyles.compareBtn}>
                        <Text style={[
                            tabStyles.compareBtnText,
                            compareMode && tabStyles.compareBtnTextActive,
                        ]}>
                            {compareMode ? 'Cancel' : 'Compare'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Compare mode banner */}
            {compareMode && (
                <View style={tabStyles.compareBanner}>
                    <Text style={tabStyles.compareBannerText}>
                        Select 2 photos to compare ({compareSelection.length}/2)
                    </Text>
                    {compareSelection.length === 2 && (
                        <TouchableOpacity
                            style={tabStyles.compareLaunchBtn}
                            onPress={() => {/* opens compare view */}}
                        >
                            <Text style={tabStyles.compareLaunchText}>View Comparison</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Empty state */}
            {photos.length === 0 ? (
                <View style={tabStyles.empty}>
                    <Text style={tabStyles.emptyIcon}>📸</Text>
                    <Text style={tabStyles.emptyTitle}>No Progress Photos</Text>
                    <Text style={tabStyles.emptySubtitle}>
                        Take or import photos to track your visual progress over time.
                    </Text>
                    <TouchableOpacity onPress={showAddOptions} style={tabStyles.emptyBtn}>
                        <Text style={tabStyles.emptyBtnText}>Add Your First Photo</Text>
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
                            onPress={() => handleGridPress(index)}
                            onLongPress={() => {
                                Alert.alert('Delete Photo', 'Delete this progress photo?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => handleDeletePhoto(item.id) },
                                ]);
                            }}
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
            {comparePhotos && (
                <CompareView
                    photos={comparePhotos}
                    onClose={() => {
                        setCompareMode(false);
                        setCompareSelection([]);
                    }}
                />
            )}
        </View>
    );
}

const tabStyles = StyleSheet.create({
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
