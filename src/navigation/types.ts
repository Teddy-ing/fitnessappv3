import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ExerciseMappingParams } from '../screens/ExerciseMappingScreen';

export type ExerciseDetailsParams = {
    exerciseId: string;
    exerciseName: string;
    initialTab?: 'about' | 'history' | 'charts' | 'records';
};

export type SharedStackParamList = {
    ExerciseDetails: ExerciseDetailsParams;
    Settings: undefined;
    ExerciseMapping: ExerciseMappingParams;
};

export type WorkoutStackParamList = SharedStackParamList & {
    WorkoutHome: undefined;
};

export type ProfileStackParamList = SharedStackParamList & {
    ProfileHome: undefined;
    Analytics: { initialTab?: 'workouts' | 'breakdown' | 'exercises' } | undefined;
    Calendar: undefined;
    Measurements: { initialTab?: 'track' | 'trends' | 'gallery'; autoSelectTypeId?: string } | undefined;
    Goals: undefined;
};

export type RootTabParamList = {
    Workout: NavigatorScreenParams<WorkoutStackParamList> | undefined;
    Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
