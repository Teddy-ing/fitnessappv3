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
    if (selectedRoute?.name !== 'Profile') return false;
    const child = selectedRoute.state?.routes[selectedRoute.state.index ?? 0];
    return !!child && child.name !== 'ProfileHome';
}
