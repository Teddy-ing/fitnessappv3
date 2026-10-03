import { createRestTimerNotificationController } from '../restTimerNotificationController';

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
}

describe('rest timer notification ownership', () => {
    const cancel = jest.fn(async (_id: string) => {});
    beforeEach(() => jest.clearAllMocks());

    it('cancels the previous alarm before replacing an adjusted deadline', async () => {
        const schedule = jest.fn(async (_end: number, _isCurrent: () => boolean) => 'alarm-1');
        const controller = createRestTimerNotificationController({ schedule, cancel });
        await controller.replace(120000);
        await controller.replace(150000);
        expect(cancel).toHaveBeenCalledWith('alarm-1');
        expect(schedule.mock.calls.map(call => call[0])).toEqual([120000, 150000]);
        expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(schedule.mock.invocationCallOrder[1]);
    });

    it('cancels an in-flight alarm that finishes scheduling after Skip', async () => {
        const pending = deferred<string>();
        const schedule = jest.fn((_end: number, _isCurrent: () => boolean) => pending.promise);
        const controller = createRestTimerNotificationController({ schedule, cancel });
        const first = controller.replace(120000);
        const guard = schedule.mock.calls[0][1];
        await controller.cancel();
        expect(guard()).toBe(false);
        pending.resolve('skipped-alarm');
        await first;
        expect(cancel).toHaveBeenCalledWith('skipped-alarm');
    });

    it('keeps the latest alarm when native requests resolve out of order', async () => {
        const first = deferred<string>();
        const second = deferred<string>();
        const schedule = jest.fn()
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);
        const controller = createRestTimerNotificationController({ schedule, cancel });
        const oldRequest = controller.replace(120000);
        const newRequest = controller.replace(150000);
        second.resolve('new-alarm');
        await newRequest;
        first.resolve('old-alarm');
        await oldRequest;
        expect(cancel.mock.calls).toEqual([['old-alarm']]);
        await controller.cancel();
        expect(cancel.mock.calls).toEqual([['old-alarm'], ['new-alarm']]);
    });

    it('does not schedule an obsolete deadline while cancellation is pending', async () => {
        const pendingCancellation = deferred<void>();
        const localCancel = jest.fn(() => pendingCancellation.promise);
        const schedule = jest.fn(async () => 'alarm');
        const controller = createRestTimerNotificationController({ schedule, cancel: localCancel });
        await controller.replace(120000);
        const adjustment = controller.replace(150000);
        await controller.cancel();
        pendingCancellation.resolve();
        await adjustment;
        expect(schedule).toHaveBeenCalledTimes(1);
    });

    it('handles denied notification permission without a bogus cancellation', async () => {
        const controller = createRestTimerNotificationController({ schedule: async () => null, cancel });
        await controller.replace(120000);
        await controller.cancel();
        expect(cancel).not.toHaveBeenCalled();
    });

    it('preserves a pending alarm request for the same deadline on resume', async () => {
        const pending = deferred<string>();
        const schedule = jest.fn((_end: number, _isCurrent: () => boolean) => pending.promise);
        const controller = createRestTimerNotificationController({ schedule, cancel });
        const first = controller.replace(120000);
        await controller.ensureScheduled(120000);
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(schedule.mock.calls[0][1]()).toBe(true);
        pending.resolve('alarm');
        await first;
        await controller.ensureScheduled(120000);
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(cancel).not.toHaveBeenCalled();
    });

    it('retries the same deadline when an earlier request produced no alarm', async () => {
        const schedule = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('alarm');
        const controller = createRestTimerNotificationController({ schedule, cancel });
        await controller.replace(120000);
        await controller.ensureScheduled(120000);
        expect(schedule).toHaveBeenCalledTimes(2);
        expect(cancel).not.toHaveBeenCalled();
    });
});
