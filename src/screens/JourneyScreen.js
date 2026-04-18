// src/screens/JourneyScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Animated, Dimensions, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import * as Speech from 'expo-speech';
import {
    Sun, ForkKnife, GameController, Wind, BookOpen, Tree,
    UsersThree, Moon, Tooth, MusicNote, Bathtub, Trash,
    HandWaving, Star, Heart, ArrowLeft, Lock,
} from 'phosphor-react-native';
import { supabase } from '../lib/supabase';
import { useApp, buildChildContext } from '../context/AppContext';
import { enqueueAction } from '../lib/offlineQueue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
    purple: '#7C6AF7',
    coral: '#FF7757',
    bg: '#F9F7FF',
    completed: '#EDE9FF',
    dark: '#3D3D3D',
    muted: '#9E9E9E',
    inactive: '#C4C4C4',
    white: '#fff',
    gold: '#FFD166',
};

// Each step type: icon component, accent color, icon background tint
const STEP_CONFIG = {
    wake_up: { icon: Sun, color: '#FFD166', tint: '#FFF3C4', defaultLabel: 'Wake Up' },
    eat: { icon: ForkKnife, color: '#FF7757', tint: '#FFE8E2', defaultLabel: 'Eat' },
    play: { icon: GameController, color: '#7C6AF7', tint: '#EDE9FF', defaultLabel: 'Play' },
    outside: { icon: Tree, color: '#52C788', tint: '#D4F4E2', defaultLabel: 'Outside' },
    calm: { icon: Wind, color: '#64B5F6', tint: '#E4F4FF', defaultLabel: 'Calm Time' },
    learn: { icon: BookOpen, color: '#7C6AF7', tint: '#EDE9FF', defaultLabel: 'Learn' },
    social: { icon: UsersThree, color: '#FF7757', tint: '#FFE8E2', defaultLabel: 'Social Time' },
    bedtime: { icon: Moon, color: '#9B8FF7', tint: '#ECE9FF', defaultLabel: 'Bedtime' },
    hygiene: { icon: Tooth, color: '#26C6DA', tint: '#D4F4FF', defaultLabel: 'Hygiene' },
    music: { icon: MusicNote, color: '#FFD166', tint: '#FFF3C4', defaultLabel: 'Music' },
    bath: { icon: Bathtub, color: '#64B5F6', tint: '#E4F4FF', defaultLabel: 'Bath Time' },
    chores: { icon: Trash, color: '#81C784', tint: '#E4FFE8', defaultLabel: 'Chores' },
    greeting: { icon: HandWaving, color: '#FF7757', tint: '#FFE8E2', defaultLabel: 'Greeting' },
    default: { icon: Star, color: '#FFD166', tint: '#FFF3C4', defaultLabel: 'Activity' },
};

const DEMO_ROUTINE = [
    { id: '1', label: 'Good Morning!', description: 'Wake up and stretch your arms wide', type: 'wake_up', completed: false },
    { id: '2', label: 'Brush Your Teeth', description: 'Two minutes, nice and clean', type: 'hygiene', completed: false },
    { id: '3', label: 'Breakfast Time', description: 'Eat something yummy and healthy', type: 'eat', completed: false },
    { id: '4', label: 'Learning Time', description: "Let's explore something new today", type: 'learn', completed: false },
    { id: '5', label: 'Outside Play', description: 'Fresh air and sunshine feel amazing', type: 'outside', completed: false },
    { id: '6', label: 'Calm Break', description: 'Breathe slowly and rest your body', type: 'calm', completed: false },
    { id: '7', label: 'Bedtime', description: 'Great day! Time to rest and dream', type: 'bedtime', completed: false },
];

const CAREGIVER_PIN = '1234';
const DRUM_ITEM_H = 44;

function DrumPicker({ items, selected, onSelect }) {
    const scrollRef = useRef(null);
    const selectedIndex = items.indexOf(selected);

    useEffect(() => {
        if (scrollRef.current && selectedIndex >= 0) {
            scrollRef.current.scrollTo({ y: selectedIndex * DRUM_ITEM_H, animated: false });
        }
    }, []);

    function handleScroll(e) {
        const index = Math.round(e.nativeEvent.contentOffset.y / DRUM_ITEM_H);
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        onSelect(items[clamped]);
    }

    return (
        <View style={st.drum}>
            {/* Selection highlight bar */}
            <View style={st.drumHighlight} pointerEvents="none" />
            <ScrollView
                ref={scrollRef}
                style={{ height: DRUM_ITEM_H * 3, zIndex: 1 }}
                showsVerticalScrollIndicator={false}
                snapToInterval={DRUM_ITEM_H}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                contentContainerStyle={{ paddingVertical: DRUM_ITEM_H }}
            >
                {items.map((item) => (
                    <View key={item} style={st.drumItem}>
                        <Text style={[
                            st.drumItemText,
                            item === selected && st.drumItemSelected,
                        ]}>
                            {item}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

export default function JourneyScreen({ onClose }) {
    const { activeChild } = useApp();

    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [routineId, setRoutineId] = useState(null);
    const [pinVisible, setPinVisible] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [geminiVisible, setGeminiVisible] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [generating, setGenerating] = useState(false);
    const [builderMode, setBuilderMode]       = useState('choose');  // 'choose' | 'ai' | 'manual' | 'edit'
    const [manualSteps, setManualSteps]       = useState([]);
    const [editingStep, setEditingStep]       = useState(null);      // index being edited, or null
    const [editingField, setEditingField]     = useState(null);      // 'label' | 'time' | 'description'
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [selectedHour, setSelectedHour] = useState('08');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const [selectedAmPm, setSelectedAmPm] = useState('AM');
    const [allDone, setAllDone] = useState(false);

    // ───────────────────────────────────────────────────────────────────────
    // STEP 1 — Potty + Health Log State Variables
    // ───────────────────────────────────────────────────────────────────────
    const [pottyEnabled, setPottyEnabled]     = useState(false);
    const [pottyLogs, setPottyLogs]           = useState([]);
    const [healthLogs, setHealthLogs]         = useState([]);
    const [loggingPotty, setLoggingPotty]     = useState(false);
    const [loggingHealth, setLoggingHealth]   = useState(false);
    const [healthModalVisible, setHealthModalVisible] = useState(false);
    const [healthType, setHealthType]         = useState('sickness');
    const [healthDesc, setHealthDesc]         = useState('');
    const [healthSeverity, setHealthSeverity] = useState(1);
    const [pottyModalVisible, setPottyModalVisible] = useState(false);
    const [pottyTypeToLog, setPottyTypeToLog] = useState(null);
    const [pottyHour, setPottyHour] = useState('12');
    const [pottyMinute, setPottyMinute] = useState('00');
    const [pottyAmPm, setPottyAmPm] = useState('PM');
    const [healthLogHour, setHealthLogHour] = useState('12');
    const [healthLogMinute, setHealthLogMinute] = useState('00');
    const [healthLogAmPm, setHealthLogAmPm] = useState('PM');
    const [healthTimePickerVisible, setHealthTimePickerVisible] = useState(false);
    const [editingPottyLog, setEditingPottyLog] = useState(null);
    const [editPottyHour, setEditPottyHour] = useState('12');
    const [editPottyMinute, setEditPottyMinute] = useState('00');
    const [editPottyAmPm, setEditPottyAmPm] = useState('PM');
    const [editingHealthLog, setEditingHealthLog] = useState(null);
    const [editHealthDesc, setEditHealthDesc] = useState('');
    const [editHealthType, setEditHealthType] = useState('sickness');
    const [editHealthSeverity, setEditHealthSeverity] = useState(1);
    const [editHealthHour, setEditHealthHour] = useState('12');
    const [editHealthMinute, setEditHealthMinute] = useState('00');
    const [editHealthPeriod, setEditHealthPeriod] = useState('PM');
    const [savingEdit, setSavingEdit] = useState(false);

    const celebAnim = useRef(new Animated.Value(0)).current;
    const headerFade = useRef(new Animated.Value(0)).current;
    const [headerSvg, setHeaderSvg] = useState(null);

    useEffect(() => { 
        // ──────────────────────────────────────────────────────────────────────────────
        // STEP 3 — Load potty and health logs on mount
        // ──────────────────────────────────────────────────────────────────────────────
        loadHeader(); 
        fetchRoutine(); 
        loadPottyStatus();
        loadTodayLogs();
    }, [activeChild]);

    async function loadHeader() {
        try {
            const mod = require('../assets/illustrations/nature/Forest-pana.svg');
            const xml = await FileSystem.readAsStringAsync(mod.uri || mod, { encoding: FileSystem.EncodingType.UTF8 });
            setHeaderSvg(xml);
            Animated.timing(headerFade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
        } catch (_) { }
    }

    async function fetchRoutine() {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        try {
            const { data } = await supabase
                .from('routine').select('*')
                .eq('child_id', activeChild.id).eq('date', today).single();
            if (data?.steps?.length) { setRoutineId(data.id); setSteps(data.steps); }
            else setSteps(DEMO_ROUTINE);
        } catch (_) { setSteps(DEMO_ROUTINE); }
        setLoading(false);
    }

    async function toggleStep(stepId, newValue) {
        const updated = steps.map(s => s.id === stepId ? { ...s, completed: newValue } : s);
        setSteps(updated);

        const done = updated.every(s => s.completed);
        if (done && !allDone) {
            setTimeout(() => {
                setAllDone(true);
                Animated.spring(celebAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
            }, 400);
        }
        if (!done) { setAllDone(false); celebAnim.setValue(0); }

        if (!routineId) return;
        const net = await Network.getNetworkStateAsync();
        const payload = { steps: updated };
        if (net.isConnected && net.isInternetReachable) {
            const { error } = await supabase.from('routine').update(payload).eq('id', routineId);
            if (error) await enqueueAction({ type: 'UPDATE', table: 'routine', id: routineId, payload });
        } else {
            await enqueueAction({ type: 'UPDATE', table: 'routine', id: routineId, payload });
        }
    }

    function openCaregiver() {
        setPinInput('');
        setPinError(false);
        setBuilderMode('choose');
        setManualSteps([]);
        setEditingStep(null);
        setEditingField(null);
        setPinVisible(true);
    }

    function enterEditMode() {
        // Load current steps into the manual editor so they can edit them
        const stepsToEdit = steps.map(s => ({ ...s, completed: false })); // Don't carry over completion status
        setManualSteps(stepsToEdit);
        setBuilderMode('edit');
    }

    function enterManualMode() {
        // Load existing steps so user can ADD to routine (not replace it)
        const existingSteps = steps.map(s => ({ ...s, completed: false }));
        setManualSteps(existingSteps);
        setBuilderMode('manual');
    }

    function submitPin() {
        if (pinInput === CAREGIVER_PIN) { setPinVisible(false); setGeminiVisible(true); }
        else { setPinError(true); setPinInput(''); }
    }

    function addManualStep(type) {
        const cfg = STEP_CONFIG[type] || STEP_CONFIG.default;
        setManualSteps(prev => [
            ...prev,
            { id: Date.now().toString(), label: cfg.defaultLabel || type, description: '', type, completed: false, time: '' },
        ]);
    }

    function updateManualStep(index, field, value) {
        setManualSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    }

    function removeManualStep(index) {
        setManualSteps(prev => prev.filter((_, i) => i !== index));
    }

    function moveStepUp(index) {
        if (index === 0) return; // Can't move first step up
        setManualSteps(prev => {
            const updated = [...prev];
            [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
            return updated;
        });
    }

    function moveStepDown(index) {
        if (index === manualSteps.length - 1) return; // Can't move last step down
        setManualSteps(prev => {
            const updated = [...prev];
            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
            return updated;
        });
    }

    function openTimePicker(index) {
        const step = manualSteps[index];
        if (step.time) {
            // Parse existing time (e.g., "8:30 AM")
            const parts = step.time.split(' ');
            const timeParts = parts[0].split(':');
            setSelectedHour(timeParts[0].padStart(2, '0'));
            setSelectedMinute(timeParts[1] || '00');
            setSelectedAmPm(parts[1] || 'AM');
        } else {
            setSelectedHour('08');
            setSelectedMinute('00');
            setSelectedAmPm('AM');
        }
        setEditingStep(index);
        setTimePickerVisible(true);
    }

    function saveTime() {
        const timeStr = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
        if (editingStep !== null) {
            updateManualStep(editingStep, 'time', timeStr);
        }
        setTimePickerVisible(false);
    }

    async function saveManualRoutine() {
        const today = new Date().toISOString().split('T')[0];
        const record = { child_id: activeChild.id, template_id: null, date: today, steps: manualSteps };
        const net = await Network.getNetworkStateAsync();
        if (net.isConnected && net.isInternetReachable) {
            const { data: ins } = await supabase
                .from('routine').upsert(record, { onConflict: 'child_id,date' }).select().single();
            if (ins) setRoutineId(ins.id);
        } else {
            await enqueueAction({ type: 'UPSERT', table: 'routine', payload: record });
        }
        setSteps(manualSteps);
        setAllDone(false);
        celebAnim.setValue(0);
        setManualSteps([]);
        setBuilderMode('choose');
        setEditingStep(null);
        setEditingField(null);
    }

    async function handleGenerate() {
        if (!promptText.trim()) return;
        setGenerating(true);
        try {
            const childContext = buildChildContext(activeChild);
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text:
                                    `You are a routine generator for Roamly, a therapeutic app for nonverbal and autistic children.
${childContext}
Generate a warm, structured daily routine based on: "${promptText}"
Return ONLY a valid JSON array. Each item must have:
- id: unique string
- label: max 3 words, warm and child-friendly (e.g. "Breakfast Time", "Calm Break")
- description: one gentle encouraging sentence (under 10 words)
- type: one of [wake_up, eat, play, outside, calm, learn, social, bedtime, hygiene, music, bath, chores, greeting, default]
- completed: false
Return 4 to 8 steps. No markdown. No explanation. Just the JSON array.`
                            }]
                        }]
                    }),
                }
            );
            const data = await res.json();
            console.log('Gemini raw response:', JSON.stringify(data));
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const generated = JSON.parse(raw.replace(/```json|```/g, '').trim());
            const today = new Date().toISOString().split('T')[0];
            const record = { child_id: activeChild.id, template_id: null, date: today, steps: generated };
            const net = await Network.getNetworkStateAsync();
            if (net.isConnected && net.isInternetReachable) {
                const { data: ins } = await supabase
                    .from('routine').upsert(record, { onConflict: 'child_id,date' }).select().single();
                if (ins) setRoutineId(ins.id);
            }
            setSteps(generated);
            setAllDone(false);
            celebAnim.setValue(0);
            setPromptText('');
            setBuilderMode('choose');
        } catch (e) {
            console.error('Gemini error:', e);
            Alert.alert('Oops', e.message || 'Could not generate the routine.');
        }
        setGenerating(false);
    }

    // ───────────────────────────────────────────────────────────────────────
    // STEP 2 — Potty + Health Log Functions
    // ───────────────────────────────────────────────────────────────────────

    async function loadPottyStatus() {
        try {
            const { data } = await supabase
                .from('child')
                .select('avatar_config')
                .eq('id', activeChild.id)
                .single();
            if (data?.avatar_config?.pottyEnabled) setPottyEnabled(true);
        } catch (_) {}
    }

    async function loadTodayLogs() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const { data: pLogs } = await supabase
                .from('potty_log')
                .select('*')
                .eq('child_id', activeChild.id)
                .eq('date', today)
                .order('logged_at', { ascending: false });
            if (pLogs) setPottyLogs(pLogs);

            const { data: hLogs } = await supabase
                .from('health_log')
                .select('*')
                .eq('child_id', activeChild.id)
                .eq('date', today)
                .order('logged_at', { ascending: false });
            if (hLogs) setHealthLogs(hLogs);
        } catch (_) {}
    }

    async function togglePottyTracking() {
        const next = !pottyEnabled;
        setPottyEnabled(next);
        try {
            const { data } = await supabase
                .from('child')
                .select('avatar_config')
                .eq('id', activeChild.id)
                .single();
            const updated = { ...(data?.avatar_config || {}), pottyEnabled: next };
            await supabase.from('child').update({ avatar_config: updated }).eq('id', activeChild.id);
        } catch (_) {}
    }

    async function logPotty(type, constipation = false) {
        setPottyTypeToLog({ type, constipation });
        // Set default time to current time
        const now = new Date();
        const h = now.getHours() % 12 || 12;
        const m = now.getMinutes();
        setPottyHour(String(h).padStart(2, '0'));
        setPottyMinute(String(m).padStart(2, '0'));
        setPottyAmPm(now.getHours() >= 12 ? 'PM' : 'AM');
        setPottyModalVisible(true);
    }

    async function confirmPottyLog() {
        if (!pottyTypeToLog) return;
        setLoggingPotty(true);
        const today = new Date().toISOString().split('T')[0];
        const timeStr = `${pottyHour}:${pottyMinute} ${pottyAmPm}`;
        const record = {
            child_id: activeChild.id,
            date: today,
            logged_at: new Date().toISOString(),
            type: pottyTypeToLog.type,
            constipation: pottyTypeToLog.constipation,
            time: timeStr,
        };
        try {
            const net = await Network.getNetworkStateAsync();
            if (net.isConnected && net.isInternetReachable) {
                const { data } = await supabase.from('potty_log').insert(record).select().single();
                if (data) setPottyLogs(prev => [data, ...prev]);
            } else {
                await enqueueAction({ type: 'INSERT', table: 'potty_log', payload: record });
                setPottyLogs(prev => [{ ...record, id: Date.now().toString() }, ...prev]);
            }
        } catch (_) {}
        setLoggingPotty(false);
        setPottyModalVisible(false);
        setPottyTypeToLog(null);
    }

    async function openHealthModal() {
        // Set default time to current time
        const now = new Date();
        const h = now.getHours() % 12 || 12;
        const m = now.getMinutes();
        setHealthLogHour(String(h).padStart(2, '0'));
        setHealthLogMinute(String(m).padStart(2, '0'));
        setHealthLogAmPm(now.getHours() >= 12 ? 'PM' : 'AM');
        setHealthModalVisible(true);
    }

    async function logHealth() {
        if (!healthDesc.trim()) return;
        // Set default time to current time
        const now = new Date();
        const h = now.getHours() % 12 || 12;
        const m = now.getMinutes();
        setHealthLogHour(String(h).padStart(2, '0'));
        setHealthLogMinute(String(m).padStart(2, '0'));
        setHealthLogAmPm(now.getHours() >= 12 ? 'PM' : 'AM');
        setHealthTimePickerVisible(true);
    }

    async function confirmHealthLog() {
        if (!healthDesc.trim()) return;
        setLoggingHealth(true);
        const today = new Date().toISOString().split('T')[0];
        const timeStr = `${healthLogHour}:${healthLogMinute} ${healthLogAmPm}`;
        const record = {
            child_id: activeChild.id,
            date: today,
            logged_at: new Date().toISOString(),
            type: healthType,
            description: healthDesc.trim(),
            severity: healthSeverity,
            time: timeStr,
        };
        try {
            const net = await Network.getNetworkStateAsync();
            if (net.isConnected && net.isInternetReachable) {
                const { data } = await supabase.from('health_log').insert(record).select().single();
                if (data) setHealthLogs(prev => [data, ...prev]);
            } else {
                await enqueueAction({ type: 'INSERT', table: 'health_log', payload: record });
                setHealthLogs(prev => [{ ...record, id: Date.now().toString() }, ...prev]);
            }
        } catch (_) {}
        setLoggingHealth(false);
        setHealthDesc('');
        setHealthSeverity(1);
        setHealthModalVisible(false);
        setHealthTimePickerVisible(false);
    }

    async function deletePottyLog(logId) {
        try {
            await supabase.from('potty_log').delete().eq('id', logId);
            setPottyLogs(prev => prev.filter(l => l.id !== logId));
        } catch (_) {}
    }

    async function deleteHealthLog(logId) {
        try {
            await supabase.from('health_log').delete().eq('id', logId);
            setHealthLogs(prev => prev.filter(l => l.id !== logId));
        } catch (_) {}
    }

    async function savePottyEdit() {
        if (!editingPottyLog) return;
        setSavingEdit(true);
        const timeStr = `${editPottyHour}:${editPottyMinute} ${editPottyAmPm}`;
        try {
            await supabase
                .from('potty_log')
                .update({ time: timeStr })
                .eq('id', editingPottyLog.id);
            setPottyLogs(prev => prev.map(l => l.id === editingPottyLog.id ? { ...l, time: timeStr } : l));
            setEditingPottyLog(null);
        } catch (_) {}
        setSavingEdit(false);
    }

    async function saveHealthEdit() {
        if (!editingHealthLog) return;
        setSavingEdit(true);
        const timeStr = `${editHealthHour}:${editHealthMinute} ${editHealthPeriod}`;
        try {
            await supabase
                .from('health_log')
                .update({ 
                    type: editHealthType,
                    description: editHealthDesc.trim(),
                    severity: editHealthSeverity,
                    time: timeStr
                })
                .eq('id', editingHealthLog.id);
            setHealthLogs(prev => prev.map(l => l.id === editingHealthLog.id 
                ? { ...l, type: editHealthType, description: editHealthDesc.trim(), severity: editHealthSeverity, time: timeStr }
                : l
            ));
            setEditingHealthLog(null);
        } catch (_) {}
        setSavingEdit(false);
    }

    const doneCount = steps.filter(s => s.completed).length;
    const pct = steps.length > 0 ? doneCount / steps.length : 0;

    if (loading) return (
        <View style={st.center}>
            <ActivityIndicator size="large" color={C.purple} />
            <Text style={st.loadingText}>Loading your day...</Text>
        </View>
    );

    return (
        <View style={st.screen}>

            {/* ── Header ── */}
            <View style={st.header}>
                {headerSvg && (
                    <Animated.View style={[st.headerArt, { opacity: headerFade }]}>
                        <SvgXml xml={headerSvg} width="100%" height="100%" />
                    </Animated.View>
                )}
                {/* Dark overlay so text is always readable */}
                <View style={st.headerOverlay} />

                <TouchableOpacity style={st.backBtn} onPress={onClose} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                    <ArrowLeft size={22} color={C.white} weight="bold" />
                </TouchableOpacity>

                <View style={st.headerContent}>
                    <Text style={st.headerName}>
                        {activeChild?.name ? `${activeChild.name}'s Day` : 'My Day'}
                    </Text>
                    <View style={st.progressRow}>
                        <View style={st.track}>
                            <View style={[st.fill, { width: `${pct * 100}%` }]} />
                        </View>
                        <Text style={st.progressCount}>{doneCount} of {steps.length}</Text>
                    </View>
                </View>
            </View>

            {/* ── Steps ── */}
            <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

                {allDone && (
                    <Animated.View style={[st.celebrate, {
                        opacity: celebAnim,
                        transform: [{ scale: celebAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                    }]}>
                        <Text style={st.celebEmoji}>🌟</Text>
                        <View>
                            <Text style={st.celebTitle}>Amazing job today!</Text>
                            <Text style={st.celebSub}>You finished everything</Text>
                        </View>
                    </Animated.View>
                )}

                {steps.map((step, i) => (
                    <StepCard
                        key={step.id}
                        step={step}
                        index={i}
                        isLast={i === steps.length - 1}
                        onToggle={toggleStep}
                    />
                ))}

                {/* ──────────────────────────────────────────────────────────────────────────────
                    STEP 4 — Daily Logs (Potty + Health)
                    ────────────────────────────────────────────────────────────────────────────── */}

                {/* Divider */}
                <View style={st.sectionDivider}>
                    <View style={st.sectionDividerLine} />
                    <Text style={st.sectionDividerText}>↓  Daily Logs</Text>
                    <View style={st.sectionDividerLine} />
                </View>

                {/* Potty Tracking Section */}
                <View style={st.logSection}>
                    <View style={st.logSectionHeader}>
                        <Text style={st.logSectionTitle}>🚽 Potty Log</Text>
                        <TouchableOpacity
                            style={[st.toggleBtn, pottyEnabled && st.toggleBtnActive]}
                            onPress={togglePottyTracking}
                        >
                            <Text style={[st.toggleBtnText, pottyEnabled && st.toggleBtnTextActive]}>
                                {pottyEnabled ? 'Enabled' : 'Start Tracking'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {pottyEnabled && (
                        <>
                            {/* Quick log buttons */}
                            <View style={st.pottyBtnRow}>
                                <TouchableOpacity
                                    style={[st.pottyBtn, { backgroundColor: '#FFF3C4' }]}
                                    onPress={() => logPotty('pee')}
                                >
                                    <Text style={st.pottyBtnEmoji}>💧</Text>
                                    <Text style={[st.pottyBtnLabel, { color: '#7A5C00' }]}>Pee</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[st.pottyBtn, { backgroundColor: '#FFE8E2' }]}
                                    onPress={() => logPotty('poop', false)}
                                >
                                    <Text style={st.pottyBtnEmoji}>💩</Text>
                                    <Text style={[st.pottyBtnLabel, { color: '#8B2500' }]}>Poop</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[st.pottyBtn, { backgroundColor: '#EDE9FF' }]}
                                    onPress={() => logPotty('poop', true)}
                                >
                                    <Text style={st.pottyBtnEmoji}>😣</Text>
                                    <Text style={[st.pottyBtnLabel, { color: '#4527A0' }]}>Constipated</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Today's potty log — always visible */}
                    <View style={st.logList}>
                        {pottyLogs.length === 0 ? (
                            <Text style={st.logEmpty}>No potty logs today</Text>
                        ) : (
                            <>
                                <Text style={st.logListTitle}>Today's log</Text>
                                {pottyLogs.map((log) => (
                                    <View key={log.id} style={st.logRow}>
                                        <Text style={st.logRowEmoji}>
                                            {log.type === 'pee' ? '💧' : log.constipation ? '😣' : '💩'}
                                        </Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={st.logRowText}>
                                                {log.type === 'pee' ? 'Pee' : log.constipation ? 'Poop (constipated)' : 'Poop'}
                                            </Text>
                                            <Text style={st.logRowTime}>
                                                {log.time || new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <TouchableOpacity
                                                style={st.logActionBtn}
                                                onPress={() => {
                                                    setEditingPottyLog(log);
                                                    const parts = (log.time || '12:00 PM').split(' ');
                                                    const timeParts = parts[0].split(':');
                                                    setEditPottyHour(timeParts[0].padStart(2, '0'));
                                                    setEditPottyMinute(timeParts[1] || '00');
                                                    setEditPottyAmPm(parts[1] || 'PM');
                                                }}
                                            >
                                                <Text style={st.logActionText}>✏️</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[st.logActionBtn, { backgroundColor: '#FFE8E2' }]}
                                                onPress={() => deletePottyLog(log.id)}
                                            >
                                                <Text style={st.logActionText}>🗑</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                </View>

                {/* Health Log Section */}
                <View style={st.logSection}>
                    <View style={st.logSectionHeader}>
                        <Text style={st.logSectionTitle}>🩺 Health Log</Text>
                        <TouchableOpacity
                            style={st.addHealthBtn}
                            onPress={openHealthModal}
                        >
                            <Text style={st.addHealthBtnText}>＋ Log</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={st.logList}>
                        {healthLogs.length === 0 ? (
                            <Text style={st.logEmpty}>No health events logged today</Text>
                        ) : (
                            <>
                                {healthLogs.map((log) => (
                                    <View key={log.id} style={st.logRow}>
                                        <Text style={st.logRowEmoji}>
                                            {log.type === 'sickness' ? '🤒' : '🩹'}
                                        </Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={st.logRowText}>{log.description}</Text>
                                            <Text style={st.logRowSub}>
                                                {log.type === 'sickness' ? 'Sickness' : 'Injury'} · Severity {log.severity}/3 · {log.time || new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <TouchableOpacity
                                                style={st.logActionBtn}
                                                onPress={() => {
                                                    setEditingHealthLog(log);
                                                    setEditHealthDesc(log.description || '');
                                                    setEditHealthType(log.type || 'sickness');
                                                    setEditHealthSeverity(log.severity || 1);
                                                    const parts = (log.time || '12:00 PM').split(' ');
                                                    const timeParts = parts[0].split(':');
                                                    setEditHealthHour(timeParts[0].padStart(2, '0'));
                                                    setEditHealthMinute(timeParts[1] || '00');
                                                    setEditHealthPeriod(parts[1] || 'PM');
                                                }}
                                            >
                                                <Text style={st.logActionText}>✏️</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[st.logActionBtn, { backgroundColor: '#FFE8E2' }]}
                                                onPress={() => deleteHealthLog(log.id)}
                                            >
                                                <Text style={st.logActionText}>🗑</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                </View>

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── Caregiver bar ── */}
            <View style={st.careBar}>
                <TouchableOpacity style={st.careBtn} onPress={openCaregiver}>
                    <Lock size={14} color={C.white} weight="bold" />
                    <Text style={st.careBtnText}>Build Today's Routine</Text>
                </TouchableOpacity>
            </View>

            {/* ── PIN modal ── */}
            <Modal visible={pinVisible} transparent animationType="fade">
                <View style={st.overlay}>
                    <View style={st.modal}>
                        <Text style={st.modalTitle}>Caregiver Access</Text>
                        <Text style={st.modalSub}>Enter your 4-digit PIN</Text>
                        <TextInput
                            style={[st.pinInput, pinError && { borderColor: C.coral }]}
                            value={pinInput}
                            onChangeText={t => { setPinInput(t); setPinError(false); }}
                            keyboardType="number-pad" secureTextEntry maxLength={4}
                            placeholder="····" placeholderTextColor={C.inactive} autoFocus
                        />
                        {pinError && <Text style={st.pinErr}>Incorrect PIN</Text>}
                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setPinVisible(false)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={st.confirmBtn} onPress={submitPin}>
                                <Text style={st.confirmText}>Enter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Routine builder modal ── */}
            <Modal visible={geminiVisible} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modal, { maxHeight: '88%' }]}>

                        {/* ── Choose mode ── */}
                        {builderMode === 'choose' && (
                            <>
                                <Text style={st.modalTitle}>Build Today's Routine</Text>
                                <Text style={st.modalSub}>How would you like to create it?</Text>
                                
                                <TouchableOpacity style={st.modeBtn} onPress={() => setBuilderMode('ai')}>
                                    <Text style={st.modeBtnEmoji}>✨</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.modeBtnTitle}>Build with AI</Text>
                                        <Text style={st.modeBtnSub}>Describe the day, Roamly creates it</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={st.modeBtn} onPress={enterManualMode}>
                                    <Text style={st.modeBtnEmoji}>🧩</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.modeBtnTitle}>Build Manually</Text>
                                        <Text style={st.modeBtnSub}>Pick steps yourself, add times and labels</Text>
                                    </View>
                                </TouchableOpacity>
                                
                                {steps.length > 0 && (
                                    <TouchableOpacity style={st.modeBtn} onPress={enterEditMode}>
                                        <Text style={st.modeBtnEmoji}>✏️</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={st.modeBtnTitle}>Edit Today's Routine</Text>
                                            <Text style={st.modeBtnSub}>Fix spelling, times, or remove steps</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity style={st.cancelBtn} onPress={() => setGeminiVisible(false)}>
                                    <Text style={st.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── AI mode ── */}
                        {builderMode === 'ai' && (
                            <>
                                <Text style={st.modalTitle}>Build with AI ✨</Text>
                                <Text style={st.modalSub}>Describe the day and Roamly creates the routine</Text>
                                <TextInput
                                    style={st.promptInput}
                                    value={promptText}
                                    onChangeText={setPromptText}
                                    placeholder="e.g. School morning with breakfast, reading time, outdoor recess, and a calm wind-down before bed"
                                    placeholderTextColor={C.muted}
                                    multiline
                                    numberOfLines={3}
                                    autoFocus
                                />
                                <View style={st.modalRow}>
                                    <TouchableOpacity style={st.cancelBtn} onPress={() => setBuilderMode('choose')}>
                                        <Text style={st.cancelText}>← Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[st.confirmBtn, generating && { opacity: 0.6 }]}
                                        onPress={handleGenerate}
                                        disabled={generating}
                                    >
                                        {generating
                                            ? <ActivityIndicator color={C.white} size="small" />
                                            : <Text style={st.confirmText}>Generate</Text>}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* ── Manual mode ── */}
                        {builderMode === 'manual' && (
                            <>
                                <View style={st.modeHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.modalTitle}>Build Manually 🧩</Text>
                                        <Text style={st.modalSub}>Tap a step type to add it, then customise</Text>
                                    </View>
                                    {manualSteps.length > 0 && (
                                        <TouchableOpacity
                                            style={st.clearAllBtn}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Clear All Steps?',
                                                    'This will remove all steps and start fresh. Are you sure?',
                                                    [
                                                        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                                                        {
                                                            text: 'Clear All',
                                                            onPress: () => setManualSteps([]),
                                                            style: 'destructive',
                                                        },
                                                    ]
                                                );
                                            }}
                                        >
                                            <Text style={st.clearAllBtnText}>Clear All</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Icon picker grid */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ marginVertical: 8 }}
                                    contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
                                >
                                    {Object.entries(STEP_CONFIG).filter(([k]) => k !== 'default').map(([key, cfg]) => {
                                        const IconComp = cfg.icon;
                                        return (
                                            <TouchableOpacity
                                                key={key}
                                                style={[st.typeChip, { backgroundColor: cfg.tint }]}
                                                onPress={() => addManualStep(key)}
                                            >
                                                <IconComp size={22} color={cfg.color} weight="duotone" />
                                                <Text style={[st.typeChipLabel, { color: cfg.color }]}>
                                                    {key.replace('_', ' ')}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* Custom type text entry */}
                                <TouchableOpacity
                                    style={[st.typeChip, { backgroundColor: C.completed, alignSelf: 'flex-start' }]}
                                    onPress={() => addManualStep('default')}
                                >
                                    <Text style={{ fontSize: 18 }}>＋</Text>
                                    <Text style={[st.typeChipLabel, { color: C.purple }]}>Custom</Text>
                                </TouchableOpacity>

                                {/* Step list */}
                                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                                    {manualSteps.length === 0 && (
                                        <Text style={{ color: C.muted, textAlign: 'center', marginTop: 12, fontSize: 13 }}>
                                            Tap a step above to add it to the routine
                                        </Text>
                                    )}
                                                    {manualSteps.map((step, i) => {
                                        const cfg = STEP_CONFIG[step.type] || STEP_CONFIG.default;
                                        const IconComp = cfg.icon;
                                        return (
                                            <View key={step.id} style={st.manualStepRow}>
                                                <View style={[st.manualStepIcon, { backgroundColor: cfg.tint }]}>
                                                    <IconComp size={20} color={cfg.color} weight="duotone" />
                                                </View>
                                                <View style={{ flex: 1, gap: 4 }}>
                                                    <TextInput
                                                        style={st.manualLabelInput}
                                                        value={step.label}
                                                        onChangeText={v => updateManualStep(i, 'label', v)}
                                                        placeholder="Step name"
                                                        placeholderTextColor={C.inactive}
                                                    />
                                                    <TouchableOpacity 
                                                        style={st.timePickerBtn}
                                                        onPress={() => openTimePicker(i)}
                                                    >
                                                        <Text style={st.timePickerBtnText}>
                                                            {step.time || '+ Add time'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={st.stepControls}>
                                                    <TouchableOpacity 
                                                        style={st.reorderBtn}
                                                        onPress={() => moveStepUp(i)} 
                                                        disabled={i === 0}
                                                    >
                                                        <Text style={{ fontSize: 18, color: i === 0 ? C.inactive : C.muted }}>▲</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={st.reorderBtn}
                                                        onPress={() => moveStepDown(i)} 
                                                        disabled={i === manualSteps.length - 1}
                                                    >
                                                        <Text style={{ fontSize: 18, color: i === manualSteps.length - 1 ? C.inactive : C.muted }}>▼</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={st.deleteBtn}
                                                        onPress={() => removeManualStep(i)}
                                                    >
                                                        <Text style={{ color: C.coral, fontSize: 20, fontWeight: '700' }}>×</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>

                                <View style={st.modalRow}>
                                    <TouchableOpacity style={st.cancelBtn} onPress={() => setBuilderMode('choose')}>
                                        <Text style={st.cancelText}>← Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={st.confirmBtn}
                                        onPress={saveManualRoutine}
                                    >
                                        <Text style={st.confirmText}>Save Routine</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* ── Edit mode ── */}
                        {builderMode === 'edit' && (
                            <>
                                <Text style={st.modalTitle}>Edit Today's Routine</Text>
                                <Text style={st.modalSub}>Tap any field to fix spelling, times, or delete</Text>

                                {/* Step list for editing */}
                                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                                    {manualSteps.length === 0 && (
                                        <Text style={{ color: C.muted, textAlign: 'center', marginTop: 12, fontSize: 13 }}>
                                            No steps to edit
                                        </Text>
                                    )}
                                    {manualSteps.map((step, i) => {
                                        const cfg = STEP_CONFIG[step.type] || STEP_CONFIG.default;
                                        const IconComp = cfg.icon;
                                        return (
                                            <View key={step.id} style={st.editStepRow}>
                                                <View style={[st.manualStepIcon, { backgroundColor: cfg.tint }]}>
                                                    <IconComp size={20} color={cfg.color} weight="duotone" />
                                                </View>
                                                <View style={{ flex: 1, gap: 6 }}>
                                                    {/* Main label field */}
                                                    <TextInput
                                                        style={[st.editStepInput, { fontWeight: '600', fontSize: 14 }]}
                                                        value={step.label}
                                                        onChangeText={v => updateManualStep(i, 'label', v)}
                                                        placeholder="Step name"
                                                        placeholderTextColor={C.inactive}
                                                    />
                                                    {/* Time picker button */}
                                                    <TouchableOpacity 
                                                        style={st.timePickerBtn}
                                                        onPress={() => openTimePicker(i)}
                                                    >
                                                        <Text style={st.timePickerBtnText}>
                                                            {step.time || '+ Add time'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {/* Description field */}
                                                    <TextInput
                                                        style={[st.editStepInput, { fontSize: 12, color: C.muted, minHeight: 32 }]}
                                                        value={step.description}
                                                        onChangeText={v => updateManualStep(i, 'description', v)}
                                                        placeholder="Optional description"
                                                        placeholderTextColor={C.inactive}
                                                        multiline
                                                    />
                                                </View>
                                                {/* Reorder and delete buttons */}
                                                <View style={st.stepControls}>
                                                    <TouchableOpacity 
                                                        style={st.reorderBtn}
                                                        onPress={() => moveStepUp(i)} 
                                                        disabled={i === 0}
                                                    >
                                                        <Text style={{ fontSize: 18, color: i === 0 ? C.inactive : C.muted }}>▲</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={st.reorderBtn}
                                                        onPress={() => moveStepDown(i)} 
                                                        disabled={i === manualSteps.length - 1}
                                                    >
                                                        <Text style={{ fontSize: 18, color: i === manualSteps.length - 1 ? C.inactive : C.muted }}>▼</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={st.deleteBtn}
                                                        onPress={() => removeManualStep(i)}
                                                    >
                                                        <Text style={{ color: C.coral, fontSize: 20, fontWeight: '700' }}>×</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>

                                <View style={st.modalRow}>
                                    <TouchableOpacity style={st.cancelBtn} onPress={() => { setBuilderMode('choose'); setManualSteps([]); }}>
                                        <Text style={st.cancelText}>← Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={st.confirmBtn}
                                        onPress={saveManualRoutine}
                                    >
                                        <Text style={st.confirmText}>✓ Save Changes</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                    </View>
                </View>
            </Modal>

            {/* ── Time Picker Modal ── */}
            <Modal visible={timePickerVisible} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={st.timePickerModal}>
                        <View style={st.timePickerHeader}>
                            <Text style={st.timePickerTitle}>Select Time</Text>
                        </View>
                        
                        {/* Drum picker */}
                        <View style={st.drumRow}>
                            <DrumPicker
                                items={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
                                selected={selectedHour}
                                onSelect={setSelectedHour}
                            />
                            <Text style={st.drumColon}>:</Text>
                            <DrumPicker
                                items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                                selected={selectedMinute}
                                onSelect={setSelectedMinute}
                            />
                            <DrumPicker
                                items={['AM', 'PM']}
                                selected={selectedAmPm}
                                onSelect={setSelectedAmPm}
                            />
                        </View>

                        {/* Action buttons */}
                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setTimePickerVisible(false)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={st.confirmBtn} onPress={saveTime}>
                                <Text style={st.confirmText}>Save Time</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ──────────────────────────────────────────────────────────────────────────────
                STEP 5 — Health Log Modal
                ────────────────────────────────────────────────────────────────────────────── */}
            <Modal visible={healthModalVisible} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={st.modal}>
                        <Text style={st.modalTitle}>Log Health Event</Text>

                        {/* Type selector */}
                        <View style={st.modalRow}>
                            <TouchableOpacity
                                style={[st.typeBtn, healthType === 'sickness' && st.typeBtnActive]}
                                onPress={() => setHealthType('sickness')}
                            >
                                <Text style={st.typeBtnText}>🤒 Sickness</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.typeBtn, healthType === 'injury' && st.typeBtnActive]}
                                onPress={() => setHealthType('injury')}
                            >
                                <Text style={st.typeBtnText}>🩹 Injury</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Description */}
                        <TextInput
                            style={st.promptInput}
                            value={healthDesc}
                            onChangeText={setHealthDesc}
                            placeholder="Describe what happened..."
                            placeholderTextColor={C.muted}
                            multiline
                            numberOfLines={3}
                            autoFocus
                        />

                        {/* Severity */}
                        <Text style={st.modalSub}>Severity</Text>
                        <View style={st.modalRow}>
                            {[1, 2, 3].map(n => (
                                <TouchableOpacity
                                    key={n}
                                    style={[st.severityBtn, healthSeverity === n && st.severityBtnActive]}
                                    onPress={() => setHealthSeverity(n)}
                                >
                                    <Text style={st.severityBtnText}>
                                        {n === 1 ? '😐 Mild' : n === 2 ? '😟 Moderate' : '😰 Severe'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Time Selection */}
                        <Text style={st.modalSub}>Time</Text>
                        <View style={st.drumRow}>
                            <DrumPicker
                                items={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
                                selected={healthLogHour}
                                onSelect={setHealthLogHour}
                            />
                            <Text style={st.drumColon}>:</Text>
                            <DrumPicker
                                items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                                selected={healthLogMinute}
                                onSelect={setHealthLogMinute}
                            />
                            <DrumPicker
                                items={['AM', 'PM']}
                                selected={healthLogAmPm}
                                onSelect={setHealthLogAmPm}
                            />
                        </View>

                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => {
                                setHealthModalVisible(false);
                                setHealthDesc('');
                                setHealthSeverity(1);
                                setHealthTimePickerVisible(false);
                            }}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.confirmBtn, (!healthDesc.trim() || loggingHealth) && { opacity: 0.5 }]}
                                onPress={confirmHealthLog}
                                disabled={!healthDesc.trim() || loggingHealth}
                            >
                                {loggingHealth
                                    ? <ActivityIndicator color={C.white} size="small" />
                                    : <Text style={st.confirmText}>Save Log</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Potty Log Modal with Time Picker ── */}
            <Modal visible={pottyModalVisible} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={st.timePickerModal}>
                        <View style={st.timePickerHeader}>
                            <Text style={st.timePickerTitle}>Select Time</Text>
                        </View>
                        
                        {/* Drum picker */}
                        <View style={st.drumRow}>
                            <DrumPicker
                                items={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
                                selected={pottyHour}
                                onSelect={setPottyHour}
                            />
                            <Text style={st.drumColon}>:</Text>
                            <DrumPicker
                                items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                                selected={pottyMinute}
                                onSelect={setPottyMinute}
                            />
                            <DrumPicker
                                items={['AM', 'PM']}
                                selected={pottyAmPm}
                                onSelect={setPottyAmPm}
                            />
                        </View>

                        {/* Action buttons */}
                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setPottyModalVisible(false)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[st.confirmBtn, loggingPotty && { opacity: 0.5 }]}
                                onPress={confirmPottyLog}
                                disabled={loggingPotty}
                            >
                                {loggingPotty
                                    ? <ActivityIndicator color={C.white} size="small" />
                                    : <Text style={st.confirmText}>Confirm</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Health Log Time Picker Modal ── */}
            <Modal visible={healthTimePickerVisible} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={st.timePickerModal}>
                        <View style={st.timePickerHeader}>
                            <Text style={st.timePickerTitle}>Select Time</Text>
                        </View>
                        
                        {/* Drum picker */}
                        <View style={st.drumRow}>
                            <DrumPicker
                                items={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
                                selected={healthLogHour}
                                onSelect={setHealthLogHour}
                            />
                            <Text style={st.drumColon}>:</Text>
                            <DrumPicker
                                items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                                selected={healthLogMinute}
                                onSelect={setHealthLogMinute}
                            />
                            <DrumPicker
                                items={['AM', 'PM']}
                                selected={healthLogAmPm}
                                onSelect={setHealthLogAmPm}
                            />
                        </View>

                        {/* Action buttons */}
                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setHealthTimePickerVisible(false)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[st.confirmBtn, loggingHealth && { opacity: 0.5 }]}
                                onPress={confirmHealthLog}
                                disabled={loggingHealth}
                            >
                                {loggingHealth
                                    ? <ActivityIndicator color={C.white} size="small" />
                                    : <Text style={st.confirmText}>Confirm</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Edit Potty Log Modal ── */}
            <Modal visible={editingPottyLog !== null} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={st.timePickerModal}>
                        <View style={st.timePickerHeader}>
                            <Text style={st.timePickerTitle}>Edit Time</Text>
                        </View>
                        
                        {/* Drum picker */}
                        <View style={st.drumRow}>
                            <DrumPicker
                                items={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
                                selected={editPottyHour}
                                onSelect={setEditPottyHour}
                            />
                            <Text style={st.drumColon}>:</Text>
                            <DrumPicker
                                items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                                selected={editPottyMinute}
                                onSelect={setEditPottyMinute}
                            />
                            <DrumPicker
                                items={['AM', 'PM']}
                                selected={editPottyAmPm}
                                onSelect={setEditPottyAmPm}
                            />
                        </View>

                        {/* Action buttons */}
                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setEditingPottyLog(null)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[st.confirmBtn, savingEdit && { opacity: 0.5 }]}
                                onPress={savePottyEdit}
                                disabled={savingEdit}
                            >
                                {savingEdit
                                    ? <ActivityIndicator color={C.white} size="small" />
                                    : <Text style={st.confirmText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Edit Health Log Modal ── */}
            <Modal visible={editingHealthLog !== null} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modal, { maxHeight: '88%' }]}>
                        <Text style={st.modalTitle}>Edit Health Log</Text>

                        {/* Type selector */}
                        <View style={st.modalRow}>
                            <TouchableOpacity
                                style={[st.typeBtn, editHealthType === 'sickness' && st.typeBtnActive]}
                                onPress={() => setEditHealthType('sickness')}
                            >
                                <Text style={st.typeBtnText}>🤒 Sickness</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.typeBtn, editHealthType === 'injury' && st.typeBtnActive]}
                                onPress={() => setEditHealthType('injury')}
                            >
                                <Text style={st.typeBtnText}>🩹 Injury</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Description */}
                        <TextInput
                            style={st.promptInput}
                            value={editHealthDesc}
                            onChangeText={setEditHealthDesc}
                            placeholder="Describe what happened..."
                            placeholderTextColor={C.muted}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Severity */}
                        <Text style={st.modalSub}>Severity</Text>
                        <View style={st.modalRow}>
                            {[1, 2, 3].map(n => (
                                <TouchableOpacity
                                    key={n}
                                    style={[st.severityBtn, editHealthSeverity === n && st.severityBtnActive]}
                                    onPress={() => setEditHealthSeverity(n)}
                                >
                                    <Text style={st.severityBtnText}>
                                        {n === 1 ? '😐 Mild' : n === 2 ? '😟 Moderate' : '😰 Severe'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Time selector with drum roll */}
                        <Text style={st.modalSub}>Time</Text>
                        <View style={st.drumRow}>
                            <DrumPicker
                                items={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
                                selected={editHealthHour}
                                onSelect={setEditHealthHour}
                            />
                            <Text style={st.drumColon}>:</Text>
                            <DrumPicker
                                items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                                selected={editHealthMinute}
                                onSelect={setEditHealthMinute}
                            />
                            <DrumPicker
                                items={['AM', 'PM']}
                                selected={editHealthPeriod}
                                onSelect={setEditHealthPeriod}
                            />
                        </View>

                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setEditingHealthLog(null)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.confirmBtn, savingEdit && { opacity: 0.5 }]}
                                onPress={saveHealthEdit}
                                disabled={savingEdit}
                            >
                                {savingEdit
                                    ? <ActivityIndicator color={C.white} size="small" />
                                    : <Text style={st.confirmText}>Save Changes</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

// ── StepCard ──────────────────────────────────────────────────────────────────

function StepCard({ step, index, isLast, onToggle }) {
    const cfg = STEP_CONFIG[step.type] || STEP_CONFIG.default;
    const IconComp = cfg.icon;

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fillAnim = useRef(new Animated.Value(step.completed ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(fillAnim, {
            toValue: step.completed ? 1 : 0,
            friction: 7, tension: 50, useNativeDriver: false,
        }).start();
    }, [step.completed]);

    function pressIn() { if (!step.completed) Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start(); }
    function pressOut() { Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start(); }

    // Tap completes, long press undoes
    function onTap() {
        if (!step.completed) {
            Speech.speak(step.label, {
                rate: 0.85,
                pitch: 1.1,
                language: 'en-US',
            });
            onToggle(step.id, true);
        }
    }
    function onLongPress() { if (step.completed) onToggle(step.id, false); }

    const cardBg = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [C.white, C.completed] });
    const checkScale = fillAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.3, 1] });

    return (
        <View style={st.row}>
            {/* Timeline spine */}
            <View style={st.spine}>
                <View style={[st.bubble, step.completed && st.bubbleDone]}>
                    {step.completed
                        ? <Animated.Text style={[st.bubbleCheck, { transform: [{ scale: checkScale }] }]}>✓</Animated.Text>
                        : <Text style={st.bubbleNum}>{index + 1}</Text>}
                </View>
                {!isLast && <View style={st.line} />}
            </View>

            {/* Card */}
            <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }], marginBottom: isLast ? 0 : 14 }}>
                <TouchableOpacity
                    onPress={onTap}
                    onLongPress={onLongPress}
                    onPressIn={pressIn}
                    onPressOut={pressOut}
                    activeOpacity={1}
                    delayLongPress={600}
                >
                    <Animated.View style={[st.card, { backgroundColor: cardBg }]}>
                        {/* Left accent bar colored per step type */}
                        <View style={[st.accent, { backgroundColor: cfg.color }]} />

                        {/* Icon in tinted circle */}
                        <View style={[st.iconCircle, { backgroundColor: cfg.tint }]}>
                            <IconComp size={28} color={cfg.color} weight="duotone" />
                        </View>

                        {/* Text block */}
                        <View style={st.cardText}>
                            <Text style={[st.cardLabel, step.completed && { color: C.purple }]}>{step.label}</Text>
                            <Text style={st.cardDesc}>{step.description}</Text>
                            {step.completed
                                ? <Text style={st.undoHint}>Hold to undo</Text>
                                : <View style={st.tapPill}><Text style={st.tapPillText}>Tap when done</Text></View>}
                        </View>

                        {/* Heart badge when done */}
                        {step.completed && (
                            <View style={st.doneBadge}>
                                <Heart size={18} color={C.purple} weight="fill" />
                            </View>
                        )}
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 14 },
    loadingText: { fontSize: 15, color: C.muted, fontWeight: '500' },

    // Header
    header: { height: 210, backgroundColor: C.purple, overflow: 'hidden' },
    headerArt: { position: 'absolute', right: -20, bottom: -10, width: 220, height: 220, opacity: 0.3 },
    headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(100,80,220,0.45)' },
    backBtn: {
        position: 'absolute', top: 52, left: 20, zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 22,
        width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    },
    headerContent: { position: 'absolute', bottom: 28, left: 24, right: 220 },
    headerName: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 14, letterSpacing: -0.4 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    track: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 5, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: C.gold, borderRadius: 5 },
    progressCount: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 24, paddingHorizontal: 18, paddingBottom: 20 },

    // Celebration
    celebrate: {
        backgroundColor: C.gold, borderRadius: 22,
        paddingVertical: 20, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24,
        shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7,
    },
    celebEmoji: { fontSize: 38 },
    celebTitle: { fontSize: 18, fontWeight: '800', color: C.dark },
    celebSub: { fontSize: 13, color: C.dark, opacity: 0.7, marginTop: 2 },

    // Row + spine
    row: { flexDirection: 'row', gap: 12 },
    spine: { alignItems: 'center', width: 40 },
    bubble: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: C.white, borderWidth: 2, borderColor: C.inactive,
        justifyContent: 'center', alignItems: 'center',
    },
    bubbleDone: { backgroundColor: C.purple, borderColor: C.purple },
    bubbleNum: { fontSize: 14, fontWeight: '700', color: C.muted },
    bubbleCheck: { fontSize: 16, fontWeight: '800', color: C.white },
    line: { width: 2, flex: 1, backgroundColor: C.inactive, opacity: 0.3, marginVertical: 3, borderRadius: 1 },

    // Card
    card: {
        borderRadius: 20, padding: 14, paddingLeft: 18,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        minHeight: 90, overflow: 'hidden',
    },
    accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    iconCircle: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    cardText: { flex: 1, gap: 3 },
    cardLabel: { fontSize: 16, fontWeight: '700', color: C.dark },
    cardDesc: { fontSize: 12, color: C.muted, lineHeight: 17 },
    tapPill: {
        marginTop: 7, backgroundColor: C.purple + '18', borderRadius: 8,
        paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start',
    },
    tapPillText: { fontSize: 11, fontWeight: '600', color: C.purple },
    undoHint: { fontSize: 11, color: C.muted, marginTop: 5 },
    doneBadge: { padding: 4 },

    // Caregiver bar
    careBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 22, paddingBottom: 30, paddingTop: 12,
        backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.completed,
    },
    careBtn: {
        backgroundColor: C.dark, borderRadius: 14, paddingVertical: 15,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, minHeight: 54,
    },
    careBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },

    // Modals
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal: {
        backgroundColor: C.white, borderRadius: 24, padding: 26, width: '100%', maxWidth: 360, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 28, elevation: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, textAlign: 'center' },
    modalSub: { fontSize: 13, color: C.muted, textAlign: 'center' },
    pinInput: {
        borderWidth: 2, borderColor: C.inactive, borderRadius: 14,
        paddingVertical: 14, paddingHorizontal: 20,
        fontSize: 24, textAlign: 'center', letterSpacing: 8, color: C.dark, minHeight: 60,
    },
    pinErr: { color: C.coral, fontSize: 13, textAlign: 'center', fontWeight: '500' },
    promptInput: {
        borderWidth: 2, borderColor: C.inactive, borderRadius: 14,
        padding: 14, fontSize: 14, color: C.dark, minHeight: 90,
        textAlignVertical: 'top', lineHeight: 21,
    },
    modalRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: {
        flex: 1, borderWidth: 2, borderColor: C.inactive, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center',
    },
    cancelText: { fontSize: 15, color: C.muted, fontWeight: '600' },
    confirmBtn: {
        flex: 1, backgroundColor: C.purple, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center',
    },
    confirmText: { fontSize: 15, color: C.white, fontWeight: '700' },

    modeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.bg, borderRadius: 16, padding: 16,
        borderWidth: 1.5, borderColor: C.completed,
    },
    modeBtnEmoji:  { fontSize: 28 },
    modeBtnTitle:  { fontSize: 15, fontWeight: '700', color: C.dark },
    modeBtnSub:    { fontSize: 12, color: C.muted, marginTop: 2 },

    typeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    },
    typeChipLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

    manualStepRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.completed,
    },
    manualStepIcon: {
        width: 38, height: 38, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    manualLabelInput: {
        borderWidth: 1, borderColor: C.inactive, borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: C.dark,
    },
    editStepRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        paddingVertical: 12, paddingHorizontal: 12, marginVertical: 6,
        backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.completed,
    },
    editStepInput: {
        borderWidth: 0.5, borderColor: C.inactive, borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 6, color: C.dark, backgroundColor: C.bg,
    },
    stepControls: {
        flexDirection: 'column', alignItems: 'center', gap: 8, justifyContent: 'center',
    },
    reorderBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.completed, justifyContent: 'center', alignItems: 'center',
    },
    deleteBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FFE8E2', justifyContent: 'center', alignItems: 'center',
    },
    timePickerBtn: {
        backgroundColor: C.completed, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: C.purple,
    },
    timePickerBtnText: {
        color: C.purple, fontSize: 13, fontWeight: '600',
    },
    modeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    clearAllBtn: {
        backgroundColor: C.coral,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearAllBtnText: {
        color: C.white,
        fontSize: 12,
        fontWeight: '600',
    },
    timePickerModal: {
        backgroundColor: C.white, marginTop: 'auto',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingTop: 32, paddingBottom: 28,
        width: '100%',
    },
    timePickerHeader: {
        alignItems: 'center', marginBottom: 32,
    },
    timePickerTitle: {
        fontSize: 22, fontWeight: '700', color: C.dark,
    },
    pickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        marginBottom: 32,
        gap: 12,
    },
    pickerColumn: {
        flex: 1, alignItems: 'center',
    },
    pickerLabel: {
        fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 12,
    },
    pickerScroll: {
        height: 240, backgroundColor: C.bg, borderRadius: 12,
    },
    pickerOption: {
        paddingVertical: 18,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        minHeight: 60,
        marginVertical: 4,
    },
    pickerOptionSelected: {
        backgroundColor: C.purple,
        transform: [{ scale: 1.08 }],
    },
    pickerOptionText: {
        fontSize: 20, fontWeight: '600', color: '#333',
    },
    pickerOptionTextSelected: {
        color: 'white', fontWeight: '700',
    },
    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 32,
    },

    // ──────────────────────────────────────────────────────────────────────────────
    // STEP 6 — Potty + Health Log Styles\n    // ──────────────────────────────────────────────────────────────────────────────
    sectionDivider: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 24,
    },
    sectionDividerLine: {
        flex: 1, height: 1, backgroundColor: C.inactive, opacity: 0.4,
    },
    sectionDividerText: {
        fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 0.5,
    },
    logSection: {
        backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    logSectionHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14,
    },
    logSectionTitle: {
        fontSize: 15, fontWeight: '800', color: C.dark,
    },
    toggleBtn: {
        borderWidth: 1.5, borderColor: C.inactive, borderRadius: 10,
        paddingVertical: 6, paddingHorizontal: 12,
    },
    toggleBtnActive: {
        backgroundColor: C.purple, borderColor: C.purple,
    },
    toggleBtnText: {
        fontSize: 12, fontWeight: '600', color: C.muted,
    },
    toggleBtnTextActive: {
        color: C.white,
    },
    pottyBtnRow: {
        flexDirection: 'row', gap: 10, marginBottom: 14,
    },
    pottyBtn: {
        flex: 1, borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', gap: 6, minHeight: 80,
        justifyContent: 'center',
    },
    pottyBtnEmoji: { fontSize: 28 },
    pottyBtnLabel: { fontSize: 11, fontWeight: '700' },
    addHealthBtn: {
        backgroundColor: C.coral, borderRadius: 10,
        paddingVertical: 6, paddingHorizontal: 14,
    },
    addHealthBtnText: {
        fontSize: 12, fontWeight: '700', color: C.white,
    },
    logList: {
        gap: 8,
    },
    logListTitle: {
        fontSize: 11, fontWeight: '600', color: C.muted,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    logRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.bg, borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 12,
    },
    logRowEmoji: { fontSize: 20 },
    logRowText:  { flex: 1, fontSize: 13, fontWeight: '600', color: C.dark },
    logRowSub:   { fontSize: 11, color: C.muted, marginTop: 2 },
    logRowTime:  { fontSize: 11, color: C.muted, fontWeight: '500' },
    logEmpty:    { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 12 },
    typeBtn: {
        flex: 1, borderWidth: 1.5, borderColor: C.inactive,
        borderRadius: 12, paddingVertical: 14, paddingHorizontal: 6,
        alignItems: 'center', justifyContent: 'center', minHeight: 60,
    },
    typeBtnActive: {
        borderColor: C.purple, backgroundColor: C.completed,
    },
    typeBtnText: { fontSize: 12, fontWeight: '600', color: C.dark, textAlign: 'center', flexWrap: 'wrap' },
    severityBtn: {
        flex: 1, borderWidth: 1.5, borderColor: C.inactive,
        borderRadius: 12, paddingVertical: 10, alignItems: 'center',
    },
    severityBtnActive: {
        borderColor: C.coral, backgroundColor: '#FFF0ED',
    },
    severityBtnText: { fontSize: 11, fontWeight: '600', color: C.dark },
    logActionBtn: {
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: C.completed, justifyContent: 'center', alignItems: 'center',
    },
    logActionText: { fontSize: 14, fontWeight: '600' },
    miniPicker: {
        alignItems: 'center', gap: 4,
    },
    miniPickerText: { fontSize: 12, fontWeight: '600', color: C.muted },
    miniPickerValue: { fontSize: 14, fontWeight: '700', color: C.dark },
    drumRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6, marginVertical: 8,
    },
    drumColon: {
        fontSize: 24, fontWeight: '800', color: C.dark, marginBottom: 4,
    },
    drum: {
        width: 64, height: DRUM_ITEM_H * 3,
        overflow: 'hidden', position: 'relative',
        backgroundColor: C.bg, borderRadius: 14,
        borderWidth: 1.5, borderColor: C.inactive,
    },
    drumHighlight: {
        position: 'absolute',
        top: DRUM_ITEM_H,
        left: 0, right: 0,
        height: DRUM_ITEM_H,
        backgroundColor: C.completed,
        borderTopWidth: 1.5, borderBottomWidth: 1.5,
        borderColor: C.purple, zIndex: 0,
    },
    drumItem: {
        height: DRUM_ITEM_H,
        justifyContent: 'center', alignItems: 'center',
    },
    drumItemText: {
        fontSize: 18, fontWeight: '500', color: C.muted,
    },
    drumItemSelected: {
        fontSize: 22, fontWeight: '800', color: C.purple,
    },
});