// src/components/FeelingsContent.js
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import * as Network from 'expo-network';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { enqueueAction } from '../lib/offlineQueue';

const { width, height } = Dimensions.get('window');

// Pre-require all SVGs statically so Metro bundler can resolve them
// Dynamic requires don't work in React Native
const SVG_SOURCES = {
  happy:    require('../assets/illustrations/emotions/Happy baby-cuate.svg'),
  angry:    require('../assets/illustrations/emotions/Feeling angry-rafiki (1).svg'),
  sad:      require('../assets/illustrations/emotions/sad unicorn-cuate.svg'),
  scared:   require('../assets/illustrations/emotions/Scared-pana.svg'),
  calm:     require('../assets/illustrations/emotions/Relaxing at home-bro(calm).svg'),
  confused: require('../assets/illustrations/emotions/Shrug-cuate(confused emotion).svg'),
  excited:  require('../assets/illustrations/emotions/Swing-rafiki(excited Emotion).svg'),
  stressed: require('../assets/illustrations/emotions/Student stress-cuate(feeling stressed).svg'),
};

// Each emotion maps to a Storyset illustration, a therapeutic label,
// a soft background tint, and an accent color for buttons
const EMOTIONS = [
    {
        id: 'happy',
        label: 'I feel happy',
        tint: '#FFFBF0',
        accent: '#FFD166',
    },
    {
        id: 'angry',
        label: 'I feel angry',
        tint: '#FFF5F5',
        accent: '#FF7757',
    },
    {
        id: 'sad',
        label: 'I feel sad',
        tint: '#F0F6FF',
        accent: '#64B5F6',
    },
    {
        id: 'scared',
        label: 'I feel scared',
        tint: '#F5F0FF',
        accent: '#7C6AF7',
    },
    {
        id: 'calm',
        label: 'I feel calm',
        tint: '#F0FFF6',
        accent: '#5DBE6E',
    },
    {
        id: 'confused',
        label: 'I feel confused',
        tint: '#F8F8F8',
        accent: '#B0BEC5',
    },
    {
        id: 'excited',
        label: 'I feel excited',
        tint: '#FFFAF0',
        accent: '#FFB347',
    },
    {
        id: 'stressed',
        label: 'I feel stressed',
        tint: '#FFF0F5',
        accent: '#F48FB1',
    },
];

// Causes per negative emotion — each maps to a calming suggestion
const EMOTION_CAUSES = {
  sad: [
    { id: 'hungry',    label: 'I am hungry',      suggestion: "Let's ask for a snack 🍎",              action: 'caregiver', phrase: 'Snack. Please. 🍎'        },
    { id: 'tired',     label: 'I am tired',        suggestion: "Maybe it's rest time 😴",               action: 'caregiver', phrase: 'I. Need. Rest. 😴'         },
    { id: 'miss',      label: 'I miss someone',    suggestion: "Let's ask for a hug 🤗",                action: 'caregiver', phrase: 'Hug. Please. 🤗'           },
    { id: 'unknown',   label: "I don't know",      suggestion: "That's okay. Let's take a breath 💨",  action: 'breathe',   phrase: null                        },
  ],
  angry: [
    { id: 'loud',      label: "It's too loud",     suggestion: "Let's find a quiet spot 🤫",            action: 'caregiver', phrase: 'Too. Loud. Quiet. Please. 🤫' },
    { id: 'way',       label: "I didn't get my way", suggestion: "It's okay to feel angry. Let's breathe 💨", action: 'breathe', phrase: null               },
    { id: 'understand',label: "I don't understand", suggestion: "Let's ask for help 🙋",               action: 'caregiver', phrase: 'I. Need. Help. Please. 🙋'  },
    { id: 'unknown',   label: "I don't know",      suggestion: "That's okay. Let's take a breath 💨",  action: 'breathe',   phrase: null                        },
  ],
  scared: [
    { id: 'something', label: 'Something scared me', suggestion: "You are safe. Let's breathe 💨",     action: 'breathe',   phrase: null                        },
    { id: 'alone',     label: 'I am alone',         suggestion: "Let's find someone you trust 🤝",     action: 'caregiver', phrase: 'Stay. With. Me. Please. 🤝' },
    { id: 'dark',      label: "It's too dark",      suggestion: "Let's turn on a light 💡",            action: 'caregiver', phrase: 'Light. On. Please. 💡'      },
    { id: 'new',       label: 'Something is new',   suggestion: "New things are okay. Let's breathe 💨", action: 'breathe', phrase: null                        },
    { id: 'unknown',   label: "I don't know",       suggestion: "You are safe 💨",                     action: 'breathe',   phrase: null                        },
  ],
  stressed: [
    { id: 'toomuch',   label: 'Too much is happening', suggestion: "Let's slow down together 🌿",      action: 'breathe',   phrase: null                        },
    { id: 'cantdo',    label: "I can't do it",      suggestion: "Let's ask for help 🙋",               action: 'caregiver', phrase: 'Help. Me. Please. 🙋'       },
    { id: 'quiet',     label: 'I need quiet',       suggestion: "Let's find a quiet spot 🤫",          action: 'caregiver', phrase: 'Quiet. Please. 🤫'          },
    { id: 'unknown',   label: "I don't know",       suggestion: "That's okay. Let's breathe 💨",       action: 'breathe',   phrase: null                        },
  ],
  confused: [
    { id: 'understand',label: "I don't understand", suggestion: "Let's ask for help 🙋",               action: 'caregiver', phrase: 'I. Need. Help. Please. 🙋'  },
    { id: 'help',      label: 'I need help',        suggestion: "Let's ask for help 🙋",               action: 'caregiver', phrase: 'Help. Me. Please. 🙋'       },
    { id: 'changed',   label: 'Something changed',  suggestion: "Changes are okay. Let's breathe 💨",  action: 'breathe',   phrase: null                        },
    { id: 'unknown',   label: "I don't know",       suggestion: "That's okay. Let's breathe 💨",       action: 'breathe',   phrase: null                        },
  ],
};

// Positive emotions skip the cause step and go straight to celebration
const POSITIVE_EMOTIONS = ['happy', 'excited', 'calm'];

export default function FeelingsContent({ onClose }) {
  const { activeChild } = useApp();
  const [selected, setSelected]   = useState(null);
  const [cause, setCause]         = useState(null);
  const [stage, setStage]         = useState('grid'); // grid | cause | suggestion | celebrate
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function transition(callback) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 180);
  }

  function handleEmotionPress(emotion) {
    transition(() => {
      setSelected(emotion);
      if (POSITIVE_EMOTIONS.includes(emotion.id)) {
        saveCheckin(emotion, null);
        setStage('celebrate');
      } else {
        setStage('cause');
      }
    });
  }

  function handleCausePress(causeItem) {
    transition(() => {
      setCause(causeItem);
      setStage('suggestion');
    });
  }

  async function saveCheckin(emotion, causeItem) {
    const record = {
      child_id:  activeChild.id,
      island:    emotion.id,
      follow_up: causeItem ? { cause: causeItem.id, action: causeItem.action } : { positive: true },
      logged_at: new Date().toISOString(),
    };
    const net = await Network.getNetworkStateAsync();
    if (net.isConnected && net.isInternetReachable) {
      const { error } = await supabase.from('emotion_checkin').insert(record);
      if (error) await enqueueAction({ type: 'INSERT', table: 'emotion_checkin', payload: record });
    } else {
      await enqueueAction({ type: 'INSERT', table: 'emotion_checkin', payload: record });
    }
  }

  function handleReset() {
    transition(() => {
      setSelected(null);
      setCause(null);
      setStage('grid');
    });
  }

  // Celebration screen for positive emotions
  if (stage === 'celebrate') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: selected.tint }]}>
        <Animated.View style={[styles.doneScreen, { opacity: fadeAnim }]}>
          <EmotionIllustration emotion={selected} size={260} />
          <Text style={styles.doneTitle}>That's wonderful! 🎉</Text>
          <Text style={styles.doneSub}>{selected.label}. That makes us happy too.</Text>
          <TouchableOpacity style={styles.ghostBtn} onPress={handleReset}>
            <Text style={styles.ghostBtnText}>Check in again</Text>
          </TouchableOpacity>
        </Animated.View> 
      </SafeAreaView>
    );
  }

  // Calming suggestion screen
  if (stage === 'suggestion' && cause) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: selected.tint }]}>
        <Animated.View style={[styles.doneScreen, { opacity: fadeAnim }]}>
          <EmotionIllustration emotion={selected} size={180} />

          <Text style={styles.doneTitle}>{cause.suggestion}</Text>

          {/* Only show AAC tiles when this cause has a specific phrase */}
          {cause.phrase && (
            <View style={styles.aacBoard}>
              {cause.phrase.split(' ').map((word, i) => (
                <View
                  key={i}
                  style={[styles.aacTile, { backgroundColor: selected.accent + '22', borderColor: selected.accent }]}
                >
                  <Text style={[styles.aacWord, { color: selected.accent }]}>{word}</Text>
                </View>
              ))}
            </View>
          )}

          {cause.phrase && (
            <Text style={styles.doneSub}>Show this to someone you trust.</Text>
          )}

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => transition(() => setStage('cause'))}
          >
            <Text style={styles.ghostBtnText}>← Go back</Text>
          </TouchableOpacity>

        </Animated.View>
      </SafeAreaView>
    );
  }

  // Cause selection screen for negative emotions
  if (stage === 'cause' && selected) {
    const causes = EMOTION_CAUSES[selected.id] || [];
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: selected.tint }]}>
        <Animated.View style={[styles.followUpScreen, { opacity: fadeAnim }]}>
          <EmotionIllustration emotion={selected} size={160} />
          <Text style={styles.emotionChosen}>{selected.label}</Text>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>
              Why do you feel {selected.label.replace('I feel ', '')}?
            </Text>
            <View style={styles.optionsGrid}>
              {causes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionBtn, { borderColor: selected.accent }]}
                  onPress={() => handleCausePress(c)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.backLink} onPress={handleReset}>
            <Text style={styles.backLinkText}>← That's not how I feel</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Main emotion selection grid
  return (
    <SafeAreaView style={styles.root}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <Text style={styles.heading}>How are you feeling?</Text>
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {EMOTIONS.map((emotion) => (
            <EmotionCard
              key={emotion.id}
              emotion={emotion}
              onPress={handleEmotionPress}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// Individual emotion card in the grid
function EmotionCard({ emotion, onPress }) {
    const scale = useRef(new Animated.Value(1)).current;

    function onPressIn() {
        Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
    }
    function onPressOut() {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
    }

    return (
        <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: emotion.tint, borderColor: emotion.accent + '60' }]}
                onPress={() => onPress(emotion)}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={1}
                accessibilityLabel={emotion.label}
                accessibilityRole="button"
            >
                <EmotionIllustration emotion={emotion} size={110} />
                <Text style={[styles.cardLabel, { color: emotion.accent }]}>{emotion.label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// Renders the Storyset SVG illustration for an emotion
function EmotionIllustration({ emotion, size }) {
    const [xml, setXml] = useState(null);

    React.useEffect(() => {
        loadSvg();
    }, [emotion.id]);

    async function loadSvg() {
        try {
            const source = SVG_SOURCES[emotion.id];
            const uri    = Image.resolveAssetSource(source).uri;
            const res    = await fetch(uri);
            const text   = await res.text();
            setXml(text);
        } catch (e) {
            console.log('SVG load failed for', emotion.id, e);
        }
    }

    if (!xml) {
        return (
            <View style={{
                width: size, height: size,
                borderRadius: size / 2,
                backgroundColor: emotion.accent + '22',
            }} />
        );
    }

    return <SvgXml xml={xml} width={size} height={size} />;
}


const CARD_WIDTH = (width - 48 - 14) / 2;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F9F7FF',
    },
    heading: {
        fontSize: 26,
        fontWeight: '800',
        color: '#3D3D3D',
        textAlign: 'center',
        marginTop: 24,
        marginBottom: 20,
        paddingHorizontal: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 14,
        paddingBottom: 40,
    },
    cardWrapper: {
        width: CARD_WIDTH,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1.5,
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 12,
        // Soft shadow lifts the card off the background
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        minHeight: 180,
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 20,
    },
    followUpScreen: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 16,
        paddingHorizontal: 24,
    },
    emotionChosen: {
        fontSize: 22,
        fontWeight: '800',
        color: '#3D3D3D',
        marginTop: 12,
        marginBottom: 4,
    },
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    questionText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#3D3D3D',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 26,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    optionBtn: {
        borderWidth: 2,
        borderRadius: 50,
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        minWidth: '44%',
        alignItems: 'center',
        minHeight: 52,
        justifyContent: 'center',
    },
    optionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3D3D3D',
        textAlign: 'center',
    },
    backLink: {
        marginTop: 24,
        padding: 12,
    },
    backLinkText: {
        color: '#9E9E9E',
        fontSize: 14,
        fontWeight: '600',
    },
    doneScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 16,
    },
    doneTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#3D3D3D',
        textAlign: 'center',
    },
    doneSub: {
        fontSize: 16,
        color: '#9E9E9E',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 8,
    },
    primaryBtn: {
        borderRadius: 50,
        paddingVertical: 18,
        paddingHorizontal: 36,
        minHeight: 60,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    ghostBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ghostBtnText: {
        color: '#9E9E9E',
        fontSize: 15,
        fontWeight: '600',
    },
    aacBoard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        width: '100%',
        marginTop: 8,
    },
    aacTile: {
        borderWidth: 2,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
        minHeight: 56,
    },
    aacWord: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
});