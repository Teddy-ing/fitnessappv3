jest.mock('expo-splash-screen', () => ({
    setOptions: jest.fn(),
    preventAutoHideAsync: jest.fn().mockResolvedValue(true),
    hideAsync: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => { jest.restoreAllMocks(); });

it('retains the native splash at module load and removes the default fade', () => {
    const splash = require('expo-splash-screen');
    require('../nativeSplash');
    expect(splash.preventAutoHideAsync).toHaveBeenCalledTimes(1);
    expect(splash.setOptions).toHaveBeenCalledWith({ duration: 0, fade: false });
    expect(splash.hideAsync).not.toHaveBeenCalled();
});

it('shares native dismissal across layouts and error-boundary fallback calls', async () => {
    const splash = require('expo-splash-screen');
    const { dismissNativeSplash } = require('../nativeSplash');
    await Promise.all([dismissNativeSplash(), dismissNativeSplash()]);
    expect(splash.hideAsync).toHaveBeenCalledTimes(1);
});

it('does not block the React screen if the native splash API rejects', async () => {
    const splash = require('expo-splash-screen');
    splash.hideAsync.mockRejectedValueOnce(new Error('already hidden'));
    const { dismissNativeSplash } = require('../nativeSplash');
    await expect(dismissNativeSplash()).resolves.toBeUndefined();
    await expect(dismissNativeSplash()).resolves.toBeUndefined();
    expect(splash.hideAsync).toHaveBeenCalledTimes(2);
});

it('still retains the splash when options are unavailable', () => {
    const splash = require('expo-splash-screen');
    splash.setOptions.mockImplementationOnce(() => { throw new Error('unsupported option'); });
    require('../nativeSplash');
    expect(splash.preventAutoHideAsync).toHaveBeenCalledTimes(1);
});
