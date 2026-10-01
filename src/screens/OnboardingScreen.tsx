import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { createOnboardingProfile, OnboardingAnswers, OnboardingEquipment, OnboardingProfile } from '../models/onboarding';
import { getOnboardingProfile, saveOnboardingProfile } from '../services/onboardingService';
import { getOnboardingRecommendation } from '../services/onboardingPlanService';

interface OnboardingScreenProps {
    onDone: () => void;
    initialProfile?: OnboardingProfile | null;
    /** Editing keeps the saved profile intact until the final Save action. */
    mode?: 'setup' | 'edit';
}

type Option<T extends string | number> = { value: T; label: string; detail?: string };
const EXPERIENCE: Option<NonNullable<OnboardingAnswers['experienceLevel']>>[] = [
    { value: 'beginner', label: 'Getting started', detail: 'Learning movements and building a routine.' },
    { value: 'intermediate', label: 'Some experience', detail: 'Comfortable with the basics and training regularly.' },
    { value: 'advanced', label: 'Experienced lifter', detail: 'Training consistently and managing my own programming.' },
];
const PHASES: Option<NonNullable<OnboardingAnswers['trainingPhase']>>[] = [
    { value: 'bulk', label: 'Bulk', detail: 'Building muscle while gaining weight.' },
    { value: 'cut', label: 'Cut', detail: 'Losing body fat while maintaining muscle.' },
    { value: 'maintain', label: 'Maintain', detail: 'Keeping my weight steady while training.' },
    { value: 'recovery', label: 'Recovery', detail: 'Taking things easier or returning to training.' },
    { value: 'unsure', label: 'Not sure yet', detail: 'I am still figuring out my approach.' },
];
const GOALS: Option<NonNullable<OnboardingAnswers['primaryGoal']>>[] = [
    { value: 'strength', label: 'Get stronger', detail: 'Improve performance on my lifts.' },
    { value: 'muscle', label: 'Build muscle', detail: 'Focus on muscle growth.' },
    { value: 'fitness', label: 'General fitness', detail: 'Move regularly and feel good.' },
    { value: 'endurance', label: 'Build endurance', detail: 'Improve my stamina and conditioning.' },
];
const LOCATIONS: Option<NonNullable<OnboardingAnswers['trainingLocation']>>[] = [
    { value: 'gym', label: 'Gym' },
    { value: 'home', label: 'Home' },
    { value: 'both', label: 'Both' },
];
const EQUIPMENT: Option<OnboardingEquipment>[] = [
    { value: 'dumbbell', label: 'Dumbbells' },
    { value: 'barbell', label: 'Barbell & plates' },
    { value: 'bench', label: 'Adjustable bench' },
    { value: 'squat_rack', label: 'Rack with safeties' },
    { value: 'pull_up_bar', label: 'Pull-up bar' },
    { value: 'resistance_band', label: 'Resistance bands' },
    { value: 'kettlebell', label: 'Kettlebells' },
    { value: 'cable', label: 'Adjustable cable station' },
    { value: 'machine', label: 'Full set of weight machines' },
    { value: 'treadmill', label: 'Treadmill' },
    { value: 'stationary_bike', label: 'Stationary bike' },
    { value: 'rowing_machine', label: 'Rowing machine' },
];
const STEPS = [
    { title: 'Your training, your preferences.', subtitle: 'A quick, optional setup to tell us how you like to train.' },
    { title: 'Which units feel familiar?', subtitle: 'Choose each independently. Mixed units are welcome.' },
    { title: 'Where are you in your training?', subtitle: 'Pick the description that feels closest to you.' },
    { title: 'What phase are you in?', subtitle: 'Your current approach can change over time.' },
    { title: 'What matters most right now?', subtitle: 'Choose one main goal, or leave this open.' },
    { title: 'What does your routine look like?', subtitle: 'An estimate is enough. No schedule to commit to.' },
    { title: 'A little more about you.', subtitle: 'Review your choices. You can edit any answer or leave it blank.' },
];

function ChoiceGroup<T extends string | number>({
    label, options, value, onSelect, disabled, compact = false,
}: {
    label: string;
    options: Option<T>[];
    value: T | null;
    onSelect: (value: T | null) => void;
    disabled: boolean;
    compact?: boolean;
}) {
    return (
        <View style={styles.group}>
            <Text style={styles.groupLabel}>{label}</Text>
            <View style={compact ? styles.optionRow : styles.optionColumn}>
                {options.map(option => {
                    const selected = value === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            accessibilityRole="button"
                            accessibilityLabel={`${label}: ${option.label}`}
                            accessibilityHint={selected ? 'Tap again to clear this answer.' : option.detail}
                            accessibilityState={{ selected, disabled }}
                            disabled={disabled}
                            onPress={() => onSelect(selected ? null : option.value)}
                            style={[styles.option, compact && styles.compactOption, selected && styles.selectedOption]}
                        >
                            <View style={styles.optionText}>
                                <Text style={[styles.optionLabel, selected && styles.selectedLabel]}>{option.label}</Text>
                                {option.detail && <Text style={styles.optionDetail}>{option.detail}</Text>}
                            </View>
                            {!compact && (
                                <MaterialIcons
                                    name={selected ? 'check-circle' : 'radio-button-unchecked'}
                                    size={24}
                                    color={selected ? colors.accent.tertiary : colors.text.secondary}
                                    importantForAccessibility="no"
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function optionLabel<T extends string | number>(options: Option<T>[], value: T | null) {
    return options.find(option => option.value === value)?.label ?? 'Not answered';
}

function EquipmentChoices({ value, onSelect, disabled, bothLocations }: {
    value: OnboardingEquipment[] | null;
    onSelect: (value: OnboardingEquipment[] | null) => void;
    disabled: boolean;
    bothLocations: boolean;
}) {
    const bodyweightOnly = value !== null && value.length === 0;
    return (
        <View style={styles.group}>
            <Text style={styles.groupLabel}>Home equipment</Text>
            <Text style={styles.body}>{bothLocations
                ? 'Choose what you have at home. Your starting plan will also work there on days you cannot get to the gym.'
                : 'Choose everything you can use at home, or select bodyweight only.'}</Text>
            <Text style={styles.helper}>Select weight machines only if you have a full set for upper and lower body.</Text>
            <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityLabel="Home equipment: Bodyweight only"
                accessibilityState={{ checked: bodyweightOnly, disabled }}
                disabled={disabled}
                onPress={() => onSelect(bodyweightOnly ? null : [])}
                style={[styles.option, bodyweightOnly && styles.selectedOption]}
            >
                <MaterialIcons name={bodyweightOnly ? 'check-box' : 'check-box-outline-blank'} size={22} color={bodyweightOnly ? colors.accent.tertiary : colors.text.secondary} importantForAccessibility="no" />
                <Text style={[styles.optionLabel, bodyweightOnly && styles.selectedLabel]}>Bodyweight only</Text>
            </TouchableOpacity>
            <View style={styles.optionRow}>
                {EQUIPMENT.map(option => {
                    const checked = value?.includes(option.value) ?? false;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Home equipment: ${option.label}`}
                            accessibilityState={{ checked, disabled }}
                            disabled={disabled}
                            onPress={() => {
                                const next = checked ? value!.filter(item => item !== option.value) : [...(value ?? []), option.value];
                                onSelect(next.length === 0 ? null : next);
                            }}
                            style={[styles.option, styles.equipmentOption, checked && styles.selectedOption]}
                        >
                            <MaterialIcons name={checked ? 'check-box' : 'check-box-outline-blank'} size={22} color={checked ? colors.accent.tertiary : colors.text.secondary} importantForAccessibility="no" />
                            <Text style={[styles.equipmentLabel, checked && styles.selectedLabel]}>{option.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

type PendingSave = { profile: OnboardingProfile; done: boolean };

export default function OnboardingScreen({ onDone, initialProfile, mode = 'setup' }: OnboardingScreenProps) {
    const isEditing = mode === 'edit';
    const prepareProfile = (saved: OnboardingProfile | null): OnboardingProfile => {
        const result = saved ?? createOnboardingProfile();
        return isEditing && saved?.status === 'completed' ? { ...result, step: 6 } : result;
    };
    const [profile, setProfile] = useState(() => prepareProfile(initialProfile ?? null));
    const [loading, setLoading] = useState(initialProfile === undefined);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
    const [returnToReview, setReturnToReview] = useState(false);
    const busyRef = useRef(false);
    const mountedRef = useRef(true);
    const scrollRef = useRef<ScrollView>(null);
    const step = profile.step;
    const answers = profile.answers;
    const hasHomeWorkouts = answers.trainingLocation === 'home' || answers.trainingLocation === 'both';
    const recommendation = useMemo(() => getOnboardingRecommendation(answers), [answers]);
    const useRecommendedPlan = recommendation !== null && answers.experienceLevel !== 'advanced'
        && (profile.useRecommendedPlan ?? answers.experienceLevel === 'beginner');
    const missingPlanAnswers = [
        answers.experienceLevel === null ? 'training experience' : null,
        answers.primaryGoal === null ? 'main goal' : null,
        answers.trainingDaysPerWeek === null ? 'training days' : null,
        answers.trainingLocation === null ? 'training location' : null,
        hasHomeWorkouts && answers.availableEquipment === null ? 'home equipment' : null,
    ].filter((value): value is string => value !== null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const loadProfile = useCallback(async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const saved = await getOnboardingProfile();
            if (!mountedRef.current) return;
            const result = saved ?? createOnboardingProfile();
            setProfile(isEditing && saved?.status === 'completed' ? { ...result, step: 6 } : result);
            setLoadFailed(false);
        } catch {
            if (mountedRef.current) {
                setLoadFailed(true);
                setError('Your saved setup could not be loaded. Try again, or continue to the app.');
            }
        } finally {
            busyRef.current = false;
            if (mountedRef.current) setLoading(false);
        }
    }, [isEditing]);

    useEffect(() => {
        if (initialProfile === undefined) void loadProfile();
    }, [initialProfile, loadProfile]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [step]);

    const save = useCallback(async (request: PendingSave) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        setError(null);
        try {
            await saveOnboardingProfile(request.profile);
            if (!mountedRef.current) return;
            setPendingSave(null);
            setProfile(request.profile);
            if (request.done) onDone();
        } catch {
            if (mountedRef.current) {
                setPendingSave(request);
                setError('Your choices could not be saved. They are still here. Try again, or continue without saving.');
            }
        } finally {
            busyRef.current = false;
            if (mountedRef.current) setBusy(false);
        }
    }, [onDone]);

    const navigate = useCallback((nextStep: number) => {
        if (busyRef.current || loading || loadFailed) return;
        setError(null);
        setPendingSave(null);
        const next = { ...profile, step: nextStep };
        if (isEditing) setProfile(next);
        else void save({ profile: { ...next, status: 'in_progress', completedAt: null }, done: false });
    }, [profile, isEditing, loading, loadFailed, save]);

    const leave = useCallback(() => {
        if (busyRef.current) return;
        if (isEditing || loadFailed) onDone();
        else void save({ profile: { ...profile, status: 'skipped', completedAt: null }, done: true });
    }, [isEditing, loadFailed, onDone, profile, save]);

    const goBack = useCallback(() => {
        if (busyRef.current || loading) return;
        if (returnToReview) {
            setReturnToReview(false);
            navigate(6);
        } else if (step > 0) navigate(step - 1);
        else leave();
    }, [returnToReview, navigate, step, leave, loading]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            goBack();
            return true;
        });
        return () => subscription.remove();
    }, [goBack]);

    const select = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
        if (busyRef.current) return;
        setError(null);
        setPendingSave(null);
        setProfile(previous => ({
            ...previous,
            useRecommendedPlan: key === 'experienceLevel' && previous.answers.experienceLevel !== value ? null : previous.useRecommendedPlan,
            answers: {
                ...previous.answers,
                [key]: value,
                ...(key === 'trainingLocation' && value !== 'home' && value !== 'both' ? { availableEquipment: null } : {}),
            },
        }));
    };

    const continueSetup = () => {
        if (busyRef.current) return;
        if (step === 6) {
            void save({ profile: { ...profile, useRecommendedPlan, status: 'completed', completedAt: new Date().toISOString() }, done: true });
        } else {
            const next = returnToReview ? 6 : step + 1;
            setReturnToReview(false);
            navigate(next);
        }
    };

    const editStep = (nextStep: number) => {
        if (busyRef.current) return;
        setReturnToReview(true);
        navigate(nextStep);
    };

    const reviewRows = [
        { label: 'Units', value: `Weight: ${answers.weightUnit ?? 'Not answered'} · Distance: ${answers.distanceUnit ?? 'Not answered'} · Measurements: ${answers.measurementUnit ?? 'Not answered'}`, step: 1 },
        { label: 'Experience', value: optionLabel(EXPERIENCE, answers.experienceLevel), step: 2 },
        { label: 'Training phase', value: optionLabel(PHASES, answers.trainingPhase), step: 3 },
        { label: 'Main goal', value: optionLabel(GOALS, answers.primaryGoal), step: 4 },
        { label: 'Routine', value: `${answers.trainingDaysPerWeek === null ? 'Days not answered' : `${answers.trainingDaysPerWeek} ${answers.trainingDaysPerWeek === 1 ? 'day' : 'days'} per week`} · ${optionLabel(LOCATIONS, answers.trainingLocation)}`, step: 5 },
        ...(hasHomeWorkouts ? [{ label: 'Home equipment', value: answers.availableEquipment === null ? 'Not answered' : answers.availableEquipment.length === 0 ? 'Bodyweight only' : EQUIPMENT.filter(option => answers.availableEquipment?.includes(option.value)).map(option => option.label).join(', '), step: 5 }] : []),
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <View style={styles.brand}>
                    <MaterialIcons name="fitness-center" size={21} color={colors.accent.tertiary} importantForAccessibility="no" />
                    <Text style={styles.eyebrow}>YOUR SETUP</Text>
                </View>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={isEditing ? 'Cancel' : 'Skip setup'}
                    accessibilityState={{ disabled: busy || loading }}
                    disabled={busy || loading}
                    onPress={leave}
                    style={styles.textButton}
                >
                    <Text style={styles.mutedButtonText}>{isEditing ? 'Cancel' : 'Skip setup'}</Text>
                </TouchableOpacity>
            </View>
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={colors.accent.primary} size="large" />
                    <Text style={styles.subtitle}>Loading your setup…</Text>
                </View>
            ) : (
                <>
                    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
                        {!loadFailed && step > 0 && (
                            <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel="Setup progress" accessibilityValue={{ min: 1, max: 6, now: step, text: `Step ${step} of 6` }}>
                                <Text style={styles.progressText}>STEP {step} OF 6 {step < 6 ? '· OPTIONAL' : '· REVIEW'}</Text>
                                <View style={styles.progressTrack}>
                                    {[1, 2, 3, 4, 5, 6].map(number => <View key={number} style={[styles.progressSegment, number <= step && styles.progressActive]} />)}
                                </View>
                            </View>
                        )}
                        {error && (
                            <View style={styles.errorBox} accessibilityLiveRegion="assertive">
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Try again" disabled={busy} onPress={() => loadFailed ? void loadProfile() : pendingSave && void save(pendingSave)} style={styles.textButton}>
                                    <Text style={styles.linkText}>Try again</Text>
                                </TouchableOpacity>
                                <TouchableOpacity accessibilityRole="button" accessibilityLabel={isEditing ? 'Cancel changes' : 'Continue without saving'} disabled={busy} onPress={() => { if (!busyRef.current) onDone(); }} style={styles.textButton}>
                                    <Text style={styles.mutedButtonText}>{isEditing ? 'Cancel changes' : 'Continue without saving'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {!loadFailed && (
                            <>
                                <View style={styles.heading}>
                                    {step === 0 && <View style={styles.heroIcon}><MaterialIcons name="tune" size={42} color={colors.accent.tertiary} importantForAccessibility="no" /></View>}
                                    <Text accessibilityRole="header" style={styles.title}>{STEPS[step].title}</Text>
                                    <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>
                                </View>
                                {step === 0 && (
                                    <View style={styles.welcomeCard}>
                                        <View style={styles.fact}>
                                            <MaterialIcons name="lock-outline" size={24} color={colors.accent.tertiary} importantForAccessibility="no" />
                                            <View style={styles.factText}><Text style={styles.factTitle}>Private by default</Text><Text style={styles.body}>Saved on this device. No account needed. Google Drive backup is optional in Settings.</Text></View>
                                        </View>
                                        <View style={styles.fact}>
                                            <MaterialIcons name="bookmark-border" size={24} color={colors.accent.tertiary} importantForAccessibility="no" />
                                            <View style={styles.factText}><Text style={styles.factTitle}>A start that fits you</Text><Text style={styles.body}>Apply your chosen units and training phase. Your experience, goals, schedule, and equipment help us suggest a starting split.</Text></View>
                                        </View>
                                        <View style={styles.fact}>
                                            <MaterialIcons name="skip-next" size={24} color={colors.accent.tertiary} importantForAccessibility="no" />
                                            <View style={styles.factText}><Text style={styles.factTitle}>Always your choice</Text><Text style={styles.body}>Every question is optional. Review your starting plan before finishing. Skipping setup will not apply your choices.</Text></View>
                                        </View>
                                    </View>
                                )}
                                {step === 1 && (
                                    <>
                                        <ChoiceGroup label="Weight" options={[{ value: 'lbs', label: 'Pounds (lbs)' }, { value: 'kg', label: 'Kilograms (kg)' }]} value={answers.weightUnit} onSelect={value => select('weightUnit', value as OnboardingAnswers['weightUnit'])} disabled={busy} compact />
                                        <ChoiceGroup label="Distance" options={[{ value: 'mi', label: 'Miles (mi)' }, { value: 'km', label: 'Kilometers (km)' }]} value={answers.distanceUnit} onSelect={value => select('distanceUnit', value as OnboardingAnswers['distanceUnit'])} disabled={busy} compact />
                                        <ChoiceGroup label="Body measurements" options={[{ value: 'in', label: 'Inches (in)' }, { value: 'cm', label: 'Centimeters (cm)' }]} value={answers.measurementUnit} onSelect={value => select('measurementUnit', value as OnboardingAnswers['measurementUnit'])} disabled={busy} compact />
                                    </>
                                )}
                                {step === 2 && <ChoiceGroup label="Training experience" options={EXPERIENCE} value={answers.experienceLevel} onSelect={value => select('experienceLevel', value)} disabled={busy} />}
                                {step === 3 && <ChoiceGroup label="Current phase" options={PHASES} value={answers.trainingPhase} onSelect={value => select('trainingPhase', value)} disabled={busy} />}
                                {step === 4 && <ChoiceGroup label="Primary goal" options={GOALS} value={answers.primaryGoal} onSelect={value => select('primaryGoal', value)} disabled={busy} />}
                                {step === 5 && (
                                    <>
                                        <ChoiceGroup label="Training days per week" options={[1, 2, 3, 4, 5, 6, 7].map(value => ({ value, label: String(value) }))} value={answers.trainingDaysPerWeek} onSelect={value => select('trainingDaysPerWeek', value)} disabled={busy} compact />
                                        <ChoiceGroup label="Where you train" options={LOCATIONS} value={answers.trainingLocation} onSelect={value => select('trainingLocation', value)} disabled={busy} />
                                        {hasHomeWorkouts && <EquipmentChoices value={answers.availableEquipment} onSelect={value => select('availableEquipment', value)} disabled={busy} bothLocations={answers.trainingLocation === 'both'} />}
                                    </>
                                )}
                                {step > 0 && step < 6 && <Text style={styles.helper}>Leave any answer blank and continue. Tap a selected choice again to clear it.</Text>}
                                {step === 6 && (
                                    <>
                                        <View style={styles.reviewCard}>
                                            {reviewRows.map(row => (
                                                <TouchableOpacity key={row.label} accessibilityRole="button" accessibilityLabel={`Edit ${row.label}: ${row.value}`} disabled={busy} onPress={() => editStep(row.step)} style={styles.reviewRow}>
                                                    <View style={styles.reviewText}><Text style={styles.groupLabel}>{row.label}</Text><Text style={styles.body}>{row.value}</Text></View>
                                                    <Text style={styles.linkText}>Edit</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={styles.planCard}>
                                            <Text style={styles.factTitle}>Your starting plan</Text>
                                            {answers.experienceLevel === 'advanced' ? (
                                                <Text style={styles.body}>You know your training best. Start with your own routine; no premade split will be added. You can create a split from the workout screen.</Text>
                                            ) : recommendation ? (
                                                <>
                                                    <Text style={styles.planTitle}>{recommendation.plan.name}</Text>
                                                    <Text style={styles.body}>{recommendation.reason}</Text>
                                                    <View style={styles.group}>
                                                        <Text style={styles.groupLabel}>Weekly sequence</Text>
                                                        {recommendation.plan.schedule.map((workoutIndex, index) => (
                                                            <View key={index} style={styles.scheduleRow}>
                                                                <Text style={styles.dayLabel}>Day {index + 1}</Text>
                                                                <Text style={[styles.scheduleWorkout, workoutIndex === null && styles.restDay]}>{workoutIndex === null ? 'Rest' : recommendation.plan.workouts[workoutIndex].name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    <TouchableOpacity
                                                        accessibilityRole="checkbox"
                                                        accessibilityLabel="Use this starting plan"
                                                        accessibilityState={{ checked: useRecommendedPlan, disabled: busy }}
                                                        disabled={busy}
                                                        onPress={() => {
                                                            if (busyRef.current) return;
                                                            setError(null);
                                                            setPendingSave(null);
                                                            setProfile(previous => ({ ...previous, useRecommendedPlan: !useRecommendedPlan }));
                                                        }}
                                                        style={[styles.option, useRecommendedPlan && styles.selectedOption]}
                                                    >
                                                        <MaterialIcons name={useRecommendedPlan ? 'check-box' : 'check-box-outline-blank'} size={24} color={useRecommendedPlan ? colors.accent.tertiary : colors.text.secondary} importantForAccessibility="no" />
                                                        <View style={styles.optionText}>
                                                            <Text style={styles.optionLabel}>Use this starting plan</Text>
                                                            <Text style={styles.optionDetail}>{useRecommendedPlan ? 'Add this split and its workouts when I finish setup.' : 'I will choose or create my own split.'}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <Text style={styles.body}>{missingPlanAnswers.length > 0
                                                    ? `To suggest a split, add your ${missingPlanAnswers.join(', ')}. You can also finish setup without a plan.`
                                                    : 'No starting plan matches these answers yet. You can finish setup and choose or create a split yourself.'}</Text>
                                            )}
                                        </View>
                                        <View style={styles.notice}>
                                            <MaterialIcons name="info-outline" size={22} color={colors.accent.tertiary} importantForAccessibility="no" />
                                            <Text style={styles.noticeText}>Finishing applies the units and training phase you chose. Unanswered choices and “Not sure yet” leave your current settings unchanged. Skipping setup applies nothing.</Text>
                                        </View>
                                    </>
                                )}
                            </>
                        )}
                    </ScrollView>
                    {!loadFailed && (
                        <View style={styles.footer}>
                            {step > 0 && <TouchableOpacity accessibilityRole="button" accessibilityLabel={returnToReview ? 'Review' : 'Back'} accessibilityState={{ disabled: busy }} disabled={busy} onPress={goBack} style={styles.backButton}><Text style={styles.backText}>{returnToReview ? 'Review' : 'Back'}</Text></TouchableOpacity>}
                            <TouchableOpacity accessibilityRole="button" accessibilityLabel={step === 6 ? 'Save preferences' : returnToReview ? 'Back to review' : step === 0 ? 'Get started' : 'Continue'} accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={continueSetup} style={[styles.primaryButton, busy && styles.disabledButton]}>
                                {busy ? <ActivityIndicator color={colors.text.primary} /> : <Text style={styles.primaryText}>{step === 6 ? 'Save preferences' : returnToReview ? 'Back to review' : step === 0 ? 'Get started' : 'Continue'}</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
    eyebrow: { color: colors.text.secondary, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1.5 },
    textButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
    mutedButtonText: { color: colors.text.secondary, fontSize: typography.size.sm, fontWeight: '600' },
    content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
    heading: { gap: spacing.md },
    title: { fontSize: typography.size.xxxl, lineHeight: 39, color: colors.text.primary, fontWeight: '700', letterSpacing: -0.6 },
    subtitle: { color: colors.text.secondary, fontSize: typography.size.md, lineHeight: 24 },
    heroIcon: { width: 76, height: 76, borderRadius: borderRadius['3xl'], backgroundColor: colors.gradient.glow, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
    welcomeCard: { borderRadius: borderRadius.xl, backgroundColor: colors.background.secondary, padding: spacing.lg, gap: spacing.lg },
    fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    factText: { flex: 1, gap: spacing.xs },
    factTitle: { color: colors.text.primary, fontSize: typography.size.md, fontWeight: '600' },
    body: { color: colors.text.secondary, fontSize: typography.size.sm, lineHeight: 22 },
    progress: { gap: spacing.sm },
    progressText: { color: colors.accent.tertiary, fontSize: typography.size.xs, fontWeight: '600', letterSpacing: 1 },
    progressTrack: { flexDirection: 'row', gap: spacing.xs },
    progressSegment: { flex: 1, height: 4, borderRadius: borderRadius.full, backgroundColor: colors.background.tertiary },
    progressActive: { backgroundColor: colors.accent.primary },
    group: { gap: spacing.sm },
    groupLabel: { color: colors.text.primary, fontSize: typography.size.sm, fontWeight: '600' },
    optionColumn: { gap: spacing.sm },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 64, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background.secondary },
    compactOption: { flexGrow: 1, minWidth: 48, minHeight: 52, justifyContent: 'center' },
    selectedOption: { borderColor: colors.accent.tertiary, backgroundColor: 'rgba(168, 85, 247, 0.14)' },
    optionText: { flexShrink: 1, flexGrow: 1, gap: spacing.xs },
    optionLabel: { color: colors.text.primary, fontSize: typography.size.md, fontWeight: '600' },
    selectedLabel: { color: colors.accent.tertiary },
    equipmentOption: { flexBasis: '46%', flexGrow: 1, gap: spacing.sm, paddingHorizontal: spacing.sm, minHeight: 58 },
    equipmentLabel: { flex: 1, color: colors.text.primary, fontSize: typography.size.sm, fontWeight: '600' },
    optionDetail: { color: colors.text.secondary, fontSize: typography.size.sm, lineHeight: 21 },
    helper: { color: colors.text.secondary, fontSize: typography.size.xs, lineHeight: 19 },
    reviewCard: { borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, backgroundColor: colors.background.secondary },
    reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    reviewText: { flex: 1, gap: spacing.xs },
    linkText: { color: colors.accent.tertiary, fontSize: typography.size.sm, fontWeight: '600' },
    planCard: { borderRadius: borderRadius.xl, backgroundColor: colors.background.secondary, padding: spacing.md, gap: spacing.md },
    planTitle: { color: colors.accent.tertiary, fontSize: typography.size.xl, fontWeight: '700' },
    scheduleRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs, alignItems: 'flex-start' },
    dayLabel: { color: colors.text.secondary, fontSize: typography.size.sm, lineHeight: 21, minWidth: 46 },
    scheduleWorkout: { flex: 1, color: colors.text.primary, fontSize: typography.size.sm, lineHeight: 21 },
    restDay: { color: colors.text.secondary },
    notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.gradient.glow },
    noticeText: { flex: 1, color: colors.text.primary, fontSize: typography.size.sm, lineHeight: 22 },
    footer: { width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    backButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 52, justifyContent: 'center' },
    backText: { color: colors.text.primary, fontSize: typography.size.md, fontWeight: '600' },
    primaryButton: { flex: 1, minHeight: 54, paddingHorizontal: spacing.md, paddingVertical: spacing.md, justifyContent: 'center', alignItems: 'center', borderRadius: borderRadius.lg, backgroundColor: colors.accent.secondary },
    primaryText: { color: colors.text.primary, fontSize: typography.size.md, fontWeight: '700', textAlign: 'center' },
    disabledButton: { opacity: 0.6 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
    errorBox: { borderWidth: 1, borderColor: colors.accent.error, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.xs },
    errorText: { color: colors.text.primary, fontSize: typography.size.sm, lineHeight: 22 },
});
