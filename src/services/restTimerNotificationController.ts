/** Coordinates native alarms without depending on React or a store. */
interface NotificationScheduler {
    schedule: (endTime: number, isCurrent: () => boolean) => Promise<string | null>;
    cancel: (identifier: string) => Promise<void>;
}

export function createRestTimerNotificationController({ schedule, cancel }: NotificationScheduler) {
    let revision = 0;
    let identifier: string | null = null;
    let scheduledEndTime: number | null = null;
    let scheduling = false;

    async function replace(endTime: number): Promise<void> {
        const currentRevision = ++revision;
        const previousIdentifier = identifier;
        identifier = null;
        scheduledEndTime = endTime;
        scheduling = true;
        try {
            if (previousIdentifier) await cancel(previousIdentifier);
            if (revision !== currentRevision) return;

            const nextIdentifier = await schedule(endTime, () => revision === currentRevision);
            if (revision !== currentRevision) {
                // A Skip, adjustment, or another set overtook the native request.
                if (nextIdentifier) await cancel(nextIdentifier);
                return;
            }
            identifier = nextIdentifier;
        } finally {
            if (revision === currentRevision) {
                scheduling = false;
                if (!identifier) scheduledEndTime = null;
            }
        }
    }

    return {
        replace,
        ensureScheduled(endTime: number): Promise<void> {
            // Resume can happen milliseconds before expiry. Keep an existing or
            // pending native alarm instead of cancelling it to recheck access.
            if (scheduledEndTime === endTime && (identifier !== null || scheduling)) {
                return Promise.resolve();
            }
            // An earlier denied/failed request has no alarm, so it is safe to retry.
            return replace(endTime);
        },
        async cancel(): Promise<void> {
            ++revision;
            const previousIdentifier = identifier;
            identifier = null;
            scheduledEndTime = null;
            scheduling = false;
            if (previousIdentifier) await cancel(previousIdentifier);
        },
    };
}
