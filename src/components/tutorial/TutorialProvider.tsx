import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { getOnboardingProfile } from '../../services/onboardingService';
import { getSettings } from '../../services/preferencesService';
import { getTutorialProgress, saveTutorialProgress } from '../../services/tutorialService';
import type { TutorialStatus } from '../../models/tutorial';
import { navigateToTab } from '../../navigation/navigationRef';
import { useWeightUnit } from '../../hooks/useWeightUnit';
import QuickStartGuide from './QuickStartGuide';

type TutorialAction = 'workout' | 'split';
interface TutorialContextValue {
    status: TutorialStatus | null;
    experienced: boolean;
    requestedAction: TutorialAction | null;
    openGuide: () => void;
    skip: () => void;
    complete: () => void;
    consumeAction: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

/** Optional help lives outside onboarding and never gates access to the app. */
export default function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<TutorialStatus | null>(null);
    const [experienced, setExperienced] = useState(false);
    const [hasPlan, setHasPlan] = useState(false);
    const [visible, setVisible] = useState(false);
    const [requestedAction, setRequestedAction] = useState<TutorialAction | null>(null);
    const revision = useRef(0);
    const actionHandled = useRef(false);
    const pendingAction = useRef<TutorialAction | null>(null);
    const currentStatus = useRef<TutorialStatus | null>(null);
    const weightUnit = useWeightUnit();

    useEffect(() => {
        let mounted = true;
        getTutorialProgress().then(progress => {
            if (mounted && revision.current === 0) {
                currentStatus.current = progress.status;
                setStatus(progress.status);
            }
        }).catch(error => {
            // Help failing to load must never prevent a workout or open an unsolicited guide.
            console.warn('[Tutorial] Could not load progress:', error);
        });
        getOnboardingProfile().then(profile => {
            if (mounted) setExperienced(profile?.answers.experienceLevel === 'advanced');
        }).catch(() => {});
        return () => { mounted = false; };
    }, []);

    const updateProgress = useCallback((next: TutorialStatus) => {
        revision.current += 1;
        currentStatus.current = next;
        setStatus(next);
        // Keep this session usable even if the device cannot persist this preference.
        void saveTutorialProgress(next).catch(error => {
            console.warn('[Tutorial] Could not save progress:', error);
            Alert.alert('Tutorial preference not saved', 'You can keep using the app. This choice may reset when you reopen it.');
        });
    }, []);

    const skip = useCallback(() => {
        actionHandled.current = true;
        pendingAction.current = null;
        setRequestedAction(null);
        setVisible(false);
        updateProgress('skipped');
    }, [updateProgress]);

    const complete = useCallback(() => {
        if (currentStatus.current === 'available' || currentStatus.current === 'active') updateProgress('completed');
    }, [updateProgress]);

    const openGuide = useCallback(() => {
        actionHandled.current = false;
        pendingAction.current = null;
        setVisible(true);
        // Refresh this detail because a split may have changed since app launch.
        void getSettings().then(settings => setHasPlan(Boolean(settings.activeSplitId))).catch(() => {});
    }, []);

    const dispatchAction = useCallback(() => {
        const action = pendingAction.current;
        pendingAction.current = null;
        if (action) {
            setRequestedAction(action);
            navigateToTab('Workout');
        }
    }, []);

    const finishGuide = useCallback((action?: TutorialAction) => {
        if (actionHandled.current) return;
        actionHandled.current = true;
        setVisible(false);
        updateProgress(action === 'workout' ? 'active' : 'completed');
        if (action) {
            pendingAction.current = action;
            // iOS cannot present the split builder while this modal is dismissing.
            if (Platform.OS !== 'ios') dispatchAction();
        }
    }, [updateProgress, dispatchAction]);

    const consumeAction = useCallback(() => setRequestedAction(null), []);

    return (
        <TutorialContext.Provider value={{ status, experienced, requestedAction, openGuide, skip, complete, consumeAction }}>
            {children}
            <QuickStartGuide
                visible={visible}
                experienced={experienced}
                hasPlan={hasPlan}
                weightUnit={weightUnit === 'kg' ? 'kg' : 'lbs'}
                onSkip={skip}
                onStartWorkout={() => finishGuide('workout')}
                onCreateSplit={() => finishGuide('split')}
                onDone={() => finishGuide()}
                onDismiss={dispatchAction}
            />
        </TutorialContext.Provider>
    );
}

export function useTutorial(): TutorialContextValue {
    const context = useContext(TutorialContext);
    if (!context) throw new Error('useTutorial requires TutorialProvider');
    return context;
}
