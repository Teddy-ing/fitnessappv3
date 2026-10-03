import React, { act, useState } from 'react';
import { Text } from 'react-native';
import AppThemeProvider, { useAppTheme } from './AppThemeProvider';
import { useThemeColors, createThemedStyles, palettes } from '../../theme';
import { getSettings, updateSettings } from '../../services/preferencesService';
import { notifySettingsChanged } from '../../services/settingsEvents';
import type { UserSettings } from '../../models/preferences';

jest.mock('react-native', () => ({ Text: 'Text', StyleSheet: { create: (styles: unknown) => styles } }));
jest.mock('../../services/preferencesService', () => ({ getSettings: jest.fn(), updateSettings: jest.fn() }));
const { create } = require('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
let control: ReturnType<typeof useAppTheme>;
let savedTheme: string;
let setDraft: (value: string) => void;
const useStyles = createThemedStyles(colors => ({ text: { color: colors.text.primary } }));
const Child = React.memo(function Child() {
    control = useAppTheme();
    const colors = useThemeColors();
    const styles = useStyles();
    const [draft, updateDraft] = useState('workout');
    setDraft = updateDraft;
    return <Text style={styles.text} selectionColor={colors.accent.primary}>{draft}</Text>;
});
const row = (theme: string) => ({ theme } as UserSettings);
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { promise, resolve };
}
async function mount() { await act(async () => { renderer = create(<AppThemeProvider><Child /></AppThemeProvider>); }); }

beforeEach(() => {
    savedTheme = 'dark';
    jest.mocked(getSettings).mockReset().mockImplementation(async () => row(savedTheme));
    jest.mocked(updateSettings).mockReset().mockImplementation(async updates => { savedTheme = updates.theme!; notifySettingsChanged(); });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
});

it('waits for saved colors before showing app content', async () => {
    const loading = deferred<UserSettings>();
    jest.mocked(getSettings).mockReturnValueOnce(loading.promise);
    await mount();
    expect(renderer.toJSON()).toBeNull();
    await act(async () => { loading.resolve(row('purple')); });
    expect(control.themeId).toBe('purple');
    expect(renderer.root.findByType('Text').props.style.color).toBe(palettes.purple.text.primary);
});

it('defaults legacy settings to IronJot and switches a memoized child without losing its draft', async () => {
    await mount();
    expect(control.themeId).toBe('ironjot');
    act(() => setDraft('Unfinished set: 185 × 5'));
    await act(async () => { await control.selectTheme('purple'); });
    const text = renderer.root.findByType('Text');
    expect(text.props.children).toBe('Unfinished set: 185 × 5');
    expect(text.props.style.color).toBe(palettes.purple.text.primary);
    expect(text.props.selectionColor).toBe(palettes.purple.accent.primary);
    expect(updateSettings).toHaveBeenCalledWith({ theme: 'purple' });
});

it('guards repeated taps and keeps the current palette until persistence finishes', async () => {
    await mount();
    const write = deferred<void>();
    jest.mocked(updateSettings).mockImplementation(async updates => { await write.promise; savedTheme = updates.theme!; });
    let pending!: Promise<void>;
    act(() => { pending = control.selectTheme('purple'); void control.selectTheme('purple'); });
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(control.themeId).toBe('ironjot');
    expect(control.isSavingTheme).toBe(true);
    await act(async () => { write.resolve(); await pending; });
    expect(control.themeId).toBe('purple');
    expect(control.isSavingTheme).toBe(false);
});

it('preserves the current theme after a failed save and allows retry', async () => {
    await mount();
    jest.mocked(updateSettings).mockRejectedValueOnce(new Error('disk full'));
    await act(async () => { await expect(control.selectTheme('purple')).rejects.toThrow('disk full'); });
    expect(control.themeId).toBe('ironjot');
    expect(control.isSavingTheme).toBe(false);
    await act(async () => { await control.selectTheme('purple'); });
    expect(control.themeId).toBe('purple');
});

it('keeps a committed selection visible when the following preference reads fail', async () => {
    await mount();
    jest.mocked(getSettings).mockRejectedValue(new Error('read failed'));
    await act(async () => { await expect(control.selectTheme('purple')).resolves.toBeUndefined(); });
    expect(savedTheme).toBe('purple');
    expect(control.themeId).toBe('purple');
    expect(control.isSavingTheme).toBe(false);
    expect(renderer.root.findByType('Text').props.style.color).toBe(palettes.purple.text.primary);
});

it('refreshes after restore/reset and ignores a stale read without remounting', async () => {
    await mount();
    act(() => setDraft('Keep my screen'));
    const stale = deferred<UserSettings>();
    jest.mocked(getSettings).mockReturnValueOnce(stale.promise);
    act(() => notifySettingsChanged());
    savedTheme = 'purple';
    await act(async () => notifySettingsChanged());
    await act(async () => { stale.resolve(row('ironjot')); });
    expect(control.themeId).toBe('purple');
    savedTheme = 'dark';
    await act(async () => notifySettingsChanged());
    expect(control.themeId).toBe('ironjot');
    expect(renderer.root.findByType('Text').props.children).toBe('Keep my screen');
});

it('falls back to the default after a read failure so startup can show its recovery UI', async () => {
    jest.mocked(getSettings).mockRejectedValueOnce(new Error('database unavailable'));
    await mount();
    expect(control.themeId).toBe('ironjot');
    expect(renderer.toJSON()).not.toBeNull();
});
