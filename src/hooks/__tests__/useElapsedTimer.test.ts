/**
 * Tests for useElapsedTimer hook
 *
 * Tests the pure formatting function and the timer behavior.
 */

import { formatElapsedTime } from '../useElapsedTimer';

// ========================================
// formatElapsedTime (pure function)
// ========================================

describe('formatElapsedTime', () => {
    it('formats 0 seconds as "0:00"', () => {
        expect(formatElapsedTime(0)).toBe('0:00');
    });

    it('formats seconds under a minute correctly', () => {
        expect(formatElapsedTime(5)).toBe('0:05');
        expect(formatElapsedTime(30)).toBe('0:30');
        expect(formatElapsedTime(59)).toBe('0:59');
    });

    it('formats exact minutes correctly', () => {
        expect(formatElapsedTime(60)).toBe('1:00');
        expect(formatElapsedTime(120)).toBe('2:00');
        expect(formatElapsedTime(600)).toBe('10:00');
    });

    it('formats minutes and seconds correctly', () => {
        expect(formatElapsedTime(65)).toBe('1:05');
        expect(formatElapsedTime(90)).toBe('1:30');
        expect(formatElapsedTime(754)).toBe('12:34');
    });

    it('pads seconds with leading zero', () => {
        expect(formatElapsedTime(61)).toBe('1:01');
        expect(formatElapsedTime(609)).toBe('10:09');
    });

    it('switches to H:MM:SS format at 1 hour', () => {
        expect(formatElapsedTime(3600)).toBe('1:00:00');
        expect(formatElapsedTime(3661)).toBe('1:01:01');
        expect(formatElapsedTime(7200)).toBe('2:00:00');
    });

    it('formats multi-hour durations correctly', () => {
        // 2 hours, 15 minutes, 30 seconds = 8130 seconds
        expect(formatElapsedTime(8130)).toBe('2:15:30');
    });

    it('pads minutes in hour format', () => {
        // 1 hour, 5 minutes, 3 seconds
        expect(formatElapsedTime(3903)).toBe('1:05:03');
    });

    it('handles large values', () => {
        // 10 hours
        expect(formatElapsedTime(36000)).toBe('10:00:00');
    });
});
