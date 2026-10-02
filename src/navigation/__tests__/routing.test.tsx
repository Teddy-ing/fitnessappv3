import React from 'react';

const mockNavigationRef = { current: null, isReady: jest.fn(() => true), navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({
    NavigationContainer: 'NavigationContainer',
    createNavigationContainerRef: () => mockNavigationRef,
}));
jest.mock('@react-navigation/bottom-tabs', () => ({
    createBottomTabNavigator: () => ({ Navigator: 'TabNavigator', Screen: 'TabScreen' }),
}));
jest.mock('@react-navigation/native-stack', () => ({
    createNativeStackNavigator: () => ({ Navigator: 'StackNavigator', Screen: 'StackScreen' }),
}));
jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', TextInput: 'TextInput',
    StyleSheet: { create: (value: unknown) => value },
    Platform: { OS: 'web' }, UIManager: {}, LayoutAnimation: {},
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../stores', () => ({ useWorkoutStore: (selector: any) => selector({ activeWorkout: null }) }));
jest.mock('../../stores/restTimerStore', () => ({ useRestTimerStore: (selector: any) => selector({}) }));
jest.mock('../../components', () => ({ ErrorBoundary: ({ children }: any) => children }));
jest.mock('../../components/SwipeableTabScreen', () => 'SwipeableTabScreen');
jest.mock('../../components/SetRow', () => 'SetRow');
jest.mock('../../components/ActiveRestLine', () => 'ActiveRestLine');
jest.mock('../../components/ExerciseMenu', () => 'ExerciseMenu');
jest.mock('../../screens/WorkoutScreen', () => 'WorkoutScreen');
jest.mock('../../screens/ProfileScreen', () => 'ProfileScreen');
jest.mock('../../screens/AnalyticsScreen', () => 'AnalyticsScreen');
jest.mock('../../screens/ExerciseDetailsScreen', () => 'ExerciseDetailsScreen');
jest.mock('../../screens/CalendarScreen', () => 'CalendarScreen');
jest.mock('../../screens/MeasurementsScreen', () => 'MeasurementsScreen');
jest.mock('../../screens/GoalsScreen', () => 'GoalsScreen');
jest.mock('../../screens/SettingsScreen', () => 'SettingsScreen');
jest.mock('../../screens/ExerciseMappingScreen', () => 'ExerciseMappingScreen');

import AppNavigator from '../AppNavigator';
import ExerciseCard from '../../components/ExerciseCard';
import { navigateToTab, navigateToWorkoutHome, openWorkoutExerciseDetails } from '../navigationRef';
import { shouldHideTabBar } from '../tabBarVisibility';

// Load the installed routers' TypeScript sources: this project uses ts-jest and
// the package's published entry is ESM JavaScript. Transitions remain real router code.
const path = require('path');
const routersDirectory = path.dirname(require.resolve('@react-navigation/routers/package.json'));
const { StackRouter } = require(path.join(routersDirectory, 'src/StackRouter.tsx'));
const { TabRouter } = require(path.join(routersDirectory, 'src/TabRouter.tsx'));
const CommonActions = require(path.join(routersDirectory, 'src/CommonActions.tsx'));
const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let renderers: any[] = [];
let state: any;
let tabRouter: any;
let tabOptions: any;
let stacks: Record<string, { router: any; options: any }>;

function selectedRoute(tab: string) {
    const stack = state.routes.find((route: any) => route.name === tab).state;
    return stack.routes[stack.index];
}

function updateStack(tab: string, action: any) {
    const config = stacks[tab];
    const tabRoute = state.routes.find((route: any) => route.name === tab);
    const next = config.router.getStateForAction(tabRoute.state, action, config.options);
    expect(next).not.toBeNull();
    state = { ...state, routes: state.routes.map((route: any) => route.name === tab ? { ...route, state: next } : route) };
}

function navigateRoot(name: string, params?: any) {
    state = tabRouter.getStateForAction(state, CommonActions.navigate(name, params), tabOptions);
    if (params?.screen) {
        // React Navigation forwards nested screen params to this child action.
        updateStack(name, CommonActions.navigate({ name: params.screen, params: params.params, pop: params.pop }));
    }
}

async function render(element: React.ReactElement) {
    let renderer: any;
    await act(async () => { renderer = create(element); });
    renderers.push(renderer);
    return renderer;
}

beforeEach(async () => {
    jest.clearAllMocks();
    mockNavigationRef.isReady.mockReturnValue(true);
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });

    // Read route registration and initial routes from the actual AppNavigator,
    // then drive the corresponding real stack/tab routers with production actions.
    const app = await render(<AppNavigator />);
    const tabs = app.root.findAllByType('TabScreen');
    tabOptions = { routeNames: tabs.map((tab: any) => tab.props.name), routeParamList: {}, routeGetIdList: {} };
    tabRouter = TabRouter({ initialRouteName: app.root.findByType('TabNavigator').props.initialRouteName });
    state = tabRouter.getInitialState(tabOptions);
    stacks = {};
    for (const tab of tabs) {
        const stack = await render(React.createElement(tab.props.component));
        const navigator = stack.root.findByType('StackNavigator');
        const screens = stack.root.findAllByType('StackScreen');
        const options = { routeNames: screens.map((screen: any) => screen.props.name), routeParamList: {}, routeGetIdList: {} };
        const router = StackRouter({ initialRouteName: navigator.props.initialRouteName });
        stacks[tab.props.name] = { router, options };
        state.routes.find((route: any) => route.name === tab.props.name).state = router.getInitialState(options);
    }
    mockNavigationRef.navigate.mockImplementation(navigateRoot);
});

afterEach(async () => {
    await act(async () => { renderers.forEach(renderer => renderer.unmount()); });
    renderers = [];
    jest.restoreAllMocks();
});

it('opens workout info, pops to the same workout, and reaches Profile after finishing repeatedly', async () => {
    const card = await render(<ExerciseCard {...({
        workoutExercise: { id: 'workout-exercise', exercise: { id: 'bench', name: 'Bench press', muscleGroups: [] }, sets: [] },
        exerciseId: 'workout-exercise',
    } as any)} />);
    const workoutHomeKey = selectedRoute('Workout').key;
    const profileBefore = state.routes.find((route: any) => route.name === 'Profile').state;
    for (let attempt = 0; attempt < 3; attempt++) {
        await act(async () => { card.root.findByProps({ accessibilityLabel: 'About Bench press' }).props.onPress(); });
        expect(state.routes[state.index].name).toBe('Workout');
        expect(selectedRoute('Workout')).toMatchObject({ name: 'ExerciseDetails', params: { exerciseId: 'bench', initialTab: 'about' } });
        expect(state.routes.find((route: any) => route.name === 'Profile').state).toBe(profileBefore);
        updateStack('Workout', CommonActions.goBack());
        expect(selectedRoute('Workout')).toMatchObject({ name: 'WorkoutHome', key: workoutHomeKey });
        expect(shouldHideTabBar(state, true)).toBe(true);
        // Finishing clears activeWorkout; the same selected home route exposes tabs.
        expect(shouldHideTabBar(state, false)).toBe(false);
        navigateToTab('Profile');
        expect(selectedRoute('Profile').name).toBe('ProfileHome');
        expect(shouldHideTabBar(state, false)).toBe(false);
        navigateToTab('Workout');
    }
});

it('preserves Profile analytics history while workout details are opened and closed', () => {
    navigateRoot('Profile');
    updateStack('Profile', CommonActions.navigate('Analytics', { initialTab: 'exercises' }));
    updateStack('Profile', CommonActions.navigate('ExerciseDetails', { exerciseId: 'squat', exerciseName: 'Squat' }));
    const profileBefore = state.routes.find((route: any) => route.name === 'Profile').state;
    openWorkoutExerciseDetails({ exerciseId: 'bench', exerciseName: 'Bench press' });
    updateStack('Workout', CommonActions.goBack());
    navigateToTab('Profile');
    expect(state.routes.find((route: any) => route.name === 'Profile').state).toBe(profileBefore);
    updateStack('Profile', CommonActions.goBack());
    expect(selectedRoute('Profile')).toMatchObject({ name: 'Analytics', params: { initialTab: 'exercises' } });
    updateStack('Profile', CommonActions.goBack());
    expect(selectedRoute('Profile').name).toBe('ProfileHome');
});

it('returns pinned exercise charts to Profile home', () => {
    navigateRoot('Profile');
    updateStack('Profile', CommonActions.navigate('ExerciseDetails', { exerciseId: 'bench', exerciseName: 'Bench press', initialTab: 'charts' }));
    expect(selectedRoute('Profile').params.initialTab).toBe('charts');
    updateStack('Profile', CommonActions.goBack());
    expect(selectedRoute('Profile').name).toBe('ProfileHome');
});

it.each(['Workout', 'Profile'])('keeps %s Settings and import in their originating stack', (tab) => {
    navigateRoot(tab, { screen: 'Settings', initial: false });
    updateStack(tab, CommonActions.navigate('ExerciseMapping', { source: 'hevy', workouts: [], measurements: [], mappings: [], warnings: [], skipToSummary: true }));
    updateStack(tab, CommonActions.goBack());
    expect(selectedRoute(tab).name).toBe('Settings');
    updateStack(tab, CommonActions.goBack());
    expect(selectedRoute(tab).name).toBe(tab === 'Workout' ? 'WorkoutHome' : 'ProfileHome');
    expect(shouldHideTabBar(state, false)).toBe(false);
});

it('reveals existing Workout home for tutorial/history actions without resetting Profile', () => {
    const homeKey = selectedRoute('Workout').key;
    navigateRoot('Workout', { screen: 'Settings', initial: false });
    navigateRoot('Profile', { screen: 'Calendar', initial: false });
    const calendarKey = selectedRoute('Profile').key;
    navigateToWorkoutHome();
    expect(state.routes[state.index].name).toBe('Workout');
    expect(selectedRoute('Workout')).toMatchObject({ name: 'WorkoutHome', key: homeKey });
    expect(state.routes.find((route: any) => route.name === 'Workout').state.routes).toHaveLength(1);
    navigateToTab('Profile');
    expect(selectedRoute('Profile')).toMatchObject({ name: 'Calendar', key: calendarKey });
});

it('waits for the navigation container before opening an exercise or starting a workout route', () => {
    mockNavigationRef.isReady.mockReturnValue(false);
    openWorkoutExerciseDetails({ exerciseId: 'bench', exerciseName: 'Bench press' });
    navigateToWorkoutHome();
    expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
});
