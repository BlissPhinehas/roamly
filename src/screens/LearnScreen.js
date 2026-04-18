// src/screens/LearnScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Animated, Dimensions, Modal, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { supabase } from '../lib/supabase';
import { useApp, buildChildContext } from '../context/AppContext';

const { width: W } = Dimensions.get('window');

const C = {
    purple: '#7C6AF7',
    coral: '#FF7757',
    bg: '#F9F7FF',
    dark: '#3D3D3D',
    muted: '#9E9E9E',
    inactive: '#C4C4C4',
    white: '#fff',
    gold: '#FFD166',
    completed: '#EDE9FF',
    mint: '#52C788',
};

// ── Audio URLs ────────────────────────────────────────────────────────────────
const SOUND_URLS = {
    cell0: 'https://cdn.pixabay.com/audio/2022/03/17/audio_0d5be500ca.mp3',
    cell1: 'https://cdn.pixabay.com/audio/2022/01/18/audio_64ece8ffc4.mp3',
    cell2: 'https://cdn.pixabay.com/audio/2021/08/04/audio_7f218e194e.mp3',
    cell3: 'https://cdn.pixabay.com/audio/2022/03/24/audio_3ceb04536c.mp3',
    cell4: 'https://cdn.pixabay.com/audio/2022/03/15/audio_05dc9896b6.mp3',
    cell5: 'https://cdn.pixabay.com/audio/2022/03/15/audio_376268a0b8.mp3',
    cell6: 'https://cdn.pixabay.com/audio/2024/05/03/audio_0fc387de2e.mp3',
    cell7: 'https://cdn.pixabay.com/audio/2022/03/10/audio_4a1916873e.mp3',
    cell8: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5c106263e7.mp3',
    gameOver: 'https://cdn.pixabay.com/audio/2025/10/08/audio_836ffccdef.mp3',
    success: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3',
};

function playSound(url) {
    try {
        const player = createAudioPlayer({ uri: url });
        player.play();
    } catch (_) { }
}

// ── Simon cells — shape + color + sound ──────────────────────────────────────
const CELLS = [
    { color: '#FF7757', litColor: '#FFBFB0', shape: '●', label: 'Red Circle',    soundKey: 'cell0' },
    { color: '#7C6AF7', litColor: '#C4BEFF', shape: '■', label: 'Purple Square', soundKey: 'cell1' },
    { color: '#FFD166', litColor: '#FFE9A0', shape: '▲', label: 'Yellow Triangle', soundKey: 'cell2' },
    { color: '#52C788', litColor: '#A8ECC4', shape: '◆', label: 'Green Diamond', soundKey: 'cell3' },
    { color: '#64B5F6', litColor: '#B3DAFF', shape: '♥', label: 'Blue Heart',    soundKey: 'cell4' },
    { color: '#F48FB1', litColor: '#FFD6E8', shape: '■', label: 'Pink Square',   soundKey: 'cell5' },
    { color: '#FF9F43', litColor: '#FFCF9A', shape: '★', label: 'Orange Star',   soundKey: 'cell6' },
    { color: '#26C6DA', litColor: '#A0EAF5', shape: '◆', label: 'Teal Diamond',  soundKey: 'cell7' },
    { color: '#A29BFE', litColor: '#D6D3FF', shape: '●', label: 'Lavender Circle', soundKey: 'cell8' },
];

// ── Praise words ──────────────────────────────────────────────────────────────
const PRAISE = ['FANTASTIC!', 'AMAZING!', 'INCREDIBLE!', 'SUPERB!', 'BRILLIANT!', 'OUTSTANDING!', 'WONDERFUL!', 'EXCELLENT!'];
function randomPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

// ── Fix the Sentence data ─────────────────────────────────────────────────────
const FIX_SENTENCES = [
    { wrong: 'The baby are happy', correct: 'The baby is happy', options: ['The baby is happy', 'The baby are happy', 'The baby was happy', 'Baby the is happy'] },
    { wrong: 'I wants water', correct: 'I want water', options: ['I want water', 'I wants water', 'I wanting water', 'Water I want'] },
    { wrong: 'She go to school', correct: 'She goes to school', options: ['She goes to school', 'She go to school', 'She goed to school', 'School she goes'] },
    { wrong: 'They is playing outside', correct: 'They are playing outside', options: ['They are playing outside', 'They is playing outside', 'They was playing outside', 'They playing outside'] },
    { wrong: 'He have a ball', correct: 'He has a ball', options: ['He has a ball', 'He have a ball', 'He haves a ball', 'Ball he has'] },
    { wrong: 'We was eating lunch', correct: 'We were eating lunch', options: ['We were eating lunch', 'We was eating lunch', 'We are eating lunch', 'We eated lunch'] },
    { wrong: 'The dog runned fast', correct: 'The dog ran fast', options: ['The dog ran fast', 'The dog runned fast', 'The dog running fast', 'Fast the dog ran'] },
    { wrong: 'I am go home', correct: 'I am going home', options: ['I am going home', 'I am go home', 'I going home', 'I goes home'] },
    { wrong: "She don't likes cats", correct: "She doesn't like cats", options: ["She doesn't like cats", "She don't likes cats", "She not like cats", "She doesn't likes cats"] },
    { wrong: 'Him is my friend', correct: 'He is my friend', options: ['He is my friend', 'Him is my friend', 'His is my friend', 'He are my friend'] },
    { wrong: 'I goed to the park', correct: 'I went to the park', options: ['I went to the park', 'I goed to the park', 'I going to the park', 'I go to the park'] },
    { wrong: 'They plays together', correct: 'They play together', options: ['They play together', 'They plays together', 'They played together', 'They playing together'] },
    { wrong: 'A elephant is big', correct: 'An elephant is big', options: ['An elephant is big', 'A elephant is big', 'The elephant are big', 'Elephant is big'] },
    { wrong: 'She have two cats', correct: 'She has two cats', options: ['She has two cats', 'She have two cats', 'She haves two cats', 'Two cats she have'] },
    { wrong: 'We is hungry now', correct: 'We are hungry now', options: ['We are hungry now', 'We is hungry now', 'We was hungry now', 'We were hungry now'] },
    { wrong: 'The children runs fast', correct: 'The children run fast', options: ['The children run fast', 'The children runs fast', 'The children running fast', 'Children the run fast'] },
    { wrong: 'He don\'t want to go', correct: 'He doesn\'t want to go', options: ['He doesn\'t want to go', 'He don\'t want to go', 'He not want to go', 'He didn\'t wants to go'] },
    { wrong: 'I seen that movie', correct: 'I saw that movie', options: ['I saw that movie', 'I seen that movie', 'I have see that movie', 'I seed that movie'] },
];

// ── What Comes Next data ──────────────────────────────────────────────────────
const SEQUENCES = [
    { prompt: 'Morning → Afternoon → ___', answer: 'Evening', options: ['Evening', 'Midnight', 'Breakfast', 'Monday'], category: 'Time', emoji: '🌅' },
    { prompt: 'Spring → Summer → ___', answer: 'Autumn', options: ['Autumn', 'January', 'Monday', 'Daytime'], category: 'Seasons', emoji: '🍂' },
    { prompt: 'Wake up → Brush teeth → ___', answer: 'Eat breakfast', options: ['Eat breakfast', 'Sleep', 'Play outside', 'Watch TV'], category: 'Routine', emoji: '🌞' },
    { prompt: 'Monday → Tuesday → ___', answer: 'Wednesday', options: ['Wednesday', 'Sunday', 'January', 'Evening'], category: 'Days', emoji: '📅' },
    { prompt: 'Baby → Child → ___', answer: 'Adult', options: ['Adult', 'Baby', 'Animal', 'Teacher'], category: 'Growing', emoji: '🌱' },
    { prompt: 'Tiny → Small → ___', answer: 'Big', options: ['Big', 'Tiny', 'Blue', 'Soft'], category: 'Size', emoji: '📏' },
    { prompt: 'Sad → Okay → ___', answer: 'Happy', options: ['Happy', 'Angry', 'Sleepy', 'Scared'], category: 'Feelings', emoji: '😊' },
    { prompt: 'Eat breakfast → School → ___', answer: 'Come home', options: ['Come home', 'Wake up', 'Eat dinner', 'Sleep'], category: 'Routine', emoji: '🏠' },
    { prompt: 'January → February → ___', answer: 'March', options: ['March', 'December', 'Summer', 'Tuesday'], category: 'Months', emoji: '📆' },
    { prompt: 'Sun → Clouds → ___', answer: 'Rain', options: ['Rain', 'Monday', 'Happy', 'School'], category: 'Weather', emoji: '🌧️' },
    { prompt: 'One → Two → ___', answer: 'Three', options: ['Three', 'Five', 'Ten', 'Zero'], category: 'Numbers', emoji: '🔢' },
    { prompt: 'Cold → Cool → ___', answer: 'Warm', options: ['Warm', 'Freezing', 'Stormy', 'Night'], category: 'Temp', emoji: '🌡️' },
    { prompt: 'Bath → Pajamas → ___', answer: 'Sleep', options: ['Sleep', 'Breakfast', 'School', 'Play'], category: 'Bedtime', emoji: '🌙' },
    { prompt: 'Slow → Medium → ___', answer: 'Fast', options: ['Fast', 'Slow', 'Heavy', 'Loud'], category: 'Speed', emoji: '⚡' },
    { prompt: 'Whisper → Talk → ___', answer: 'Shout', options: ['Shout', 'Whisper', 'Sleep', 'Walk'], category: 'Volume', emoji: '🔊' },
    { prompt: 'Autumn → Winter → ___', answer: 'Spring', options: ['Spring', 'Summer', 'January', 'Monday'], category: 'Seasons', emoji: '🌸' },
    { prompt: 'Sunday → Monday → ___', answer: 'Tuesday', options: ['Tuesday', 'Thursday', 'Friday', 'Saturday'], category: 'Days', emoji: '📅' },
    { prompt: 'Happy → Excited → ___', answer: 'Overjoyed', options: ['Overjoyed', 'Sad', 'Calm', 'Angry'], category: 'Feelings', emoji: '🎉' },
];

// ── Log game scores to Supabase ────────────────────────────────────────────
async function logGameScore(childId, gameType, score, accuracy = null) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
            .from('game_log')
            .select('*')
            .eq('child_id', childId)
            .eq('game_type', gameType)
            .eq('date', today)
            .single();

        const bestScore = existing ? Math.max(existing.best_score, score) : score;

        if (existing) {
            await supabase.from('game_log')
                .update({ score, best_score: bestScore, accuracy, logged_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabase.from('game_log')
                .insert({ child_id: childId, date: today, game_type: gameType, score, best_score: bestScore, accuracy });
        }
    } catch (_) {}
}

const GAMES = [
    { id: 'simon', label: 'Memory Lights', sub: 'Remember the pattern', emoji: '💡', color: '#7C6AF7', tint: '#EDE9FF' },
    { id: 'fix', label: 'Fix It!', sub: 'Correct the sentence', emoji: '✏️', color: '#FF7757', tint: '#FFE8E2' },
    { id: 'sequence', label: "What's Next?", sub: 'Complete the sequence', emoji: '🔮', color: '#52C788', tint: '#D4F4E2' },
];

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Fetch Gemini-generated questions ───────────────────────────────────────
async function fetchGeminiQuestions(type, childProfile) {
    const context = buildChildContext(childProfile);
    const prompts = {
        fix: `You are creating grammar correction exercises for a child app called Roamly.
${context}
Generate 10 Fix the Sentence questions appropriate for this child.
Return ONLY a valid JSON array. Each item must have:
- wrong: a sentence with one grammar mistake
- correct: the corrected sentence
- options: array of exactly 4 strings, one being the correct answer, others being plausible wrong answers
No markdown. No explanation. Just the JSON array.`,

        sequence: `You are creating learning exercises for a child app called Roamly.
${context}
Generate 10 "What Comes Next" sequence questions appropriate for this child.
Return ONLY a valid JSON array. Each item must have:
- prompt: a sequence like "Morning → Afternoon → ___"
- answer: the correct next item
- options: array of exactly 4 strings, one being the correct answer
- category: one word category label
- emoji: one relevant emoji
No markdown. No explanation. Just the JSON array.`,
    };

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompts[type] }] }] }),
            }
        );
        const data = await res.json();
        const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
    return null; // null triggers fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// HUB
// ─────────────────────────────────────────────────────────────────────────────
export default function LearnScreen({ onClose }) {
    const { activeChild } = useApp();
    const [currentGame, setCurrentGame] = useState(null);

    if (currentGame === 'simon') return <SimonGame onBack={() => setCurrentGame(null)} activeChild={activeChild} />;
    if (currentGame === 'fix') return <FixGame onBack={() => setCurrentGame(null)} activeChild={activeChild} />;
    if (currentGame === 'sequence') return <SequenceGame onBack={() => setCurrentGame(null)} activeChild={activeChild} />;

    return (
        <SafeAreaView style={st.screen}>
            <View style={st.header}>
                <TouchableOpacity style={st.backBtn} onPress={onClose}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: C.dark }}>←</Text>
                </TouchableOpacity>
                <Text style={st.headerTitle}>Play & Learn 🎮</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={st.hubContent} showsVerticalScrollIndicator={false}>
                <Text style={st.hubSub}>Choose a game to play</Text>
                {GAMES.map((game, i) => (
                    <TouchableOpacity
                        key={game.id}
                        style={[st.gameCard, { borderColor: game.color + '55' }]}
                        onPress={() => setCurrentGame(game.id)}
                        activeOpacity={0.85}
                    >
                        <View style={[st.gameCardIcon, { backgroundColor: game.tint }]}>
                            <Text style={st.gameCardEmoji}>{game.emoji}</Text>
                        </View>
                        <View style={st.gameCardText}>
                            <Text style={[st.gameCardTitle, { color: game.color }]}>{game.label}</Text>
                            <Text style={st.gameCardSub}>{game.sub}</Text>
                        </View>
                        <View style={[st.gameCardArrow, { backgroundColor: game.tint }]}>
                            <Text style={{ color: game.color, fontWeight: '800', fontSize: 18 }}>›</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMON GAME
// ─────────────────────────────────────────────────────────────────────────────
function SimonGame({ onBack }) {
    const { activeChild } = useApp();
    const [pattern, setPattern] = useState([]);
    const [litCell, setLitCell] = useState(null);
    const [allowInput, setAllowInput] = useState(false);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [status, setStatus] = useState('Press Start to play!');
    const [playing, setPlaying] = useState(false);
    const [pauseModal, setPauseModal] = useState(false);
    const [exitConfirm, setExitConfirm] = useState(false);
    const [resultModal, setResultModal] = useState(null);
    const [strikes, setStrikes] = useState(0);
    const [praiseText, setPraiseText] = useState('');
    const praiseAnim = useRef(new Animated.Value(0)).current;

    const patternRef = useRef([]);
    const playerRef = useRef([]);
    const allowRef = useRef(false);
    const pausedRef = useRef(false);
    const scoreRef = useRef(0);
    const strikesRef = useRef(0);
    const MAX_STRIKES = 3;
    const CLUE_HOLD = 700;
    const CLUE_PAUSE = 300;
    const NEXT_WAIT = 900;

    useEffect(() => { loadBestScore(); }, []);

    async function loadBestScore() {
        try {
            const { data } = await supabase.from('child').select('avatar_config').eq('id', activeChild.id).single();
            if (data?.avatar_config?.simonBest) setBestScore(data.avatar_config.simonBest);
        } catch (_) { }
    }

    async function saveBestScore(score) {
        try {
            const { data } = await supabase.from('child').select('avatar_config').eq('id', activeChild.id).single();
            const updated = { ...(data?.avatar_config || {}), simonBest: score };
            await supabase.from('child').update({ avatar_config: updated }).eq('id', activeChild.id);
        } catch (_) { }
    }

    function showPraise(text) {
        setPraiseText(text);
        praiseAnim.setValue(0);
        Animated.sequence([
            Animated.spring(praiseAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
            Animated.delay(700),
            Animated.timing(praiseAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }

    function addToPattern(current) {
        let next;
        const len = current.length;
        do { next = Math.floor(Math.random() * 9); }
        while (len >= 2 && next === current[len - 1] && next === current[len - 2]);
        return [...current, next];
    }

    function lightUp(cell) {
        setLitCell(cell);
        playSound(SOUND_URLS[CELLS[cell].soundKey]);
        setTimeout(() => setLitCell(null), CLUE_HOLD - 100);
    }

    function playSequence(seq) {
        if (pausedRef.current) return;
        allowRef.current = false;
        setAllowInput(false);
        setStatus('👀 Watch the pattern...');
        let delay = NEXT_WAIT;
        seq.forEach(cell => {
            setTimeout(() => { if (!pausedRef.current) lightUp(cell); }, delay);
            delay += CLUE_HOLD + CLUE_PAUSE;
        });
        setTimeout(() => {
            if (!pausedRef.current) {
                allowRef.current = true;
                setAllowInput(true);
                setStatus('👆 Your turn! Repeat the pattern');
            }
        }, delay);
    }

    function startGame() {
        const newPattern = addToPattern([]);
        patternRef.current = newPattern;
        playerRef.current = [];
        strikesRef.current = 0;
        scoreRef.current = 0;
        pausedRef.current = false;
        setPattern(newPattern);
        setPlayerSeq([]);
        setStrikes(0);
        setScore(0);
        setPlaying(true);
        setResultModal(null);
        setPauseModal(false);
        playSequence(newPattern);
    }

    const [playerSeq, setPlayerSeq] = useState([]);

    function handleCellPress(index) {
        if (!allowRef.current || pausedRef.current) return;
        playSound(SOUND_URLS[CELLS[index].soundKey]);
        lightUp(index);

        const current = [...playerRef.current, index];
        playerRef.current = current;
        setPlayerSeq([...current]);

        const pos = current.length - 1;
        if (patternRef.current[pos] !== index) {
            strikesRef.current += 1;
            setStrikes(strikesRef.current);
            if (strikesRef.current >= MAX_STRIKES) {
                playSound(SOUND_URLS.gameOver);
                setPlaying(false);
                if (scoreRef.current > bestScore) {
                    setBestScore(scoreRef.current);
                    saveBestScore(scoreRef.current);
                    logGameScore(activeChild.id, 'simon', scoreRef.current, null);
                }
                else {
                    logGameScore(activeChild.id, 'simon', scoreRef.current, null);
                }
                setResultModal('lose');
                return;
            }
            setStatus(`❌ Wrong! ${MAX_STRIKES - strikesRef.current} chance${MAX_STRIKES - strikesRef.current === 1 ? '' : 's'} left`);
            playerRef.current = [];
            setPlayerSeq([]);
            setTimeout(() => { if (!pausedRef.current) playSequence(patternRef.current); }, 1400);
            return;
        }

        if (current.length === patternRef.current.length) {
            const newScore = scoreRef.current + 1;
            scoreRef.current = newScore;
            setScore(newScore);
            showPraise(randomPraise());
            playSound(SOUND_URLS.success);
            playerRef.current = [];
            setPlayerSeq([]);
            const newPattern = addToPattern(patternRef.current);
            patternRef.current = newPattern;
            setPattern([...newPattern]);
            setTimeout(() => { if (!pausedRef.current) playSequence(newPattern); }, 1000);
        }
    }

    function handlePause() {
        pausedRef.current = true;
        allowRef.current = false;
        setAllowInput(false);
        setPauseModal(true);
    }

    function handleResume() {
        pausedRef.current = false;
        setPauseModal(false);
        playSequence(patternRef.current);
    }

    function handleRestart() {
        setPauseModal(false);
        setResultModal(null);
        setTimeout(startGame, 200);
    }

    const cellSize = Math.floor((W - 48 - 16) / 3);

    return (
        <SafeAreaView style={st.screen}>
            <View style={st.header}>
                <TouchableOpacity style={st.backBtn} onPress={() => pauseModal ? setExitConfirm(true) : onBack()} activeOpacity={0.6}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: C.dark }}>←</Text>
                </TouchableOpacity>
                <Text style={st.headerTitle}>Memory Lights 💡</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Score row */}
            <View style={st.scoreRow}>
                <TouchableOpacity style={st.pauseBtn} onPress={playing ? handlePause : undefined}>
                    {playing ? <Text style={{ fontSize: 20 }}>⏸️</Text> : <View style={{ width: 20 }} />}
                </TouchableOpacity>
                <View style={st.scorePill}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                    <Text style={st.scoreText}>{score}</Text>
                </View>
                <View style={st.scorePill}>
                    <Text style={{ fontSize: 16 }}>⭐</Text>
                    <Text style={st.scoreText}>Best: {bestScore}</Text>
                </View>
                <Text style={[st.statusText, { flex: 1 }]}>{status}</Text>
                <View style={st.strikeRow}>
                    {Array.from({ length: MAX_STRIKES }).map((_, i) => (
                        <View key={i} style={[st.strikeDot, i < strikes && st.strikeDotFilled]} />
                    ))}
                </View>
            </View>

            {/* Praise popup */}
            <Animated.View style={[st.praisePopup, {
                opacity: praiseAnim,
                transform: [{ scale: praiseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }]} pointerEvents="none">
                <Text style={st.praiseText}>{praiseText}</Text>
            </Animated.View>

            {/* 3x3 Grid */}
            <View style={st.simonGrid}>
                {CELLS.map((cell, i) => {
                    const isLit = litCell === i;
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => handleCellPress(i)}
                            activeOpacity={0.8}
                            style={[
                                st.simonCell,
                                { width: cellSize, height: cellSize, backgroundColor: isLit ? cell.litColor : cell.color },
                                isLit && st.simonCellLit,
                            ]}
                        >
                            <Text style={{ fontSize: cellSize * 0.45, color: isLit ? cell.color : 'rgba(255,255,255,0.9)' }}>{cell.shape}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {!playing && (
                <TouchableOpacity style={st.startBtn} onPress={startGame}>
                    <Text style={{ fontSize: 22 }}>▶️</Text>
                    <Text style={st.startBtnText}>Start Game</Text>
                </TouchableOpacity>
            )}

            <GameModal
                visible={pauseModal}
                emoji="⏸️"
                title="Game Paused"
                sub={`Score: ${score} · Best: ${bestScore}`}
                primaryLabel="Resume"
                primaryAction={handleResume}
                secondaryLabel="Restart"
                secondaryAction={handleRestart}
            />
            <GameModal
                visible={exitConfirm}
                emoji="👋"
                title="Exit Game?"
                sub="Your progress will be saved"
                primaryLabel="Exit & Save"
                primaryAction={onBack}
                secondaryLabel="Cancel"
                secondaryAction={() => setExitConfirm(false)}
            />
            <GameModal
                visible={!!resultModal}
                emoji="😅"
                title="Game Over!"
                sub={`You scored ${score}! ${score >= bestScore ? '🏆 New best!' : `Best is ${bestScore}`}`}
                primaryLabel="Play Again"
                primaryAction={handleRestart}
                secondaryLabel="Back"
                secondaryAction={onBack}
            />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX THE SENTENCE
// ─────────────────────────────────────────────────────────────────────────────
function FixGame({ onBack }) {
    const { activeChild } = useApp();
    const [pool, setPool] = useState(() => shuffle(FIX_SENTENCES));
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pauseModal, setPauseModal] = useState(false);
    const [praiseText, setPraiseText] = useState('');
    const [starVisible, setStarVisible] = useState(false);
    const totalRef = useRef(0);
    const correctRef = useRef(0);
    const praiseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        async function load() {
            const questions = await fetchGeminiQuestions('fix', activeChild);
            if (questions) setPool(shuffle(questions));
            setLoading(false);
        }
        load();
    }, []);

    // Save score on unmount
    useEffect(() => {
        return () => {
            if (correctRef.current > 0) {
                const accuracy = Math.round((correctRef.current / totalRef.current) * 100);
                logGameScore(activeChild.id, 'fix', correctRef.current, accuracy);
            }
        };
    }, []);

    if (loading) return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
            <ActivityIndicator size="large" color={C.purple} />
            <Text style={{ marginTop: 12, color: C.muted, fontSize: 14 }}>
                Gemini is creating questions for {activeChild?.name}...
            </Text>
        </View>
    );

    const question = pool[index % pool.length];

    function showPraise(text) {
        setPraiseText(text);
        praiseAnim.setValue(0);
        Animated.sequence([
            Animated.spring(praiseAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
            Animated.delay(800),
            Animated.timing(praiseAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }

    function handleAnswer(option) {
        if (selected) return;
        setSelected(option);
        const correct = option === question.correct;
        
        totalRef.current += 1;
        if (correct) correctRef.current += 1;

        // Log every 5 questions so data saves periodically
        if (totalRef.current % 5 === 0) {
            const accuracy = Math.round((correctRef.current / totalRef.current) * 100);
            logGameScore(activeChild.id, 'fix', correctRef.current, accuracy);
        }

        if (correct) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            setScore(s => s + 1);
            showPraise(randomPraise());
            playSound(SOUND_URLS.success);
            Speech.speak(randomPraise().replace('!', ''), { rate: 0.9 });
            if (newStreak > 0 && newStreak % 3 === 0) setStarVisible(true);
        } else {
            setStreak(0);
            playSound(SOUND_URLS.gameOver);
            Speech.speak(`The correct answer is: ${question.correct}`, { rate: 0.85 });
        }
        setTimeout(() => { setSelected(null); setIndex(i => i + 1); setStarVisible(false); }, 1400);
    }

    const OPTION_COLORS = ['#FFE8E2', '#EDE9FF', '#D4F4E2', '#E4F4FF'];
    const OPTION_BORDERS = ['#FF7757', '#7C6AF7', '#52C788', '#64B5F6'];
    const OPTION_TEXT = ['#8B2500', '#3D00C8', '#1B5E3B', '#0D47A1'];

    return (
        <SafeAreaView style={st.screen}>
            <View style={st.header}>
                <TouchableOpacity style={st.backBtn} onPress={onBack} disabled={pauseModal} activeOpacity={pauseModal ? 0.5 : 0.6}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: pauseModal ? C.inactive : C.dark }}>←</Text>
                </TouchableOpacity>
                <Text style={st.headerTitle}>Fix It! ✏️</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={st.scoreRow}>
                <TouchableOpacity style={st.pauseBtn} onPress={() => setPauseModal(true)}>
                    <Text style={{ fontSize: 20 }}>⏸️</Text>
                </TouchableOpacity>
                <View style={st.scorePill}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                    <Text style={st.scoreText}>{score}</Text>
                </View>
                {streak >= 3 && (
                    <View style={[st.scorePill, { backgroundColor: '#FFE8E2' }]}>
                        <Text style={{ fontSize: 14 }}>⚡</Text>
                        <Text style={[st.scoreText, { color: C.coral }]}>{streak} streak!</Text>
                    </View>
                )}
            </View>

            {/* Praise popup */}
            <Animated.View style={[st.praisePopup, {
                opacity: praiseAnim,
                transform: [{ scale: praiseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }]} pointerEvents="none">
                <Text style={st.praiseText}>{praiseText}</Text>
            </Animated.View>

            {/* Star popup on streak */}
            {starVisible && (
                <View style={st.starPopup}>
                    <Text style={st.starPopupText}>⭐⭐⭐ STREAK!</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={st.gameContent} showsVerticalScrollIndicator={false}>
                <Text style={st.questionLabel}>What's wrong with this sentence?</Text>
                <View style={st.wrongCard}>
                    <Text style={st.wrongCardEmoji}>❌</Text>
                    <Text style={st.wrongCardText}>{question.wrong}</Text>
                </View>

                <Text style={st.questionLabel}>Pick the correct version:</Text>
                {question.options.map((option, i) => {
                    const isCorrect = option === question.correct;
                    const isSelected = selected === option;
                    let bg = OPTION_COLORS[i % OPTION_COLORS.length];
                    let border = OPTION_BORDERS[i % OPTION_BORDERS.length];
                    let txtClr = OPTION_TEXT[i % OPTION_TEXT.length];
                    if (isSelected && isCorrect) { bg = '#D4F4E2'; border = C.mint; txtClr = '#1B5E3B'; }
                    if (isSelected && !isCorrect) { bg = '#FFE8E2'; border = C.coral; txtClr = '#8B2500'; }
                    if (selected && !isSelected && isCorrect) { bg = '#D4F4E2'; border = C.mint; txtClr = '#1B5E3B'; }
                    return (
                        <TouchableOpacity
                            key={i}
                            style={[st.optionCard, { backgroundColor: bg, borderColor: border }]}
                            onPress={() => handleAnswer(option)}
                            disabled={!!selected}
                            activeOpacity={0.8}
                        >
                            <Text style={[st.optionText, { color: txtClr }]}>{option}</Text>
                            {isSelected && isCorrect && <Text style={{ fontSize: 20 }}>✅</Text>}
                            {isSelected && !isCorrect && <Text style={{ fontSize: 20 }}>❌</Text>}
                            {selected && !isSelected && isCorrect && <Text style={{ fontSize: 20 }}>✅</Text>}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <GameModal
                visible={pauseModal}
                emoji="⏸️"
                title="Game Paused"
                sub={`Score: ${score} · Streak: ${streak}`}
                primaryLabel="Resume"
                primaryAction={() => setPauseModal(false)}
                secondaryLabel="Restart"
                secondaryAction={() => { setIndex(0); setScore(0); setStreak(0); setSelected(null); setPauseModal(false); }}
            />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT COMES NEXT
// ─────────────────────────────────────────────────────────────────────────────
function SequenceGame({ onBack }) {
    const { activeChild } = useApp();
    const [pool, setPool] = useState(() => shuffle(SEQUENCES));
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [pauseModal, setPauseModal] = useState(false);
    const [starVisible, setStarVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const praiseAnim = useRef(new Animated.Value(0)).current;
    const [praiseText, setPraiseText] = useState('');
    const totalRef = useRef(0);
    const correctRef = useRef(0);

    useEffect(() => {
        async function load() {
            const questions = await fetchGeminiQuestions('sequence', activeChild);
            if (questions) setPool(shuffle(questions));
            setLoading(false);
        }
        load();
    }, []);

    // Save score on unmount
    useEffect(() => {
        return () => {
            if (correctRef.current > 0) {
                const accuracy = Math.round((correctRef.current / totalRef.current) * 100);
                logGameScore(activeChild.id, 'sequence', correctRef.current, accuracy);
            }
        };
    }, []);

    if (loading) return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
            <ActivityIndicator size="large" color={C.purple} />
            <Text style={{ marginTop: 12, color: C.muted, fontSize: 14 }}>
                Gemini is creating sequences for {activeChild?.name}...
            </Text>
        </View>
    );

    const question = pool[index % pool.length];

    function showPraise(text) {
        setPraiseText(text);
        praiseAnim.setValue(0);
        Animated.sequence([
            Animated.spring(praiseAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
            Animated.delay(800),
            Animated.timing(praiseAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }

    function handleAnswer(option) {
        if (selected) return;
        setSelected(option);
        const correct = option === question.answer;
        
        totalRef.current += 1;
        if (correct) correctRef.current += 1;
        
        if (correct) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            setScore(s => s + 1);
            showPraise(randomPraise());
            playSound(SOUND_URLS.success);
            Speech.speak(randomPraise().replace('!', ''), { rate: 0.9 });
            if (newStreak > 0 && newStreak % 3 === 0) setStarVisible(true);
        } else {
            setStreak(0);
            playSound(SOUND_URLS.gameOver);
            Speech.speak(`The answer is ${question.answer}`, { rate: 0.85 });
        }
        
        if (totalRef.current % 5 === 0) {
            const accuracy = Math.round((correctRef.current / totalRef.current) * 100);
            logGameScore(activeChild.id, 'sequence', correctRef.current, accuracy);
        }
        
        setTimeout(() => { setSelected(null); setIndex(i => i + 1); setStarVisible(false); }, 1400);
    }

    const OPTION_COLORS = [
        { bg: '#FFF3C4', border: '#FFD166', text: '#7A5C00' },
        { bg: '#EDE9FF', border: '#7C6AF7', text: '#3D00C8' },
        { bg: '#D4F4E2', border: '#52C788', text: '#1B5E3B' },
        { bg: '#FFE8E2', border: '#FF7757', text: '#8B2500' },
    ];

    return (
        <SafeAreaView style={st.screen}>
            <View style={st.header}>
                <TouchableOpacity style={st.backBtn} onPress={onBack} disabled={pauseModal} activeOpacity={pauseModal ? 0.5 : 0.6}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: pauseModal ? C.inactive : C.dark }}>←</Text>
                </TouchableOpacity>
                <Text style={st.headerTitle}>What's Next? 🔮</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={st.scoreRow}>
                <TouchableOpacity style={st.pauseBtn} onPress={() => setPauseModal(true)}>
                    <Text style={{ fontSize: 20 }}>⏸️</Text>
                </TouchableOpacity>
                <View style={st.scorePill}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                    <Text style={st.scoreText}>{score}</Text>
                </View>
                <View style={[st.scorePill, { backgroundColor: question ? '#E4F4FF' : C.completed }]}>
                    <Text style={{ fontSize: 14 }}>{question?.emoji}</Text>
                    <Text style={[st.scoreText, { color: '#0D47A1' }]}>{question?.category}</Text>
                </View>
                {streak >= 3 && (
                    <View style={[st.scorePill, { backgroundColor: '#FFE8E2' }]}>
                        <Text style={{ fontSize: 14 }}>⚡</Text>
                        <Text style={[st.scoreText, { color: C.coral }]}>{streak} streak!</Text>
                    </View>
                )}
            </View>

            {/* Praise popup */}
            <Animated.View style={[st.praisePopup, {
                opacity: praiseAnim,
                transform: [{ scale: praiseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }]} pointerEvents="none">
                <Text style={st.praiseText}>{praiseText}</Text>
            </Animated.View>

            {starVisible && (
                <View style={st.starPopup}>
                    <Text style={st.starPopupText}>⭐⭐⭐ STREAK!</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={st.gameContent} showsVerticalScrollIndicator={false}>
                <Text style={st.questionLabel}>What comes next?</Text>

                <View style={st.sequenceCard}>
                    <Text style={st.sequenceEmoji}>{question?.emoji}</Text>
                    <Text style={st.sequenceText}>{question?.prompt}</Text>
                </View>

                <View style={st.optionsGrid}>
                    {question?.options.map((option, i) => {
                        const colors = OPTION_COLORS[i % OPTION_COLORS.length];
                        const isCorrect = option === question.answer;
                        const isSelected = selected === option;
                        let bg = colors.bg, border = colors.border, txtClr = colors.text;
                        if (isSelected && isCorrect) { bg = '#D4F4E2'; border = C.mint; txtClr = '#1B5E3B'; }
                        if (isSelected && !isCorrect) { bg = '#FFE8E2'; border = C.coral; txtClr = '#8B2500'; }
                        if (selected && !isSelected && isCorrect) { bg = '#D4F4E2'; border = C.mint; txtClr = '#1B5E3B'; }
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[st.optionCardSquare, { backgroundColor: bg, borderColor: border }]}
                                onPress={() => handleAnswer(option)}
                                disabled={!!selected}
                                activeOpacity={0.8}
                            >
                                <Text style={[st.optionTextSquare, { color: txtClr }]}>{option}</Text>
                                {isSelected && isCorrect && <Text style={{ fontSize: 18 }}>✅</Text>}
                                {isSelected && !isCorrect && <Text style={{ fontSize: 18 }}>❌</Text>}
                                {selected && !isSelected && isCorrect && <Text style={{ fontSize: 18 }}>✅</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <GameModal
                visible={pauseModal}
                emoji="⏸️"
                title="Game Paused"
                sub={`Score: ${score} · Streak: ${streak}`}
                primaryLabel="Resume"
                primaryAction={() => setPauseModal(false)}
                secondaryLabel="Restart"
                secondaryAction={() => { setIndex(0); setScore(0); setStreak(0); setSelected(null); setPauseModal(false); }}
            />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED GAME MODAL
// ─────────────────────────────────────────────────────────────────────────────
function GameModal({ visible, emoji, title, sub, primaryLabel, primaryAction, secondaryLabel, secondaryAction }) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    useEffect(() => {
        if (visible) Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
        else scaleAnim.setValue(0.8);
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={st.modalOverlay}>
                <Animated.View style={[st.gameModal, { transform: [{ scale: scaleAnim }] }]}>
                    <Text style={st.gameModalEmoji}>{emoji}</Text>
                    <Text style={st.gameModalTitle}>{title}</Text>
                    <Text style={st.gameModalSub}>{sub}</Text>
                    <TouchableOpacity style={st.gameModalPrimary} onPress={primaryAction}>
                        <Text style={st.gameModalPrimaryText}>{primaryLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.gameModalSecondary} onPress={secondaryAction}>
                        <Text style={st.gameModalSecondaryText}>{secondaryLabel}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.white, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    pauseBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.white, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: C.dark },

    // Hub
    hubContent: { padding: 20, gap: 16, paddingTop: 8 },
    hubSub: { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 4, fontWeight: '500' },
    gameCard: {
        backgroundColor: C.white, borderRadius: 22, borderWidth: 2,
        flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    gameCardIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    gameCardEmoji: { fontSize: 36 },
    gameCardText: { flex: 1, gap: 4 },
    gameCardTitle: { fontSize: 18, fontWeight: '800' },
    gameCardSub: { fontSize: 13, color: C.muted, fontWeight: '500' },
    gameCardArrow: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    // Score
    scoreRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexWrap: 'wrap' },
    scorePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: C.completed, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    scoreText: { fontSize: 13, fontWeight: '800', color: C.purple },
    statusText: { fontSize: 13, color: C.muted, textAlign: 'center', fontWeight: '500' },
    streakPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFE8E2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    },
    strikeRow: { flexDirection: 'row', gap: 6 },
    strikeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.inactive },
    strikeDotFilled: { backgroundColor: C.coral },

    // Praise
    praisePopup: {
        position: 'absolute', top: '30%', alignSelf: 'center',
        backgroundColor: C.gold, borderRadius: 20,
        paddingVertical: 14, paddingHorizontal: 28, zIndex: 100,
        shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
    },
    praiseText: { fontSize: 24, fontWeight: '900', color: C.dark, letterSpacing: 0.5 },
    starPopup: {
        alignSelf: 'center', backgroundColor: C.purple, borderRadius: 16,
        paddingVertical: 10, paddingHorizontal: 20, marginVertical: 4,
    },
    starPopupText: { fontSize: 16, fontWeight: '800', color: C.white },

    // Simon
    simonGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16,
        gap: 8, justifyContent: 'center', marginTop: 12,
    },
    simonCell: {
        borderRadius: 20, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    },
    simonCellLit: { shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
    startBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.purple, borderRadius: 18,
        paddingVertical: 18, paddingHorizontal: 40,
        alignSelf: 'center', marginTop: 28,
        shadowColor: C.purple, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    startBtnText: { color: C.white, fontSize: 18, fontWeight: '800' },

    // Game content
    gameContent: { padding: 20, gap: 14, paddingBottom: 40 },
    questionLabel: { fontSize: 15, fontWeight: '700', color: C.muted, textAlign: 'center' },
    wrongCard: {
        backgroundColor: '#FFF0ED', borderRadius: 20, padding: 22,
        borderWidth: 2.5, borderColor: C.coral, alignItems: 'center', gap: 8,
    },
    wrongCardEmoji: { fontSize: 28 },
    wrongCardText: { fontSize: 20, fontWeight: '800', color: C.coral, textAlign: 'center', lineHeight: 28 },
    sequenceCard: {
        backgroundColor: C.completed, borderRadius: 20, padding: 22,
        borderWidth: 2.5, borderColor: C.purple, alignItems: 'center', gap: 8,
    },
    sequenceEmoji: { fontSize: 36 },
    sequenceText: { fontSize: 20, fontWeight: '800', color: C.purple, textAlign: 'center', lineHeight: 28 },

    optionCard: {
        backgroundColor: C.white, borderRadius: 18, padding: 18,
        borderWidth: 2.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
        minHeight: 64,
    },
    optionText: { fontSize: 16, fontWeight: '700', flex: 1 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    optionCardSquare: {
        width: (W - 54) / 2, backgroundColor: C.white,
        borderRadius: 18, padding: 18, borderWidth: 2.5,
        alignItems: 'center', justifyContent: 'center', minHeight: 90, gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    optionTextSquare: { fontSize: 15, fontWeight: '800', textAlign: 'center' },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    gameModal: {
        backgroundColor: C.white, borderRadius: 28, padding: 32,
        width: '100%', alignItems: 'center', gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.2, shadowRadius: 36, elevation: 18,
    },
    gameModalEmoji: { fontSize: 60, marginBottom: 4 },
    gameModalTitle: { fontSize: 26, fontWeight: '900', color: C.dark },
    gameModalSub: { fontSize: 15, color: C.muted, marginBottom: 8, textAlign: 'center' },
    gameModalPrimary: {
        backgroundColor: C.purple, borderRadius: 16, paddingVertical: 16,
        width: '100%', alignItems: 'center',
        shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    gameModalPrimaryText: { color: C.white, fontSize: 17, fontWeight: '800' },
    gameModalSecondary: {
        borderWidth: 2, borderColor: C.inactive, borderRadius: 16,
        paddingVertical: 14, width: '100%', alignItems: 'center',
    },
    gameModalSecondaryText: { color: C.muted, fontSize: 15, fontWeight: '600' },
});