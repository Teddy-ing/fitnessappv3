/** In-memory launch state. A new JS runtime gets a new session; app resume does not. */
export function createStartupSession() {
    let animationClaimed = false;
    let preparation: Promise<void> | null = null;

    return {
        claimAnimation(): boolean {
            if (animationClaimed) return false;
            animationClaimed = true;
            return true;
        },
        prepare(restore: () => Promise<void>): Promise<void> {
            if (!preparation) {
                // Share pending restoration across remounts and never restore over a
                // workout the user has already changed in this running app.
                preparation = Promise.resolve().then(restore).catch(error => {
                    preparation = null;
                    throw error;
                });
            }
            return preparation;
        },
    };
}

export type StartupSession = ReturnType<typeof createStartupSession>;
export const startupSession = createStartupSession();
