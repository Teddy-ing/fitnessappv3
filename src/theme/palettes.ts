import type { ThemeId } from '../models/theme';

export interface ThemeColors {
    background: { primary: string; secondary: string; tertiary: string };
    text: { primary: string; secondary: string; disabled: string; onAccent: string };
    accent: {
        primary: string; secondary: string; tertiary: string;
        success: string; warning: string; error: string; muted: string; subtle: string;
    };
    gradient: {
        primary: readonly [string, string];
        celebration: readonly [string, string];
        tabBar: readonly [string, string, string];
        glow: string;
    };
    glass: { background: string; border: string; borderLight: string };
    decorative: { purpleOrb: string; blueOrb: string };
    set: { upcoming: string; current: string; completed: string; warmup: string; failed: string; pr: string };
    border: string;
    separator: string;
    overlay: string;
}

/** Apply opacity without assuming which accent the user selected. */
export function withAlpha(hex: string, opacity: number): string {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value.slice(0, 6);
    const rgb = [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16));
    return `rgba(${rgb.join(', ')}, ${Math.max(0, Math.min(1, opacity))})`;
}

export const purpleColors: ThemeColors = {
    background: { primary: '#09090b', secondary: '#18181b', tertiary: '#27272a' },
    text: { primary: '#ffffff', secondary: '#a1a1aa', disabled: '#52525b', onAccent: '#ffffff' },
    accent: {
        primary: '#a855f7', secondary: '#9333ea', tertiary: '#c084fc',
        success: '#22c55e', warning: '#f59e0b', error: '#ef4444',
        muted: 'rgba(168, 85, 247, 0.15)', subtle: 'rgba(168, 85, 247, 0.08)',
    },
    gradient: {
        primary: ['#a855f7', '#9333ea'], tabBar: ['#a855f7', '#4c1d95', '#a855f7'],
        celebration: ['#6b21a8', '#2e1065'],
        glow: 'rgba(168, 85, 247, 0.3)',
    },
    glass: { background: 'rgba(24, 24, 27, 0.6)', border: 'rgba(255, 255, 255, 0.1)', borderLight: 'rgba(255, 255, 255, 0.05)' },
    decorative: { purpleOrb: 'rgba(168, 85, 247, 0.2)', blueOrb: 'rgba(59, 130, 246, 0.1)' },
    set: { upcoming: '#ffffff', current: '#a855f7', completed: '#52525b', warmup: '#f59e0b', failed: '#ef4444', pr: '#22c55e' },
    border: '#27272a', separator: '#27272a', overlay: 'rgba(0, 0, 0, 0.8)',
};

export const ironjotColors: ThemeColors = {
    background: { primary: '#252E33', secondary: '#303B42', tertiary: '#3C4952' },
    text: { primary: '#FFF8E9', secondary: '#BDC7CA', disabled: '#84949C', onAccent: '#252E33' },
    accent: {
        primary: '#FF795F', secondary: '#FA7057', tertiary: '#FFAB97',
        success: '#57D697', warning: '#FFC16B', error: '#FF747B',
        muted: 'rgba(255, 121, 95, 0.15)', subtle: 'rgba(255, 121, 95, 0.08)',
    },
    gradient: {
        primary: ['#FF795F', '#FA7057'], tabBar: ['#FF795F', '#855247', '#FF795F'],
        celebration: ['#61463F', '#303B42'],
        glow: 'rgba(255, 121, 95, 0.3)',
    },
    glass: { background: 'rgba(48, 59, 66, 0.8)', border: 'rgba(255, 248, 233, 0.12)', borderLight: 'rgba(255, 248, 233, 0.06)' },
    decorative: { purpleOrb: 'rgba(255, 121, 95, 0.2)', blueOrb: 'rgba(255, 248, 233, 0.08)' },
    set: { upcoming: '#FFF8E9', current: '#FF795F', completed: '#84949C', warmup: '#FFC16B', failed: '#FF747B', pr: '#57D697' },
    border: '#4B5B65', separator: '#3C4952', overlay: 'rgba(13, 20, 24, 0.85)',
};

export const palettes: Record<ThemeId, ThemeColors> = { ironjot: ironjotColors, purple: purpleColors };
