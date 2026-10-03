import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { DEFAULT_THEME, type ThemeId } from '../models/theme';
import { palettes, type ThemeColors } from './palettes';

export const ThemeContext = createContext<ThemeColors>(palettes[DEFAULT_THEME]);

export function ThemeProvider({ themeId, children }: { themeId: ThemeId; children: React.ReactNode }) {
    return <ThemeContext.Provider value={palettes[themeId]}>{children}</ThemeContext.Provider>;
}

export function useThemeColors(): ThemeColors {
    return useContext(ThemeContext);
}

/** Each consuming component subscribes; changing colors never remounts its state. */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
    factory: (colors: ThemeColors) => T,
): () => T {
    return function useThemedStyles(): T {
        const colors = useThemeColors();
        return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
    };
}
