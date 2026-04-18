// src/components/WorldMap.js
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Star positions are fixed so they don't jump around on re-render
const STARS = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    cx: Math.abs(Math.sin(i * 127.1) * width),
    cy: Math.abs(Math.cos(i * 311.7) * height),
    r: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.2,
}));

const THEME_PALETTES = {
    space: {
        bg: '#0D1B2A',
        bgMid: '#1B2A3B',
        star: '#E8E0FF',
        nebula1: '#7C6AF7',
        nebula2: '#FF7757',
    },
    forest: {
        bg: '#1A2F1A',
        bgMid: '#2A4A2A',
        star: '#FFD166',
        nebula1: '#5DBE6E',
        nebula2: '#FFB347',
    },
    ocean: {
        bg: '#0A1628',
        bgMid: '#0D2440',
        star: '#87CEEB',
        nebula1: '#4AAFC9',
        nebula2: '#7C6AF7',
    },
};

export default function WorldMap({ theme = 'space' }) {
    const p = THEME_PALETTES[theme] || THEME_PALETTES.space;

    // Two independent twinkle animations so stars feel organic
    const twinkleA = useRef(new Animated.Value(1)).current;
    const twinkleB = useRef(new Animated.Value(0.4)).current;

    // Soft nebula pulse in the background
    const nebulaPulse = useRef(new Animated.Value(0.12)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(twinkleA, { toValue: 0.3, duration: 2200, useNativeDriver: true }),
                Animated.timing(twinkleA, { toValue: 1, duration: 2200, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(twinkleB, { toValue: 1, duration: 1800, useNativeDriver: true }),
                Animated.timing(twinkleB, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(nebulaPulse, { toValue: 0.22, duration: 3500, useNativeDriver: true }),
                Animated.timing(nebulaPulse, { toValue: 0.12, duration: 3500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={[styles.root, { backgroundColor: p.bg }]}>
            <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                <Defs>
                    <RadialGradient id="nebula1" cx="30%" cy="35%" rx="40%" ry="40%">
                        <Stop offset="0" stopColor={p.nebula1} stopOpacity="0.18" />
                        <Stop offset="1" stopColor={p.nebula1} stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="nebula2" cx="75%" cy="65%" rx="35%" ry="35%">
                        <Stop offset="0" stopColor={p.nebula2} stopOpacity="0.13" />
                        <Stop offset="1" stopColor={p.nebula2} stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Nebula glow blobs in the background */}
                <Circle cx={width * 0.3} cy={height * 0.35} r={width * 0.55} fill="url(#nebula1)" />
                <Circle cx={width * 0.75} cy={height * 0.65} r={width * 0.45} fill="url(#nebula2)" />

                {/* Stars split into two groups with offset twinkle timings */}
                <G opacity={twinkleA.__getValue()}>
                    {STARS.filter((_, i) => i % 2 === 0).map(s => (
                        <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill={p.star} opacity={0.8} />
                    ))}
                </G>
                <G opacity={twinkleB.__getValue()}>
                    {STARS.filter((_, i) => i % 2 !== 0).map(s => (
                        <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill={p.star} opacity={0.6} />
                    ))}
                </G>

            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
    },
});