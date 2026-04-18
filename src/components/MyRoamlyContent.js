// src/components/MyRoamlyContent.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

const AVATAR_SEEDS = [
  'sunny', 'river', 'cloud', 'tiger', 'maple',
  'stone', 'ember',
];

const AVATAR_STYLES = [
  { id: 'thumbs',             label: 'Thumbs'     },
  { id: 'pixel-art',          label: 'Pixel'      },
  { id: 'bottts',             label: 'Bottts'     },
  { id: 'bottts-neutral',     label: 'Neutral'    },
  { id: 'big-smile',          label: 'Big Smile'  },
  { id: 'adventurer-neutral', label: 'Adventure'  },
];

const MUSIC = [
  { id: 'piano',   label: 'Soft Piano',    emoji: '🎹', url: 'https://cdn.pixabay.com/download/audio/2026/03/27/audio_748373740e.mp3?filename=atlasaudio-soft-509813.mp3' },
  { id: 'lofi',    label: 'Lo-fi Beats',   emoji: '🎧', url: 'https://cdn.pixabay.com/download/audio/2026/01/17/audio_5524f072d7.mp3?filename=franzian-deo-lo-fi-467754.mp3' },
  { id: 'nature',  label: 'Nature Sounds', emoji: '🌿', url: 'https://cdn.pixabay.com/audio/2024/09/10/audio_6e5d7d1912.mp3' },
  { id: 'rain',    label: 'Rainy Day',     emoji: '🌧️', url: 'https://cdn.pixabay.com/audio/2022/08/06/audio_4b514cb18f.mp3' },
  { id: 'ocean',   label: 'Ocean Waves',   emoji: '🌊', url: 'https://cdn.pixabay.com/audio/2025/10/06/audio_2f2e635e93.mp3' },
  { id: 'lullaby', label: 'Lullaby',       emoji: '🌙', url: 'https://cdn.pixabay.com/audio/2026/04/08/audio_192268d154.mp3' },
  { id: 'forest',  label: 'Forest Birds',  emoji: '🐦', url: 'https://cdn.pixabay.com/audio/2023/01/29/audio_580d2c877d.mp3' },
  { id: 'silence', label: 'Silence',       emoji: '🤫', url: null },
];

const DEFAULT_CONFIG = {
  avatarStyle: 'thumbs',
  avatarSeed:  'sunny',
  theme:       'space',
  music:       'piano',
};

export default function MyRoamlyContent({ onClose, onThemeChange }) {
  const { activeChild, selectChild, playTrack, toggleMusicOn, musicOn, currentTrackId, player } = useApp();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeChild?.avatar_config) {
      setConfig({ ...DEFAULT_CONFIG, ...activeChild.avatar_config });
    }
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();
  }, []);

  function update(key, value) {
    const updated = { ...config, [key]: value };
    setConfig(updated);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('child')
      .update({ avatar_config: config })
      .eq('id', activeChild.id);

    if (!error) {
      await selectChild({ ...activeChild, avatar_config: config });
    }
    setSaving(false);
    onClose();
  }

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Text style={styles.heading}>My Place 🏡</Text>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Avatar picker — Netflix rows per style ── */}
          <Section title="My Avatar">
            {AVATAR_STYLES.map((style) => (
              <View key={style.id} style={styles.avatarStyleBlock}>
                <Text style={styles.avatarStyleLabel}>{style.label}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarScroll}
                >
                  {AVATAR_SEEDS.map((seed) => (
                    <AvatarCard
                      key={`${style.id}-${seed}`}
                      styleId={style.id}
                      seed={seed}
                      selected={
                        config.avatarStyle === style.id &&
                        config.avatarSeed === seed
                      }
                      onPress={() => {
                        const updated = { ...config, avatarStyle: style.id, avatarSeed: seed };
                        setConfig(updated);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </Section>

          {/* ── Music ── */}
          <Section title="My Sound">
            {/* On/Off toggle */}
            <TouchableOpacity
              style={[styles.musicToggle, musicOn && styles.musicToggleOn]}
              onPress={toggleMusicOn}
            >
              <Text style={styles.musicToggleEmoji}>{musicOn ? '🔊' : '🔇'}</Text>
              <Text style={[styles.musicToggleText, musicOn && styles.musicToggleTextOn]}>
                {musicOn ? 'Music On' : 'Music Off'}
              </Text>
            </TouchableOpacity>

            {/* Track list */}
            <View style={styles.chipRow}>
              {MUSIC.map((m) => {
                const isSelected = config.music === m.id;
                const isActive   = isSelected && musicOn && currentTrackId === m.id && player.playing;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => { update('music', m.id); playTrack(m.id); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipEmoji}>{m.emoji}</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {m.label}
                    </Text>
                    {isActive && (
                      <View style={styles.playingDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save my look ✨'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function AvatarCard({ styleId, seed, selected, onPress }) {
  const [xml, setXml] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchAvatar();
  }, []);

  async function fetchAvatar() {
    try {
      const url  = `https://api.dicebear.com/7.x/${styleId}/svg?seed=${encodeURIComponent(seed)}&radius=50`;
      const res  = await fetch(url);
      const text = await res.text();
      setXml(text);
    } catch (e) {
      console.log('fetch failed', styleId, seed);
    }
  }

  function onPressIn() {
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 40 }).start();
  }
  function onPressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.avatarCard}
      >
        <View style={[styles.avatarCardInner, selected && styles.avatarCardInnerActive]}>
          {xml
            ? <SvgXml xml={xml} width={72} height={72} />
            : <View style={styles.avatarCardPlaceholder} />
          }
          {selected && (
            <View style={styles.avatarCardCheck}>
              <Text style={styles.avatarCardCheckText}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Clean section wrapper with a label
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

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
    marginBottom: 8,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  avatarStyleBlock: {
    marginBottom: 20,
  },
  avatarStyleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3D3D3D',
    marginBottom: 10,
  },
  avatarScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  avatarCard: {
    alignItems: 'center',
  },
  avatarCardInner: {
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#EDE9FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCardInnerActive: {
    borderColor: '#7C6AF7',
    backgroundColor: '#EDE9FF',
    shadowColor: '#7C6AF7',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarCardPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE9FF',
  },
  avatarCardCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C6AF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCardCheckText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#EDE9FF',
    minHeight: 48,
  },
  chipActive: {
    borderColor: '#7C6AF7',
    backgroundColor: '#EDE9FF',
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  chipTextActive: {
    color: '#7C6AF7',
  },
  musicToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: '#C4C4C4', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14,
  },
  musicToggleOn: {
    borderColor: '#7C6AF7', backgroundColor: '#EDE9FF',
  },
  musicToggleEmoji: { fontSize: 20 },
  musicToggleText: {
    fontSize: 14, fontWeight: '700', color: '#9E9E9E',
  },
  musicToggleTextOn: { color: '#7C6AF7' },
  playingDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#7C6AF7', marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#7C6AF7',
    borderRadius: 50,
    paddingVertical: 20,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
