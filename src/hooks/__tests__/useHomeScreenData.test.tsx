jest.mock('react-native', () => ({
    AppState: {
        currentState: 'active',
        addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
}));
jest.mock('../../services', () => ({
    getWorkouts: jest.fn(),
    getTemplates: jest.fn(),
    getActiveSplit: jest.fn(),
    getCurrentTemplateIndex: jest.fn(),
    setCurrentTemplateIndex: jest.fn(),
    getWorkoutDatesThisWeek: jest.fn(),
    checkAndAdvanceIfNewDay: jest.fn(),
}));

import React, { act } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Split } from '../../models/split';
import { Template } from '../../models/template';
import * as services from '../../services';
import { useHomeScreenData } from '../useHomeScreenData';

const { create } = require('react-test-renderer');
const readIndex = jest.mocked(services.getCurrentTemplateIndex);
const readTemplates = jest.mocked(services.getTemplates);
const readSplit = jest.mocked(services.getActiveSplit);
const advance = jest.mocked(services.checkAndAdvanceIfNewDay);
const selectIndex = jest.mocked(services.setCurrentTemplateIndex);

type HomeState = ReturnType<typeof useHomeScreenData>;
let home: HomeState;
let renders: HomeState[];
let renderer: { unmount: () => void } | undefined;
let storedIndex: number;
let templates: Template[];
let split: Split;

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { promise, resolve };
}

function Home() {
    home = useHomeScreenData();
    renders.push(home);
    return null;
}

async function mount() {
    await act(async () => { renderer = create(React.createElement(Home)); });
}

function changeAppState(nextState: AppStateStatus) {
    const [, listener] = jest.mocked(AppState.addEventListener).mock.calls[0];
    listener(nextState);
}

function expectCoherentRenders() {
    for (const state of renders) {
        const item = state.activeSplit?.schedule[state.currentTemplateIndex];
        const expected = item?.type === 'template'
            ? templates.find(template => template.id === item.templateId) ?? null
            : null;
        expect(state.currentTemplate).toEqual(expected);
    }
}

beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 20, 12));
    storedIndex = 0;
    renders = [];
    const now = new Date();
    templates = ['upper', 'lower', 'push', 'pull', 'arms'].map(id => ({
        id, name: id, description: null, exercises: [], exerciseCount: 0,
        lastUsedAt: null, useCount: 0, isFavorite: false, createdAt: now, updatedAt: now,
    }));
    split = {
        id: 'ted-split', name: 'Ted Split', description: null,
        templateIds: templates.map(template => template.id),
        schedule: [...templates.map(template => ({ type: 'template' as const, templateId: template.id })), { type: 'rest' }, { type: 'rest' }],
        isBuiltIn: false, isFavorite: false, createdAt: now, updatedAt: now,
    };
    jest.mocked(services.getWorkouts).mockReset().mockResolvedValue([]);
    jest.mocked(services.getWorkoutDatesThisWeek).mockReset().mockResolvedValue([]);
    readSplit.mockReset().mockImplementation(async () => split);
    readTemplates.mockReset().mockImplementation(async () => templates);
    readIndex.mockReset().mockImplementation(async () => storedIndex);
    selectIndex.mockReset().mockImplementation(async index => { storedIndex = index; });
    advance.mockReset().mockResolvedValue(false);
});

afterEach(async () => {
    if (renderer) await act(async () => renderer!.unmount());
    renderer = undefined;
    jest.useRealTimers();
});

it('waits for a delayed rollover before reading the day and publishes the matching template', async () => {
    storedIndex = 4;
    const rollover = deferred<boolean>();
    advance.mockImplementationOnce(async () => {
        await rollover.promise;
        storedIndex = 0;
        return true;
    });
    await mount();
    expect(readIndex).not.toHaveBeenCalled();
    expect(home.isLoading).toBe(true);

    await act(async () => { rollover.resolve(true); });

    expect(home.currentTemplateIndex).toBe(0);
    expect(home.currentTemplate?.id).toBe('upper');
    expect(home.isLoading).toBe(false);
    expectCoherentRenders();
});

it('uses the new position after a same-week advance', async () => {
    await mount();
    advance.mockImplementationOnce(async () => {
        storedIndex = 1;
        return true;
    });

    await act(async () => home.loadData());

    expect(home.currentTemplateIndex).toBe(1);
    expect(home.currentTemplate?.id).toBe('lower');
    expectCoherentRenders();
});

it('keeps the previous coherent snapshot while replacement templates are loading', async () => {
    await mount();
    storedIndex = 4;
    const nextTemplates = deferred<Template[]>();
    readTemplates.mockReturnValueOnce(nextTemplates.promise);
    let refresh!: Promise<void>;
    await act(async () => { refresh = home.loadData(); });

    expect(home.currentTemplateIndex).toBe(0);
    expect(home.currentTemplate?.id).toBe('upper');
    await act(async () => { nextTemplates.resolve(templates); await refresh; });

    expect(home.currentTemplateIndex).toBe(4);
    expect(home.currentTemplate?.id).toBe('arms');
    expectCoherentRenders();
});

it('does not let an older refresh publish over a manual selection', async () => {
    await mount();
    storedIndex = 4;
    const staleTemplates = deferred<Template[]>();
    const selectedTemplates = deferred<Template[]>();
    readTemplates.mockReturnValueOnce(staleTemplates.promise).mockReturnValueOnce(selectedTemplates.promise);
    let refresh!: Promise<void>;
    let selection!: Promise<void>;
    await act(async () => { refresh = home.loadData(); });
    await act(async () => { selection = home.handleChangeTemplateIndex(2); });
    expect(selectIndex).not.toHaveBeenCalled();

    await act(async () => { staleTemplates.resolve(templates); await refresh; });
    expect(selectIndex).toHaveBeenCalledWith(2);
    expect(home.currentTemplateIndex).toBe(0);
    expect(renders.some(state => state.currentTemplateIndex === 4)).toBe(false);
    await act(async () => { selectedTemplates.resolve(templates); await selection; });

    expect(storedIndex).toBe(2);
    expect(home.currentTemplateIndex).toBe(2);
    expect(home.currentTemplate?.id).toBe('push');
    expectCoherentRenders();
});

it('suppresses superseded loads and keeps only the newest snapshot', async () => {
    await mount();
    storedIndex = 4;
    const staleTemplates = deferred<Template[]>();
    const latestTemplates = deferred<Template[]>();
    readTemplates.mockReturnValueOnce(staleTemplates.promise).mockReturnValueOnce(latestTemplates.promise);
    let older!: Promise<void>;
    let newer!: Promise<void>;
    await act(async () => { older = home.loadData(); });
    storedIndex = 1;
    await act(async () => { newer = home.loadData(); });
    await act(async () => { staleTemplates.resolve(templates); await older; });
    expect(home.currentTemplateIndex).toBe(0);
    await act(async () => { latestTemplates.resolve(templates); await newer; });

    expect(home.currentTemplateIndex).toBe(1);
    expect(home.currentTemplate?.id).toBe('lower');
    expect(renders.some(state => state.currentTemplateIndex === 4)).toBe(false);
    expectCoherentRenders();
});

it('orders rapid manual selections so the latest selection wins', async () => {
    await mount();
    const firstWrite = deferred<void>();
    selectIndex.mockImplementationOnce(async index => {
        await firstWrite.promise;
        storedIndex = index;
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => { first = home.handleChangeTemplateIndex(4); });
    await act(async () => { second = home.handleChangeTemplateIndex(1); });
    await act(async () => { firstWrite.resolve(); await Promise.all([first, second]); });

    expect(selectIndex.mock.calls.map(([index]) => index)).toEqual([4, 1]);
    expect(storedIndex).toBe(1);
    expect(home.currentTemplateIndex).toBe(1);
    expect(home.currentTemplate?.id).toBe('lower');
    expect(renders.some(state => state.currentTemplateIndex === 4)).toBe(false);
});

it('retains a rest position without inventing a template', async () => {
    storedIndex = 5;
    await mount();

    expect(home.currentTemplateIndex).toBe(5);
    expect(home.currentTemplate).toBeNull();
    expect(home.templates).toEqual(templates);
});

it('returns all templates and no current template when there is no active split', async () => {
    readSplit.mockResolvedValue(null);
    await mount();

    expect(home.activeSplit).toBeNull();
    expect(home.currentTemplate).toBeNull();
    expect(home.templates).toEqual(templates);
});

it('handles missing templates and empty schedules without leaving the previous workout selected', async () => {
    await mount();
    readTemplates.mockResolvedValue(templates.filter(template => template.id !== 'upper'));
    await act(async () => home.loadData());
    expect(home.currentTemplate).toBeNull();

    readSplit.mockResolvedValue({ ...split, schedule: [], templateIds: [] });
    await act(async () => home.loadData());
    expect(home.currentTemplate).toBeNull();
    expect(home.templates).toEqual([]);
});

it('refreshes on foreground return even when the home screen never unmounted', async () => {
    await mount();
    await act(async () => changeAppState('background'));
    advance.mockImplementationOnce(async () => {
        storedIndex = 1;
        return true;
    });
    await act(async () => changeAppState('active'));

    expect(advance).toHaveBeenCalledTimes(2);
    expect(home.currentTemplateIndex).toBe(1);
    expect(home.currentTemplate?.id).toBe('lower');
    await act(async () => changeAppState('active'));
    expect(advance).toHaveBeenCalledTimes(2);
});

it('refreshes at local midnight while active and cancels the timer in background', async () => {
    jest.setSystemTime(new Date(2026, 9, 20, 23, 59, 59));
    await mount();
    advance.mockImplementationOnce(async () => {
        storedIndex = 1;
        return true;
    });
    await act(async () => { jest.advanceTimersByTime(1000); });

    expect(home.currentTemplateIndex).toBe(1);
    expect(home.currentTemplate?.id).toBe('lower');
    expect(advance).toHaveBeenCalledTimes(2);
    await act(async () => changeAppState('background'));
    await act(async () => { jest.advanceTimersByTime(24 * 60 * 60 * 1000); });
    expect(advance).toHaveBeenCalledTimes(2);
});

it('removes lifecycle work when unmounted', async () => {
    await mount();
    const subscription = jest.mocked(AppState.addEventListener).mock.results[0].value;
    await act(async () => renderer!.unmount());
    renderer = undefined;
    await act(async () => { jest.advanceTimersByTime(24 * 60 * 60 * 1000); });

    expect(subscription.remove).toHaveBeenCalledTimes(1);
    expect(advance).toHaveBeenCalledTimes(1);
});

it('recovers after a failed refresh without discarding the last consistent snapshot', async () => {
    await mount();
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    readTemplates.mockRejectedValueOnce(new Error('Temporary read failure'));
    await act(async () => home.onRefresh());
    expect(home.refreshing).toBe(false);
    expect(home.currentTemplate?.id).toBe('upper');
    storedIndex = 4;
    await act(async () => home.onRefresh());

    expect(home.refreshing).toBe(false);
    expect(home.currentTemplateIndex).toBe(4);
    expect(home.currentTemplate?.id).toBe('arms');
    error.mockRestore();
});
