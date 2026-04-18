// src/screens/FeelingsScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    Alert,
} from 'react-native';
import * as Network from 'expo-network';
import * as Speech from 'expo-speech';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { enqueueAction } from '../lib/offlineQueue';

const ISLANDS = [
    { id: 'sunny', label: 'Happy', emoji: '☀️', color: '#FFD166', textColor: '#3D3D3D' },
    { id: 'stormy', label: 'Angry', emoji: '⛈️', color: '#7C6AF7', textColor: '#fff' },
    { id: 'foggy', label: 'Confused', emoji: '🌫️', color: '#B0BEC5', textColor: '#3D3D3D' },
    { id: 'volcano', label: 'Overwhelmed', emoji: '🌋', color: '#FF7757', textColor: '#fff' },
    { id: 'rainy', label: 'Sad', emoji: '🌧️', color: '#64B5F6', textColor: '#fff' },
];

const FOLLOW_UPS = [
    {
        id: 'intensity',
        question: 'How strong is this feeling?',
        options: [
            { id: 'a_little', label: 'A little', emoji: '🙂' },
            { id: 'some', label: 'Some', emoji: '😐' },
            { id: 'a_lot', label: 'A lot', emoji: '😟' },
            { id: 'so_much', label: 'So much', emoji: '😫' },
        ],
    },
    {
        id: 'next',
        question: 'What do you want to do?',
        options: [
            { id: 'take_a_break', label: 'Take a break', emoji: '😮‍💨' },
            { id: 'talk_to_someone', label: 'Talk to someone', emoji: '🗣️' },
            { id: 'keep_going', label: 'Keep going', emoji: '💪' },
            { id: 'just_sit', label: 'Just sit', emoji: '🪑' },
        ],
    },
];

export default function FeelingsScreen() {
    const { activeChild } = useApp();

    const [selectedIsland, setSelectedIsland] = useState(null);
    const [followUpIndex, setFollowUpIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fade animation for transitioning between island select and follow-ups
    const fadeAnim = useState(new Animated.Value(1))[0];

    function fadeTransition(callback) {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        // Run the state update mid-fade so the new content fades in cleanly
        setTimeout(callback, 150);
    }

    function handleIslandPress(island) {
        Speech.speak(island.label, {
            rate: 0.85,
            pitch: 1.1,
            language: 'en-US',
        });
        fadeTransition(() => {
            setSelectedIsland(island);
            setFollowUpIndex(0);
            setAnswers({});
        });
    }

    async function handleFollowUpAnswer(questionId, answerId) {
        const updatedAnswers = { ...answers, [questionId]: answerId };

        if (followUpIndex < FOLLOW_UPS.length - 1) {
            // More questions remaining, advance to the next one
            fadeTransition(() => {
                setAnswers(updatedAnswers);
                setFollowUpIndex(followUpIndex + 1);
            });
        } else {
            // All questions answered, save and show the done state
            setAnswers(updatedAnswers);
            await saveCheckin(updatedAnswers);
        }
    }

    async function saveCheckin(finalAnswers) {
        setSaving(true);

        const record = {
            child_id: activeChild.id,
            island: selectedIsland.id,
            follow_up: finalAnswers,
            logged_at: new Date().toISOString(),
        };

        const net = await Network.getNetworkStateAsync();

        if (net.isConnected && net.isInternetReachable) {
            const { error } = await supabase.from('emotion_checkin').insert(record);
            if (error) {
                // Fall back to offline queue if the insert fails
                await enqueueAction({ type: 'INSERT', table: 'emotion_checkin', payload: record });
            }
        } else {
            // No connection, queue it for later
            await enqueueAction({ type: 'INSERT', table: 'emotion_checkin', payload: record });
        }

        setSaving(false);
        fadeTransition(() => setDone(true));
    }

    function handleReset() {
        fadeTransition(() => {
            setSelectedIsland(null);
            setFollowUpIndex(0);
            setAnswers({});
            setDone(false);
        });
    }

    // Render the done confirmation screen
    if (done) {
        return (
            <View style={styles.wrapper}>
                <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
                    <Text style={styles.doneEmoji}>🌟</Text>
                    <Text style={styles.doneText}>Thank you for sharing</Text>
                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetButtonText}>Check in again</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    // Render the follow-up questions after an island is selected
    if (selectedIsland) {
        const current = FOLLOW_UPS[followUpIndex];
        return (
            <View style={[styles.wrapper, { backgroundColor: selectedIsland.color + '22' }]}>
                <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
                    {/* Island indicator at the top so the child remembers their choice */}
                    <View style={[styles.islandBadge, { backgroundColor: selectedIsland.color }]}>
                        <Text style={styles.islandBadgeEmoji}>{selectedIsland.emoji}</Text>
                        <Text style={[styles.islandBadgeLabel, { color: selectedIsland.textColor }]}>
                            {selectedIsland.label}
                        </Text>
                    </View>

                    <Text style={styles.followUpQuestion}>{current.question}</Text>

                    <View style={styles.followUpGrid}>
                        {current.options.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={styles.followUpCard}
                                onPress={() => handleFollowUpAnswer(current.id, opt.id)}
                                activeOpacity={0.8}
                                disabled={saving}
                            >
                                <Text style={styles.followUpEmoji}>{opt.emoji}</Text>
                                <Text style={styles.followUpLabel}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Let the child go back and pick a different island */}
                    <TouchableOpacity style={styles.backButton} onPress={handleReset}>
                        <Text style={styles.backButtonText}>← Pick a different feeling</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    // Render the island selection grid
    return (
        <ScrollView
            style={styles.wrapper}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.heading}>How are you feeling?</Text>

            <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
                {/* First row — 3 islands */}
                <View style={styles.row}>
                    {ISLANDS.slice(0, 3).map((island) => (
                        <IslandCard key={island.id} island={island} onPress={handleIslandPress} />
                    ))}
                </View>
                {/* Second row — 2 islands centered */}
                <View style={[styles.row, styles.rowCentered]}>
                    {ISLANDS.slice(3, 5).map((island) => (
                        <IslandCard key={island.id} island={island} onPress={handleIslandPress} />
                    ))}
                </View>
            </Animated.View>
        </ScrollView>
    );
}

function IslandCard({ island, onPress }) {
    const scale = useState(new Animated.Value(1))[0];

    function handlePressIn() {
        Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30 }).start();
    }

    function handlePressOut() {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    }

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                style={[styles.islandCard, { backgroundColor: island.color }]}
                onPress={() => onPress(island)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <Text style={styles.islandEmoji}>{island.emoji}</Text>
                <Text style={[styles.islandLabel, { color: island.textColor }]}>{island.label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#F9F7FF',
    },
    scrollContent: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 26,
        fontWeight: '700',
        color: '#3D3D3D',
        textAlign: 'center',
        marginBottom: 32,
    },
    grid: {
        gap: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 14,
        justifyContent: 'space-between',
    },
    rowCentered: {
        justifyContent: 'center',
    },
    islandCard: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        // Soft shadow so the cards feel lifted
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    islandEmoji: {
        fontSize: 36,
    },
    islandLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    islandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 50,
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 8,
        marginTop: 60,
        marginBottom: 32,
    },
    islandBadgeEmoji: {
        fontSize: 22,
    },
    islandBadgeLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    followUpQuestion: {
        fontSize: 22,
        fontWeight: '700',
        color: '#3D3D3D',
        textAlign: 'center',
        marginBottom: 28,
        paddingHorizontal: 24,
    },
    followUpGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 20,
    },
    followUpCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '44%',
        paddingVertical: 22,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        minHeight: 100,
    },
    followUpEmoji: {
        fontSize: 32,
    },
    followUpLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3D3D3D',
        textAlign: 'center',
    },
    backButton: {
        alignSelf: 'center',
        marginTop: 32,
        padding: 12,
    },
    backButtonText: {
        color: '#9E9E9E',
        fontSize: 14,
    },
    doneEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    doneText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#3D3D3D',
        marginBottom: 32,
    },
    resetButton: {
        backgroundColor: '#7C6AF7',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 32,
        minHeight: 60,
        justifyContent: 'center',
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

