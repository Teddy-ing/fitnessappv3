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
    // Background colors (Updated: zinc-950 for deeper, more premium feel)
    background: {
        primary: '#09090b',      // Main background (zinc-950 - deeper black)
        secondary: '#18181b',    // Card backgrounds (zinc-900)
        tertiary: '#27272a',     // Elevated surfaces (zinc-800)
    },

    // Text colors
    text: {
        primary: '#ffffff',      // Primary text
        secondary: '#a1a1aa',    // Secondary/muted text (zinc-400)
        disabled: '#52525b',     // Disabled text (zinc-600)
    },

    // Accent colors
    accent: {
        primary: '#a855f7',      // Purple - interactive elements (violet-500)
        secondary: '#9333ea',    // Darker purple for gradients (purple-600)
        tertiary: '#c084fc',     // Lighter purple - hover states (violet-400)
        success: '#22c55e',      // Green - completion, PRs
        warning: '#f59e0b',      // Amber - warmup sets
        error: '#ef4444',        // Red - failed sets, errors
    },

    // Gradient colors (for primary buttons)
    gradient: {
        primary: ['#a855f7', '#9333ea'] as const, // violet-500 to purple-600
        glow: 'rgba(168, 85, 247, 0.3)',          // Purple glow for shadows
    },

    // Glassmorphism / Surface colors
    glass: {
        background: 'rgba(24, 24, 27, 0.6)',     // Semi-transparent zinc-900
        border: 'rgba(255, 255, 255, 0.1)',      // Subtle white border
        borderLight: 'rgba(255, 255, 255, 0.05)', // Even more subtle
    },

    // Decorative blur orb colors
    decorative: {
        purpleOrb: 'rgba(168, 85, 247, 0.2)',    // Purple blur orb
        blueOrb: 'rgba(59, 130, 246, 0.1)',      // Blue blur orb (accent)
    },

    // Set state colors
    set: {
        upcoming: '#ffffff',     // Normal set
        current: '#a855f7',      // Active/current set (purple)
        completed: '#52525b',    // Completed set (faded - zinc-600)
        warmup: '#f59e0b',       // Warmup set
        failed: '#ef4444',       // Failed set
        pr: '#22c55e',           // Personal record
    },

    // UI element colors
    border: '#27272a',           // zinc-800
    separator: '#27272a',
    overlay: 'rgba(0, 0, 0, 0.8)',
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
