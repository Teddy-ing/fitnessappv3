import React from 'react';
const { act, create } = require('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../services', () => ({ getSettings: jest.fn(), updateSettings: jest.fn() }));
jest.mock('../../../services/preferencesService', () => ({ getSettings: jest.fn() }));
jest.mock('../../../stores', () => ({ useWorkoutStore: { getState: jest.fn(), setState: jest.fn() } }));

import { getSettings } from '../../../services';
import { getSettings as getUnitSettings } from '../../../services/preferencesService';
import { invalidateWeightUnitCache } from '../../useWeightUnit';
import { useWorkoutSettings } from '../useWorkoutSettings';

let settings: ReturnType<typeof useWorkoutSettings>;
let renderer: any;
function Consumer() { settings = useWorkoutSettings(); return null; }
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = null; });

it('waits for the saved unit as well as the consumed workout preferences', async () => {
    const unit = deferred<any>();
    const preferences = deferred<any>();
    jest.mocked(getUnitSettings).mockReturnValue(unit.promise);
    jest.mocked(getSettings).mockReturnValue(preferences.promise);
    await act(async () => { renderer = create(<Consumer />); });
    expect(settings.isLoaded).toBe(false);
    await act(async () => preferences.resolve({ defaultRestTime: 150, autoStartRestTimer: false }));
    expect(settings.defaultRestTime).toBe(150);
    expect(settings.autoStartRestTimer).toBe(false);
    expect(settings.isLoaded).toBe(false);
    await act(async () => unit.resolve({ weightUnit: 'kg' }));
    expect(settings.weightUnit).toBe('kg');
    expect(settings.isLoaded).toBe(true);
});

it('settles failed reads to usable defaults instead of trapping the launch screen', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(getUnitSettings).mockRejectedValue(new Error('read failed'));
    jest.mocked(getSettings).mockRejectedValue(new Error('read failed'));
    await act(async () => {
        invalidateWeightUnitCache();
        renderer = create(<Consumer />);
    });
    expect(settings.isLoaded).toBe(true);
    expect(settings.weightUnit).toBe('lbs');
    expect(settings.defaultRestTime).toBe(90);
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
});
