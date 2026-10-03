import { createStartupSession } from '../startupSession';

it('gives exactly one component an animation for each runtime session', () => {
    const session = createStartupSession();
    expect(session.claimAnimation()).toBe(true);
    expect(session.claimAnimation()).toBe(false);
    expect(createStartupSession().claimAnimation()).toBe(true);
});

it('shares pending restoration and never re-runs it over user changes after completion', async () => {
    const session = createStartupSession();
    let resolve!: () => void;
    const restore = jest.fn(() => new Promise<void>(done => { resolve = done; }));
    const first = session.prepare(restore);
    const remount = session.prepare(restore);
    expect(first).toBe(remount);
    await Promise.resolve();
    expect(restore).toHaveBeenCalledTimes(1);
    resolve();
    await first;
    await session.prepare(restore);
    expect(restore).toHaveBeenCalledTimes(1);
});

it('allows a failed restoration to be retried', async () => {
    const session = createStartupSession();
    const restore = jest.fn().mockRejectedValueOnce(new Error('read failed')).mockResolvedValueOnce(undefined);
    await expect(session.prepare(restore)).rejects.toThrow('read failed');
    await expect(session.prepare(restore)).resolves.toBeUndefined();
    expect(restore).toHaveBeenCalledTimes(2);
});
