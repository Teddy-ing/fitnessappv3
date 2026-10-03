import * as SplashScreen from 'expo-splash-screen';

try {
    // The native fade would otherwise cover the beginning of the JS assembly.
    SplashScreen.setOptions({ duration: 0, fade: false });
} catch (error) {
    console.warn('[Startup] Native splash options unavailable:', error);
}

// This must run while the module loads, before React starts rendering.
void SplashScreen.preventAutoHideAsync().catch(error => {
    console.warn('[Startup] Could not retain native splash:', error);
});

let dismissal: Promise<void> | null = null;

/** Also called by the root error boundary, so its fallback is never hidden. */
export function dismissNativeSplash(): Promise<void> {
    if (!dismissal) {
        dismissal = SplashScreen.hideAsync().catch(error => {
            // Expo Go/web and an already dismissed native splash can reject.
            // Keep the React screen usable, and allow a later layout to retry.
            dismissal = null;
            console.warn('[Startup] Could not dismiss native splash:', error);
        });
    }
    return dismissal;
}
