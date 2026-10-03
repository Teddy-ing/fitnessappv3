import { SEED_EXERCISES } from '../exercises';
import { EXERCISE_ILLUSTRATIONS } from '../exerciseIllustrations.generated';
import { getExerciseIllustration } from '../exerciseIllustrations';

it('provides distinct offline artwork and a pose description for every built-in exercise', () => {
    expect(Object.keys(EXERCISE_ILLUSTRATIONS).sort()).toEqual(SEED_EXERCISES.map(exercise => exercise.id).sort());

    for (const exercise of SEED_EXERCISES) {
        const illustration = getExerciseIllustration(exercise);
        // The asset transformer preserves each filename, so swapped mappings also fail.
        expect(illustration?.source).toEqual({ uri: `${exercise.id}.jpg` });
        expect(illustration?.accessibilityLabel.trim().length).toBeGreaterThan(20);
        expect(getExerciseIllustration({ ...exercise, isCustom: true })).toBeUndefined();
    }
});
