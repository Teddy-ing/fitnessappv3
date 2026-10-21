import type { UserSettings } from '../../models/preferences';
import type { SplitScheduleItem } from '../../models/split';
import { getSettings, updateSettings } from '../preferencesService';
import {
    advanceToNextTemplate,
    checkAndAdvanceIfNewDay,
    getCurrentTemplateIndex,
    markWorkoutCompletedToday,
    setActiveSplit,
    setCurrentTemplateIndex,
} from '../splitService';

jest.mock('../preferencesService', () => ({ getSettings: jest.fn(), updateSettings: jest.fn() }));
jest.mock('../templateService', () => ({ getTemplates: jest.fn().mockResolvedValue([]) }));
jest.mock('../database', () => ({ getDatabase: async () => mockDb }));

const week: SplitScheduleItem[] = [
    { type: 'template', templateId: 'upper' },
    { type: 'template', templateId: 'lower' },
    { type: 'template', templateId: 'push' },
    { type: 'template', templateId: 'pull' },
    { type: 'template', templateId: 'arms' },
    { type: 'rest' },
    { type: 'rest' },
];

let settings: UserSettings;
let schedules: Record<string, SplitScheduleItem[]>;
const mockDb = {
    getFirstAsync: jest.fn(async (_sql: string, [id]: string[]) => schedules[id] ? {
        id, name: id, description: null, is_built_in: 0, is_favorite: 0,
        created_at: '2026-10-01T12:00:00', updated_at: '2026-10-01T12:00:00',
    } : null),
    getAllAsync: jest.fn(async (sql: string, [id]: string[]) => {
        if (sql.includes('splits_schedule')) {
            return (schedules[id] ?? []).map(item => ({
                item_type: item.type, template_id: item.type === 'template' ? item.templateId : null,
            }));
        }
        return [];
    }),
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-20T12:00:00'));
    settings = {
        activeSplitId: 'ted', currentTemplateIndex: 4, lastWorkoutDate: '2026-10-16', calendarStartDay: 'monday',
    } as UserSettings;
    schedules = { ted: week, other: week };
    jest.mocked(getSettings).mockImplementation(async () => ({ ...settings }));
    jest.mocked(updateSettings).mockImplementation(async updates => {
        // Yield before committing, so competing read/modify/write calls can race
        // unless the production service holds the real write mutex.
        await Promise.resolve();
        settings = { ...settings, ...updates };
    });
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('completed split progression', () => {
    it('wraps Friday arms through weekend rests to upper on Tuesday exactly once', async () => {
        expect(await checkAndAdvanceIfNewDay()).toBe(true);
        expect(settings.currentTemplateIndex).toBe(0);
        expect(settings.lastWorkoutDate).toBeNull();
        expect(updateSettings).toHaveBeenCalledTimes(1);
        expect(updateSettings).toHaveBeenCalledWith({ currentTemplateIndex: 0, lastWorkoutDate: null });

        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        jest.setSystemTime(new Date('2026-10-21T12:00:00'));
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.currentTemplateIndex).toBe(0);
    });

    it.each(['monday', 'sunday'] as const)('preserves an unfinished cycle across a %s week boundary', async calendarStartDay => {
        settings = { ...settings, currentTemplateIndex: 1, calendarStartDay };
        expect(await checkAndAdvanceIfNewDay()).toBe(true);
        expect(settings.currentTemplateIndex).toBe(2);
    });

    it('does not skip incomplete workouts even after several weeks away', async () => {
        settings = { ...settings, currentTemplateIndex: 2, lastWorkoutDate: null };
        jest.setSystemTime(new Date('2026-11-20T12:00:00'));
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.currentTemplateIndex).toBe(2);
        expect(updateSettings).not.toHaveBeenCalled();
    });

    it('keeps the completed position on the same local day', async () => {
        settings.lastWorkoutDate = '2026-10-20';
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.currentTemplateIndex).toBe(4);
        expect(updateSettings).not.toHaveBeenCalled();
    });

    it('does not advance for a completion dated in the future', async () => {
        settings.lastWorkoutDate = '2026-10-21';
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.lastWorkoutDate).toBe('2026-10-21');
    });

    it('uses the local date when UTC has already moved to tomorrow', async () => {
        jest.setSystemTime(new Date('2026-10-21T06:30:00Z'));
        jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
        jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(9);
        const localDay = jest.spyOn(Date.prototype, 'getDate').mockReturnValue(20);
        expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-21');

        await markWorkoutCompletedToday();
        expect(settings.lastWorkoutDate).toBe('2026-10-20');
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        localDay.mockReturnValue(21);
        expect(await checkAndAdvanceIfNewDay()).toBe(true);
        expect(settings.currentTemplateIndex).toBe(0);
    });

    it('consumes a completion once when multiple loads run concurrently', async () => {
        settings.currentTemplateIndex = 0;
        expect(await Promise.all([
            checkAndAdvanceIfNewDay(), checkAndAdvanceIfNewDay(), checkAndAdvanceIfNewDay(),
        ])).toEqual([true, false, false]);
        expect(settings.currentTemplateIndex).toBe(1);
        expect(updateSettings).toHaveBeenCalledTimes(1);
    });

    it('retains the pending completion when the atomic write fails, then retries once', async () => {
        jest.mocked(updateSettings).mockRejectedValueOnce(new Error('write failed'));
        await expect(checkAndAdvanceIfNewDay()).rejects.toThrow('write failed');
        expect(settings.currentTemplateIndex).toBe(4);
        expect(settings.lastWorkoutDate).toBe('2026-10-16');
        expect(await checkAndAdvanceIfNewDay()).toBe(true);
        expect(settings.currentTemplateIndex).toBe(0);
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
    });

    it('supports an eight-position cycle without imposing a calendar week', async () => {
        schedules.ted = [...week.slice(0, 5), { type: 'rest' }, { type: 'template', templateId: 'extra' }, { type: 'rest' }];
        expect(await checkAndAdvanceIfNewDay()).toBe(true);
        expect(settings.currentTemplateIndex).toBe(6);

        await markWorkoutCompletedToday();
        jest.setSystemTime(new Date('2026-10-21T12:00:00'));
        expect(await checkAndAdvanceIfNewDay()).toBe(true);
        expect(settings.currentTemplateIndex).toBe(0);
    });

    it('supports direct advancement without leaving a second pending advance', async () => {
        settings.currentTemplateIndex = 0;
        await advanceToNextTemplate();
        expect(settings.currentTemplateIndex).toBe(1);
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
    });
});

describe('explicit split choices', () => {
    it('clears old completion when manually choosing a position', async () => {
        await setCurrentTemplateIndex(2);
        expect(settings.currentTemplateIndex).toBe(2);
        expect(settings.lastWorkoutDate).toBeNull();
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.currentTemplateIndex).toBe(2);
    });

    it.each(['other', null])('clears old completion when choosing active split %s', async id => {
        await setActiveSplit(id);
        expect(settings).toMatchObject({ activeSplitId: id, currentTemplateIndex: 0, lastWorkoutDate: null });
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
    });

    it('serializes a manual choice ahead of a queued automatic advance', async () => {
        await Promise.all([setCurrentTemplateIndex(2), checkAndAdvanceIfNewDay()]);
        expect(settings.currentTemplateIndex).toBe(2);
        expect(settings.lastWorkoutDate).toBeNull();
    });
});

describe('unusable schedules and positions', () => {
    it.each([-1, 7, 1.5, NaN])('repairs stored index %s without advancing the repaired position', async index => {
        settings.currentTemplateIndex = index;
        expect(await getCurrentTemplateIndex()).toBe(0);
        expect(settings.currentTemplateIndex).toBe(0);
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
    });

    it.each([-1, 7, 1.5, NaN])('normalizes an invalid manual index %s', async index => {
        await setCurrentTemplateIndex(index);
        expect(settings.currentTemplateIndex).toBe(0);
        expect(settings.lastWorkoutDate).toBeNull();
    });

    it('repairs an invalid stored index when progression runs first', async () => {
        settings.currentTemplateIndex = -1;
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.currentTemplateIndex).toBe(0);
        expect(settings.lastWorkoutDate).toBeNull();
    });

    it.each(['missing', 'empty', 'all rest', 'inactive'])('does not advance an %s split', async variant => {
        if (variant === 'missing') delete schedules.ted;
        if (variant === 'empty') schedules.ted = [];
        if (variant === 'all rest') schedules.ted = [{ type: 'rest' }, { type: 'rest' }];
        if (variant === 'inactive') settings.activeSplitId = null;
        settings.currentTemplateIndex = 0;

        expect(await checkAndAdvanceIfNewDay()).toBe(false);
        expect(settings.currentTemplateIndex).toBe(0);
        expect(settings.lastWorkoutDate).toBeNull();
        expect(await checkAndAdvanceIfNewDay()).toBe(false);
    });
});
