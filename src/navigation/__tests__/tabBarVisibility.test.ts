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
});
