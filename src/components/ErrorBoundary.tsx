/**
 * ErrorBoundary Component
 *
 * React class component that catches JavaScript errors in its child tree
 * and displays a fallback UI instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary fallback="screen">   — full-screen fallback with retry
 *   <ErrorBoundary fallback="card">     — compact inline fallback
 *   <ErrorBoundary fallback="silent">   — renders nothing on error
 *
 * Place boundaries at:
 *   1. App root          — catches everything, prevents white screen
 *   2. Each tab screen   — one tab crashing doesn't break others
 *   3. ExerciseCard      — one corrupt exercise doesn't crash the workout
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

type FallbackType = 'screen' | 'card' | 'silent';

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Which fallback UI to show: 'screen' (full), 'card' (inline), 'silent' (nothing) */
    fallback?: FallbackType;
    /** Optional label for logging (e.g. "ExerciseCard" or "WorkoutScreen") */
    label?: string;
    /** Called when an error is caught (for external logging) */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const label = this.props.label ?? 'Unknown';
        console.error(`[ErrorBoundary:${label}] Caught error:`, error);
        console.error(`[ErrorBoundary:${label}] Component stack:`, errorInfo.componentStack);
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const fallbackType = this.props.fallback ?? 'screen';

        if (fallbackType === 'silent') {
            return null;
        }

        if (fallbackType === 'card') {
            return (
                <View style={styles.cardFallback}>
                    <Text style={styles.cardIcon}>⚠️</Text>
                    <View style={styles.cardTextContainer}>
                        <Text style={styles.cardTitle}>Failed to load</Text>
                        <Text style={styles.cardMessage}>
                            {this.props.label ?? 'This item'} encountered an error
                        </Text>
                    </View>
                    <TouchableOpacity onPress={this.handleRetry} style={styles.cardRetryButton}>
                        <Text style={styles.cardRetryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Screen fallback (default)
        return (
            <View style={styles.screenFallback}>
                <Text style={styles.screenIcon}>😵</Text>
                <Text style={styles.screenTitle}>Something went wrong</Text>
                <Text style={styles.screenMessage}>
                    {this.state.error?.message ?? 'An unexpected error occurred'}
                </Text>
                <TouchableOpacity onPress={this.handleRetry} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    // Screen-level fallback (full screen)
    screenFallback: {
        flex: 1,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    screenIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    screenTitle: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    screenMessage: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    retryButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },

    // Card-level fallback (inline)
    cardFallback: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accent.error + '40', // 25% opacity
    },
    cardIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTitle: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    cardMessage: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    cardRetryButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    cardRetryText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
});
