/**
 * useElapsedTimer Hook
 *
 * Tracks elapsed time from a given start time, updating every second.
 * Extracted from WorkoutScreen to isolate the timer concern.
 *
 * @param startTime - The Date to measure elapsed time from, or null if inactive
 * @returns elapsedTime in seconds, and a formatElapsedTime helper
 */

import { useState, useEffect, useRef } from 'react';

interface UseElapsedTimerReturn {
    /** Elapsed time in seconds since startTime */
    elapsedTime: number;
    /** Format seconds into "M:SS" or "H:MM:SS" string */
    formatElapsedTime: (totalSeconds: number) => string;
}

export function formatElapsedTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function useElapsedTimer(startTime: Date | null): UseElapsedTimerReturn {
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (startTime) {
            // Update immediately
            const updateElapsed = () => {
                const now = new Date();
                const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                setElapsedTime(diff);
            };
            updateElapsed();

            // Set interval
            timerIntervalRef.current = setInterval(updateElapsed, 1000);
        } else {
            // Clear interval when no start time
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            setElapsedTime(0);
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [startTime]);

    return {
        elapsedTime,
        formatElapsedTime,
    };
}
