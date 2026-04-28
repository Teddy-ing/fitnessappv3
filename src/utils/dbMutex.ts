/**
 * Async Mutex for SQLite Write Serialization
 *
 * SQLite WAL mode handles single-statement atomicity, but multi-statement
 * transactions (withTransactionAsync) can interleave if multiple async
 * operations start transactions concurrently. This mutex ensures only
 * one transaction-level write operation runs at a time.
 *
 * TD-047: Created to prevent auto-backup racing with workout save,
 * and import racing with backup/save.
 *
 * Uses a promise-chain pattern (no starvation, FIFO ordering).
 */

let lockPromise: Promise<void> = Promise.resolve();

/**
 * Execute `fn` while holding the write lock.
 * Only one `fn` runs at a time — all others queue in FIFO order.
 *
 * Usage:
 *   return withWriteLock(async () => {
 *       await db.withTransactionAsync(async () => { ... });
 *   });
 */
export async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const nextLock = new Promise<void>(resolve => {
        release = resolve;
    });
    const previousLock = lockPromise;
    lockPromise = nextLock;

    await previousLock;
    try {
        return await fn();
    } finally {
        release!();
    }
}
