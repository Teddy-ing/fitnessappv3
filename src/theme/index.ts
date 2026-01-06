/**
 * Theme configuration for the Workout App
 * 
 * Design inspired by Hevy's dark mode UI with:
 * - Deep dark backgrounds
 * - Purple accent for interactive elements (differentiates from competitors)
 * - Green for completion/success states
 * - High contrast for visibility (sweat in eyes friendly)
 */

export const colors = {
    // Background colors
    background: {
        primary: '#0d0d0d',      // Main background
        secondary: '#1a1a1a',    // Card backgrounds
        tertiary: '#262626',     // Elevated surfaces
    },

    // Text colors
    text: {
        primary: '#ffffff',      // Primary text
        secondary: '#a0a0a0',    // Secondary/muted text
        disabled: '#666666',     // Disabled text
    },

    // Accent colors
    accent: {
        primary: '#a855f7',      // Purple - interactive elements, sets
        secondary: '#c084fc',    // Lighter purple - hover states
        success: '#22c55e',      // Green - completion, PRs
        warning: '#f59e0b',      // Amber - warmup sets
        error: '#ef4444',        // Red - failed sets, errors
    },

    // Set state colors
    set: {
        upcoming: '#ffffff',     // Normal set
        current: '#a855f7',      // Active/current set (purple)
        completed: '#666666',    // Completed set (faded)
        warmup: '#f59e0b',       // Warmup set
        failed: '#ef4444',       // Failed set
        pr: '#22c55e',           // Personal record
    },

    // UI element colors
    border: '#333333',
    separator: '#262626',
    overlay: 'rgba(0, 0, 0, 0.7)',
};

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
