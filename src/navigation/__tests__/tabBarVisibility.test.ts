import { shouldHideTabBar } from '../tabBarVisibility';

describe('tab visibility after a workout', () => {
    const routes = [
        { name: 'Workout' },
        { name: 'Profile', state: { index: 1, routes: [{ name: 'ProfileHome' }, { name: 'ExerciseDetails' }] } },
    ];

    it('shows tabs on Workout after finishing even when Profile retains exercise details', () => {
        expect(shouldHideTabBar({ index: 0, routes }, true)).toBe(true);
        expect(shouldHideTabBar({ index: 0, routes }, false)).toBe(false);
    });

    it('still hides tabs on the selected Profile detail screen', () => {
        expect(shouldHideTabBar({ index: 1, routes }, false)).toBe(true);
    });

    it('shows tabs on Profile home and before its stack is initialized', () => {
        expect(shouldHideTabBar({ index: 0, routes: [{ name: 'Profile' }] }, false)).toBe(false);
        expect(shouldHideTabBar({ index: 0, routes: [{ name: 'Profile', state: { routes: [{ name: 'ProfileHome' }] } }] }, false)).toBe(false);
    });

    it('hides tabs on Workout detail/settings and restores them on Workout home', () => {
        for (const name of ['ExerciseDetails', 'Settings', 'ExerciseMapping']) {
            expect(shouldHideTabBar({ index: 0, routes: [
                { name: 'Workout', state: { index: 1, routes: [{ name: 'WorkoutHome' }, { name }] } },
            ] }, false)).toBe(true);
        }
        expect(shouldHideTabBar({ index: 0, routes: [
            { name: 'Workout', state: { index: 0, routes: [{ name: 'WorkoutHome' }] } },
        ] }, false)).toBe(false);
    });

    it('ignores retained Workout details while Profile home is selected', () => {
        expect(shouldHideTabBar({ index: 1, routes: [
            { name: 'Workout', state: { index: 1, routes: [{ name: 'WorkoutHome' }, { name: 'ExerciseDetails' }] } },
            { name: 'Profile', state: { index: 0, routes: [{ name: 'ProfileHome' }] } },
        ] }, false)).toBe(false);
    });
});
