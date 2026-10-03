import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import geometry from '../../../assets/branding/ironjot.geometry.json';

export const IRONJOT_BACKGROUND = geometry.background;
export const IRONJOT_ANIMATION_DURATION = geometry.duration;

export interface IronJotMarkProps {
  size?: number;
  animated?: boolean;
  initialPose?: boolean;
  onAnimationComplete?: () => void;
  onReady?: () => void;
}

type MarkPath = {
  d: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
};

const palette: Record<string, string> = {
  background: geometry.background,
  cream: geometry.cream,
  coral: geometry.coral,
};

/** The selected D / Barbell pen mark. Its layers share the static asset geometry. */
export function IronJotMark({
  size = 192,
  animated = false,
  initialPose = false,
  onAnimationComplete,
  onReady,
}: IronJotMarkProps) {
  const progress = useRef(new Animated.Value(animated || initialPose ? 0 : 1)).current;
  const completeRef = useRef(onAnimationComplete);
  const readyRef = useRef(onReady);
  const readySent = useRef(false);
  completeRef.current = onAnimationComplete;
  readyRef.current = onReady;

  useEffect(() => {
    let mounted = true;
    progress.stopAnimation();
    if (!animated) {
      progress.setValue(initialPose ? 0 : 1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: geometry.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (mounted && finished) completeRef.current?.();
    });
    return () => {
      mounted = false;
      animation.stop();
    };
  }, [animated, initialPose, progress]);

  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{ width: size, height: size }}
      onLayout={() => {
        if (!readySent.current) {
          readySent.current = true;
          readyRef.current?.();
        }
      }}
    >
      {geometry.layers.map(layer => {
        const inputRange = layer.timing;
        const translateX = progress.interpolate({
          inputRange, outputRange: [layer.from.x * size / 512, 0], extrapolate: 'clamp',
        });
        const translateY = progress.interpolate({
          inputRange, outputRange: [layer.from.y * size / 512, 0], extrapolate: 'clamp',
        });
        const rotate = progress.interpolate({
          inputRange, outputRange: [`${layer.from.rotation}deg`, '0deg'], extrapolate: 'clamp',
        });
        return (
          <Animated.View key={layer.id} style={[StyleSheet.absoluteFill, {
            transform: [{ translateX }, { translateY }, { rotate }],
          }]}>
            <Svg width={size} height={size} viewBox={geometry.viewBox}>
              {(layer.paths as MarkPath[]).map((p, index) => (
                <Path key={index} d={p.d} fill={palette[p.fill] ?? p.fill}
                  stroke={p.stroke ? palette[p.stroke] ?? p.stroke : undefined}
                  strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

export default IronJotMark;
