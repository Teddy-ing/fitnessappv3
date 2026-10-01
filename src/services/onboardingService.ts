import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { withWriteLock } from '../utils/dbMutex';
import { getOnboardingRecommendation } from './onboardingPlanService';
import { insertStarterPlanInTransaction } from './premadeSplits';
import {
    createSkippedOnboardingProfile,
    parseOnboardingProfile,
    type OnboardingProfile,
} from '../models/onboarding';

interface OnboardingRow {
    onboarding_profile: string | null;
    has_completed_onboarding: number;
    active_split_id: string | null;
}

export function shouldShowOnboarding(profile: OnboardingProfile | null): boolean {
    return profile === null || profile.status === 'in_progress';
}

export async function getOnboardingProfile(): Promise<OnboardingProfile | null> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');
    const row = await db.getFirstAsync<OnboardingRow>(
        'SELECT onboarding_profile, has_completed_onboarding FROM user_settings WHERE id = 1',
    );
    const profile = parseOnboardingProfile(row?.onboarding_profile);
    if (profile) return profile;
    // Keep existing users out of automatic onboarding when legacy/corrupt data has a completed flag.
    return row?.has_completed_onboarding === 1 ? createSkippedOnboardingProfile() : null;
}

/** Apply a completed setup exactly once inside the caller's write transaction. */
async function applyProfile(db: SQLiteDatabase, profile: OnboardingProfile, existing: OnboardingRow): Promise<void> {
    const answers = profile.answers;
    const updates: Record<string, string | number | null> = {};
    if (answers.weightUnit !== null) updates.weight_unit = answers.weightUnit;
    if (answers.distanceUnit !== null) updates.distance_unit = answers.distanceUnit;
    if (answers.measurementUnit !== null) updates.measurement_unit = answers.measurementUnit;
    if (answers.trainingPhase !== null && answers.trainingPhase !== 'unsure') updates.training_phase = answers.trainingPhase;

    let appliedSplitId: string | null = null;
    const wantsPlan = profile.useRecommendedPlan ?? answers.experienceLevel === 'beginner';
    // Never replace a routine the user already selected, including when upgrading a saved setup.
    if (wantsPlan && answers.experienceLevel !== 'advanced' && !existing.active_split_id) {
        const recommendation = getOnboardingRecommendation(answers);
        if (recommendation) {
            appliedSplitId = `onboarding_${Crypto.randomUUID()}`;
            await insertStarterPlanInTransaction(db, { ...recommendation.plan, id: appliedSplitId }, false);
            updates.active_split_id = appliedSplitId;
            updates.current_template_index = 0;
            updates.last_workout_date = null;
        }
    }

    const applied: OnboardingProfile = {
        ...profile,
        appliedAt: new Date().toISOString(),
        appliedSplitId,
    };
    updates.onboarding_profile = JSON.stringify(applied);
    updates.has_completed_onboarding = 1;
    const result = await db.runAsync(
        `UPDATE user_settings SET ${Object.keys(updates).map(column => `${column} = ?`).join(', ')} WHERE id = 1`,
        Object.values(updates),
    );
    if (result.changes !== 1) throw new Error('Onboarding answers could not be saved');
}

/** Draft/skip saves are inert. Completion saves preferences and a selected plan atomically. */
export async function saveOnboardingProfile(profile: OnboardingProfile): Promise<void> {
    const validated = parseOnboardingProfile(profile);
    if (!validated) throw new Error('Invalid onboarding profile');

    return withWriteLock(async () => {
        const db = await getDatabase();
        if (!db) throw new Error('Database not available');
        await db.withTransactionAsync(async () => {
            const existing = await db.getFirstAsync<OnboardingRow>(
                'SELECT onboarding_profile, has_completed_onboarding, active_split_id FROM user_settings WHERE id = 1',
            );
            if (!existing) throw new Error('User settings not available');

            const saved = parseOnboardingProfile(existing.onboarding_profile);
            if (saved?.status === 'completed' && validated.status !== 'completed') {
                throw new Error('Completed onboarding answers cannot be replaced by a draft');
            }
            // Retried completion must not reset preferences the user later changed in Settings.
            if (saved?.appliedAt) return;
            if (validated.status === 'completed') {
                await applyProfile(db, validated, existing);
                return;
            }

            const result = await db.runAsync(
                'UPDATE user_settings SET onboarding_profile = ?, has_completed_onboarding = ? WHERE id = 1',
                [JSON.stringify(validated), validated.status === 'in_progress' ? 0 : 1],
            );
            if (result.changes !== 1) throw new Error('Onboarding answers could not be saved');
        });
    });
}

/** Upgrade completed collection-only profiles without repeating setup or replacing an active routine. */
export async function applyStoredOnboarding(): Promise<boolean> {
    return withWriteLock(async () => {
        const db = await getDatabase();
        if (!db) throw new Error('Database not available');
        let applied = false;
        await db.withTransactionAsync(async () => {
            const row = await db.getFirstAsync<OnboardingRow>(
                'SELECT onboarding_profile, has_completed_onboarding, active_split_id FROM user_settings WHERE id = 1',
            );
            const profile = parseOnboardingProfile(row?.onboarding_profile);
            if (!row || profile?.status !== 'completed' || profile.appliedAt) return;
            await applyProfile(db, profile, row);
            applied = true;
        });
        return applied;
    });
}

/** Call inside the existing restore transaction and write lock. */
export async function restoreOnboardingCompatibility(db: SQLiteDatabase, schemaVersion: number): Promise<void> {
    await db.execAsync('INSERT OR IGNORE INTO user_settings (id) VALUES (1);');
    if (schemaVersion < 20) {
        await db.runAsync(
            'UPDATE user_settings SET onboarding_profile = ?, has_completed_onboarding = 1 WHERE id = 1 AND onboarding_profile IS NULL',
            [JSON.stringify(createSkippedOnboardingProfile())],
        );
    }
}
