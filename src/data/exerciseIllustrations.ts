import type { ImageSourcePropType } from 'react-native';
import type { Exercise } from '../models/exercise';
import { EXERCISE_ILLUSTRATIONS } from './exerciseIllustrations.generated';

export interface ExerciseIllustrationAsset {
    source: ImageSourcePropType;
    accessibilityLabel: string;
}

// Exercise IDs are stable across name changes; custom exercises never inherit art.
export function getExerciseIllustration(
    exercise: Pick<Exercise, 'id' | 'isCustom'>,
): ExerciseIllustrationAsset | undefined {
    if (exercise.isCustom || !Object.prototype.hasOwnProperty.call(EXERCISE_ILLUSTRATIONS, exercise.id)) {
        return undefined;
    }
    return EXERCISE_ILLUSTRATIONS[exercise.id];
}
