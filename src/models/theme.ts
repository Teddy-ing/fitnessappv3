/** Stored theme choices. Older releases only offered a placeholder `dark` value. */
export type ThemeId = 'ironjot' | 'purple';

export const DEFAULT_THEME: ThemeId = 'ironjot';

export function normalizeThemeId(value: unknown): ThemeId {
    return value === 'purple' ? 'purple' : DEFAULT_THEME;
}
