import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_THEME, normalizeThemeId, ThemeProvider, type ThemeId } from '../../theme';
import { getSettings, updateSettings } from '../../services/preferencesService';
import { subscribeSettingsChanges } from '../../services/settingsEvents';

interface AppThemeValue {
    themeId: ThemeId;
    isSavingTheme: boolean;
    selectTheme: (themeId: ThemeId) => Promise<void>;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

/** Hydrates before app content mounts, then updates its palette without remounting it. */
export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);
    const [isReady, setIsReady] = useState(false);
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const revision = useRef(0);
    const mounted = useRef(false);
    const pending = useRef<Promise<void> | null>(null);

    const refresh = useCallback(async () => {
        const request = ++revision.current;
        const settings = await getSettings();
        if (mounted.current && request === revision.current) {
            setThemeId(normalizeThemeId(settings.theme));
            setIsReady(true);
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        const reload = () => {
            void refresh().catch(error => {
                console.warn('[Theme] Could not load preference:', error);
                if (mounted.current) setIsReady(true);
            });
        };
        const unsubscribe = subscribeSettingsChanges(reload);
        reload();
        return () => {
            mounted.current = false;
            revision.current++;
            unsubscribe();
        };
    }, [refresh]);

    const selectTheme = useCallback((next: ThemeId): Promise<void> => {
        if (pending.current) return pending.current;
        if (next === themeId) return Promise.resolve();
        setIsSavingTheme(true);
        const operation = (async () => {
            try {
                await updateSettings({ theme: next });
                // The write has committed. A later read failure must not report
                // a failed save or leave the user looking at the old palette.
                if (mounted.current) setThemeId(normalizeThemeId(next));
                // Read the committed preference, including any queued restore/reset.
                try { await refresh(); }
                catch (error) { console.warn('[Theme] Saved preference; refresh failed:', error); }
            } finally {
                pending.current = null;
                if (mounted.current) setIsSavingTheme(false);
            }
        })();
        pending.current = operation;
        return operation;
    }, [refresh, themeId]);

    const value = useMemo(() => ({ themeId, isSavingTheme, selectTheme }), [themeId, isSavingTheme, selectTheme]);
    return <AppThemeContext.Provider value={value}>
        <ThemeProvider themeId={themeId}>{isReady ? children : null}</ThemeProvider>
    </AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
    const value = useContext(AppThemeContext);
    if (!value) throw new Error('useAppTheme requires AppThemeProvider');
    return value;
}
