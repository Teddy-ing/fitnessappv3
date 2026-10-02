interface TabState {
    index: number;
    routes: readonly {
        name: string;
        state?: { index?: number; routes: readonly { name: string }[] };
    }[];
}

export function shouldHideTabBar(state: TabState, hasActiveWorkout: boolean): boolean {
    if (hasActiveWorkout) return true;
    const selectedRoute = state.routes[state.index];
    if (!selectedRoute) return false;
    const child = selectedRoute.state?.routes[selectedRoute.state.index ?? 0];
    if (!child) return false;
    if (selectedRoute.name === 'Profile') return child.name !== 'ProfileHome';
    if (selectedRoute.name === 'Workout') return child.name !== 'WorkoutHome';
    return false;
}
