import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import type { Exercise } from '../../models/exercise';
import { getExerciseIllustration, type ExerciseIllustrationAsset } from '../../data/exerciseIllustrations';
import { borderRadius, spacing, createThemedStyles, useThemeColors } from '../../theme';

type IllustratedExercise = Pick<Exercise, 'id' | 'name' | 'category' | 'isCustom' | 'imageUrl'>;

function getCategoryIcon(category: Exercise['category']): keyof typeof MaterialIcons.glyphMap {
    switch (category) {
        case 'cardio': return 'directions-run';
        case 'stretch':
        case 'mobility':
        case 'warmup': return 'self-improvement';
        case 'plyometric': return 'sports-gymnastics';
        default: return 'fitness-center';
    }
}

function IllustrationContent({ exercise, imageUri, bundled }: {
    exercise: IllustratedExercise;
    imageUri?: string;
    bundled?: ExerciseIllustrationAsset;
}) {
    const styles = useStyles();
    const colors = useThemeColors();
    const [customImageFailed, setCustomImageFailed] = useState(false);
    const [bundledImageFailed, setBundledImageFailed] = useState(false);
    const showCustomImage = Boolean(imageUri && !customImageFailed);
    const showBundledImage = Boolean(bundled && !bundledImageFailed);

    if (!showCustomImage && !showBundledImage) {
        return (
            <View
                style={styles.fallback}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`No illustration available for ${exercise.name}`}
            >
                <MaterialIcons name={getCategoryIcon(exercise.category)} size={48} color={colors.accent.primary} />
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Image
                key={showCustomImage ? imageUri : exercise.id}
                source={showCustomImage ? { uri: imageUri! } : bundled!.source}
                style={styles.image}
                resizeMode="contain"
                accessible
                accessibilityLabel={showCustomImage ? `${exercise.name} exercise image` : bundled!.accessibilityLabel}
                onError={() => showCustomImage ? setCustomImageFailed(true) : setBundledImageFailed(true)}
            />
        </View>
    );
}

export default function ExerciseIllustration({ exercise }: { exercise: IllustratedExercise }) {
    const imageUri = exercise.imageUrl?.trim() || undefined;

    return (
        <IllustrationContent
            // A different exercise or image must get a fresh load attempt.
            key={JSON.stringify([exercise.id, exercise.isCustom, imageUri])}
            exercise={exercise}
            imageUri={imageUri}
            bundled={getExerciseIllustration(exercise)}
        />
    );
}

const useStyles = createThemedStyles((colors) => ({
    card: {
        width: '100%',
        maxWidth: 380,
        aspectRatio: 1,
        alignSelf: 'center',
        borderRadius: borderRadius.xl,
        backgroundColor: '#F3F5F7',
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    fallback: {
        width: 96,
        height: 96,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.background.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
}));
