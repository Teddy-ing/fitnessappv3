/** Shared layout tokens and reactive app palettes. */
import { ironjotColors } from './palettes';
export { palettes, ironjotColors, purpleColors, withAlpha } from './palettes';
export type { ThemeColors } from './palettes';
export { ThemeContext, ThemeProvider, useThemeColors, createThemedStyles } from './runtime';
export { DEFAULT_THEME, normalizeThemeId } from '../models/theme';
export type { ThemeId } from '../models/theme';

/** Default colors for non-React consumers. Components use useThemeColors. */
export const colors = ironjotColors;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,   // New: larger rounded corners for premium feel
    '3xl': 24,   // New: extra large for hero elements
    full: 9999,
};

export const typography = {
    // Font sizes
    size: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },

    // Font weights
    weight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },

    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// Thumb zone rule: 90% of buttons should be in lower 30% of screen
export const layout = {
    thumbZoneHeight: '30%',
    headerHeight: 60,
    tabBarHeight: 80,
    cardPadding: spacing.md,
    screenPadding: spacing.md,
};

export default {
    colors,
    spacing,
    borderRadius,
    typography,
    layout,
};
