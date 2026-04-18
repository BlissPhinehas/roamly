// src/screens/WorldScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Linking,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import Svg, {
  Path, Circle, Ellipse, Rect, Line,
  Defs, RadialGradient, LinearGradient, Stop,
  Text as SvgText, G,
} from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import FeelingsContent from '../components/FeelingsContent';
import MyRoamlyContent from '../components/MyRoamlyContent';
import JourneyScreen from './JourneyScreen';
import AACScreen from './AACScreen';
import LearnScreen from './LearnScreen';


const { width, height } = Dimensions.get('window');

function WorldBackground() {
  const { width: W, height: H } = Dimensions.get('window');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Soft radial glow top-left */}
      <View style={{
        position: 'absolute', top: -80, left: -80,
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: '#7C6AF7', opacity: 0.12,
      }} />
      {/* Soft radial glow bottom-right */}
      <View style={{
        position: 'absolute', bottom: -60, right: -60,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: '#FF7757', opacity: 0.10,
      }} />
      {/* Subtle horizontal shimmer lines */}
      {[0.20, 0.42, 0.63, 0.82].map((t, i) => (
        <View key={i} style={{
          position: 'absolute',
          top: `${t * 100}%`,
          left: 0, right: 0,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }} />
      ))}

      {/* Diagonal connecting lines forming X with center glow */}
      <Svg style={StyleSheet.absoluteFill} width={W} height={H} pointerEvents="none">
        <Defs>
          <LinearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFD166" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#B8F0C8" stopOpacity="0.5" />
          </LinearGradient>
          <LinearGradient id="lineGrad2" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C9B8FF" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#FFB8A8" stopOpacity="0.5" />
          </LinearGradient>
        </Defs>

        {/* Diagonal: My Day (top-left) → My Place (bottom-right) */}
        <Line
          x1={W * 0.25} y1={H * 0.28}
          x2={W * 0.75} y2={H * 0.72}
          stroke="url(#lineGrad1)"
          strokeWidth="1.2"
          strokeDasharray="6 5"
        />

        {/* Diagonal: How I Feel (top-right) → My Body (bottom-left) */}
        <Line
          x1={W * 0.75} y1={H * 0.28}
          x2={W * 0.25} y2={H * 0.72}
          stroke="url(#lineGrad2)"
          strokeWidth="1.2"
          strokeDasharray="6 5"
        />

        {/* Intersection glow dot */}
        <Circle cx={W * 0.50} cy={H * 0.50} r="4" fill="rgba(255,255,255,0.25)" />
        <Circle cx={W * 0.50} cy={H * 0.50} r="2" fill="rgba(255,255,255,0.55)" />
      </Svg>
    </View>
  );
}



function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

const TIME_CONFIG = {
  morning:   { bg: '#1A1040', accent: '#FFD166', message: "Good morning! What are we doing today? 🌟" },
  afternoon: { bg: '#0F1A35', accent: '#7C6AF7', message: "Hi there! Ready for an adventure? 🚀"      },
  evening:   { bg: '#1A0F2E', accent: '#FF7757', message: "Welcome back! How are you feeling? 🌸"     },
  night:     { bg: '#0A0A1F', accent: '#9C88FF', message: "Time to wind down together. 🌙"            },
};

const ZONES = [
  {
    id:        'journey',
    label:     'My Day',
    sub:       'See what we are doing',
    color:     '#FFD166',
    textColor: '#7A5C00',
    bg:        '#FFFBEE',
    illustration: 1,  // Maps to illustrationMap[1]
  },
  {
    id:        'feelings',
    label:     'How I Feel',
    sub:       'Share your feelings',
    color:     '#C9B8FF',
    textColor: '#4527A0',
    bg:        '#F3F0FF',
    illustration: 2,
  },
  {
    id:        'bodymap',
    label:     'My Voice',
    sub:       'Say what you need',
    color:     '#FFB8A8',
    textColor: '#8B2500',
    bg:        '#FFF3F0',
    illustration: 3,
  },
  {
    id:        'learn',
    label:     'Play & Learn',
    sub:       'Games and practice',
    color:     '#AED9F7',
    textColor: '#0D47A1',
    bg:        '#E4F4FF',
    illustration: 4,
  },
  {
    id:        'myroamly',
    label:     'My Place',
    sub:       'Make it yours',
    color:     '#B8F0C8',
    textColor: '#1B5E3B',
    bg:        '#F0FFF5',
    illustration: 5,
  },
];

// Direct requires for SVG assets
const illustrationMap = {
  1: require('../assets/illustrations/emotions/Swing-rafiki(excited Emotion).svg'),
  2: require('../assets/illustrations/emotions/Happy baby-cuate.svg'),
  3: require('../assets/illustrations/emotions/In love-pana(i want a hug).svg'),
  4: require('../assets/illustrations/designs/People celebrating Holi Festival-amico.svg'),
  5: require('../assets/illustrations/emotions/Hide and seek game-cuate(playful).svg'),
};

// SVG asset paths
const SVG_ASSETS = {
  mascotDay:   require('../assets/illustrations/designs/Dog paw-cuate(the mascot).svg'),
  mascotNight: require('../assets/illustrations/greetings/Sleeping baby-rafiki (1)(good night).svg'),
  nature:      require('../assets/illustrations/nature/Nature-pana.svg'),
  cherryTree:  require('../assets/illustrations/greetings/cherry tree-pana.svg'),
  happySun:    require('../assets/illustrations/emotions/Happy Sun-cuate.svg'),
};

export default function WorldScreen() {
  const { activeChild, session, selectChild, signOut, checkPin } = useApp();
  const timeOfDay = getTimeOfDay();
  const [activeMode,    setActiveMode]    = useState(null);
  const [theme,         setTheme]         = useState(activeChild?.avatar_config?.theme || 'space');
  const [svgs,          setSvgs]          = useState({});
  const [showBubble,    setShowBubble]    = useState(true);
  const [childProfiles, setChildProfiles] = useState([]);
  const [showProfiles,  setShowProfiles]  = useState(false);
  const [avatarXml,     setAvatarXml]     = useState(null);
  const [caregiverPinVisible, setCaregiverPinVisible] = useState(false);
  const [caregiverPin, setCaregiverPin] = useState('');
  const [caregiverPinError, setCaregiverPinError] = useState(false);
  const [addChildVisible, setAddChildVisible] = useState(false);
  const [addChildPin, setAddChildPin] = useState('');
  const [addChildPinError, setAddChildPinError] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [savingChild, setSavingChild] = useState(false);
  const [childAge, setChildAge] = useState('');
  const [commLevel, setCommLevel] = useState('');
  const [focusAreas, setFocusAreas] = useState([]);
  const [profileStep, setProfileStep] = useState(1);
  const [signOutPinVisible, setSignOutPinVisible] = useState(false);
  const [signOutPin, setSignOutPin] = useState('');
  const [signOutPinError, setSignOutPinError] = useState(false);

  const config  = TIME_CONFIG[timeOfDay];
  const isNight = timeOfDay === 'night';

  const overlayY       = useRef(new Animated.Value(height)).current;
  const worldFade      = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mascotBounce   = useRef(new Animated.Value(0)).current;
  const bubbleScale    = useRef(new Animated.Value(0.9)).current;
  const sunRotate      = useRef(new Animated.Value(0)).current;

  // Staggered entrance animations for zone bubbles
  const zoneAnims = useRef(ZONES.map(() => ({
    scale:   new Animated.Value(0.5),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    loadSvgs();
    loadAvatar();
    loadChildProfiles();
    startAnimations();
    const t = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(t);
  }, [activeChild?.id, activeChild?.avatar_config?.avatarStyle, activeChild?.avatar_config?.avatarSeed]);

  async function loadSvgs() {
    const loaded = {};
    for (const [key, source] of Object.entries(SVG_ASSETS)) {
      try {
        const uri  = Image.resolveAssetSource(source).uri;
        const res  = await fetch(uri);
        loaded[key] = await res.text();
      } catch (e) {
        console.log('SVG load failed', key, e);
      }
    }
    setSvgs(loaded);
  }

  async function loadAvatar() {
    try {
      const config = activeChild?.avatar_config;
      const style  = config?.avatarStyle || 'thumbs';
      const seed   = config?.avatarSeed  || activeChild?.name || 'roamly';
      const url    = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&radius=50`;
      const res    = await fetch(url);
      const xml    = await res.text();
      setAvatarXml(xml);
    } catch (e) {
      console.log('Avatar load failed', e);
    }
  }

  async function loadChildProfiles() {
    try {
      const { data } = await supabase
        .from('child')
        .select('id, name, avatar_config')
        .eq('caregiver_id', session?.user?.id);
      setChildProfiles(data || []);
    } catch (e) {
      console.log('Profiles load failed', e);
    }
  }

  function startAnimations() {
    // Mascot gentle float
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, { toValue: -8, duration: 1600, useNativeDriver: true }),
        Animated.timing(mascotBounce, { toValue: 0,  duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Speech bubble pop in
    Animated.spring(bubbleScale, {
      toValue: 1, useNativeDriver: true, tension: 60, friction: 8,
    }).start();

    // Sun slow spin
    Animated.loop(
      Animated.timing(sunRotate, {
        toValue: 1, duration: 12000, useNativeDriver: true,
      })
    ).start();

    // Zone bubbles staggered entrance
    ZONES.forEach((_, i) => {
      Animated.sequence([
        Animated.delay(200 + i * 120),
        Animated.parallel([
          Animated.spring(zoneAnims[i].scale, {
            toValue: 1, useNativeDriver: true, tension: 55, friction: 9,
          }),
          Animated.timing(zoneAnims[i].opacity, {
            toValue: 1, duration: 300, useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }

  function openMode(zoneId) {
    setActiveMode(zoneId);
    setShowBubble(false);
    Animated.parallel([
      Animated.spring(overlayY, {
        toValue: 0, useNativeDriver: true, tension: 65, friction: 12,
      }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(worldFade,      { toValue: 0.2, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  function closeMode() {
    Animated.parallel([
      Animated.timing(overlayY,       { toValue: height, duration: 320, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(worldFade,      { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setActiveMode(null);
      setShowBubble(true);
      setTimeout(() => setShowBubble(false), 4000);
    });
  }

  const sunSpin = sunRotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const mascotKey = 'mascotDay';

  return (
    <View style={[styles.root, { backgroundColor: config.bg }]}>

      {/* ── Atmospheric background layer ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: worldFade }]} pointerEvents="none">
        <WorldBackground />
      </Animated.View>

      {/* ── Main content ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: worldFade }]}>
        <SafeAreaView style={styles.safeArea}>

          {/* Greeting row with avatar */}
          <View style={styles.greetingRow}>
            {/* Avatar — tap to switch profiles */}
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => setShowProfiles(true)}
              accessibilityLabel="Switch profile"
            >
              {avatarXml
                ? <SvgXml xml={avatarXml} width={44} height={44} />
                : <View style={styles.avatarPlaceholder} />
              }
            </TouchableOpacity>

            <Text style={styles.greeting}>
              Hi, {activeChild?.name} 👋
            </Text>

            {/* Spacer to center the greeting */}
            <View style={{ width: 44 }} />
          </View>

          {/* Zone bubbles — organic placement */}
          <View style={styles.zonesWrapper}>
            {/* First 4 in 2x2 grid */}
            <View style={styles.zonesGrid}>
              {ZONES.slice(0, 4).map((zone, i) => (
                <ZoneBubble key={zone.id} zone={zone} anim={zoneAnims[i]} onPress={openMode} />
              ))}
            </View>
            {/* My Place centered at bottom */}
            <View style={styles.zonesLastRow}>
              <ZoneBubble zone={ZONES[4]} anim={zoneAnims[4]} onPress={openMode} />
            </View>
          </View>

          {/* Caregiver button */}
          <TouchableOpacity
            style={styles.caregiverBtn}
            onPress={() => setCaregiverPinVisible(true)}
          >
            <Text style={styles.caregiverIcon}>⚙️</Text>
          </TouchableOpacity>

        </SafeAreaView>
      </Animated.View>

      {/* Profile switcher — Netflix style */}
      {showProfiles && (
        <TouchableOpacity
          style={styles.profilesBackdrop}
          onPress={() => setShowProfiles(false)}
          activeOpacity={1}
        >
          <View style={styles.profilesSheet}>
            <Text style={styles.profilesTitle}>Switch Profile</Text>
            <View style={styles.profilesRow}>
              {childProfiles.map((child) => (
                <ProfileCard
                  key={child.id}
                  child={child}
                  isActive={child.id === activeChild?.id}
                  onPress={() => {
                    selectChild(child);
                    setShowProfiles(false);
                  }}
                />
              ))}
            </View>

            {childProfiles.length < 3 && (
              <TouchableOpacity
                style={styles.addChildBtn}
                onPress={() => {
                  setProfileStep(1);
                  setAddChildPin('');
                  setAddChildPinError(false);
                  setNewChildName('');
                  setAddChildVisible(true);
                }}
              >
                <Text style={styles.addChildBtnText}>＋ Add Child</Text>
              </TouchableOpacity>
            )}

            {/* Sign out — PIN protected, red */}
            <TouchableOpacity
              style={st_signout.btn}
              onPress={() => setSignOutPinVisible(true)}
            >
              <Text style={st_signout.text}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Mode overlay ── */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity:   overlayOpacity,
            transform: [{ translateY: overlayY }],
          },
        ]}
        pointerEvents={activeMode ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={closeMode}
          accessibilityLabel="Go back"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ModeContent
          mode={activeMode}
          onClose={closeMode}
          onThemeChange={setTheme}
        />
      </Animated.View>

      {/* ── Caregiver PIN Modal ── */}
      <Modal visible={caregiverPinVisible} transparent animationType="fade">
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Caregiver Access</Text>
            <Text style={styles.pinSub}>Enter your PIN to open the dashboard</Text>
            <TextInput
              style={[styles.pinField, caregiverPinError && { borderColor: '#FF7757' }]}
              value={caregiverPin}
              onChangeText={t => { setCaregiverPin(t); setCaregiverPinError(false); }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="····"
              placeholderTextColor="#C4C4C4"
              autoFocus
            />
            {caregiverPinError && <Text style={styles.pinError}>Incorrect PIN</Text>}
            <View style={styles.pinRow}>
              <TouchableOpacity style={styles.pinCancel} onPress={() => {
                setCaregiverPinVisible(false);
                setCaregiverPin('');
                setCaregiverPinError(false);
              }}>
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pinConfirm} onPress={() => {
                if (checkPin(caregiverPin)) {
                  setCaregiverPinVisible(false);
                  setCaregiverPin('');
                  Linking.openURL('https://roamly-dashboard.vercel.app');
                } else {
                  setCaregiverPinError(true);
                  setCaregiverPin('');
                }
              }}>
                <Text style={styles.pinConfirmText}>Open Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Child Modal ── */}
      <Modal visible={addChildVisible} transparent animationType="fade">
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>

            {/* Step 1 — PIN */}
            {profileStep === 1 && (
              <>
                <Text style={styles.pinTitle}>Caregiver Access</Text>
                <Text style={styles.pinSub}>Enter your PIN to add a child profile</Text>
                <TextInput
                  style={[styles.pinField, addChildPinError && { borderColor: '#FF7757' }]}
                  value={addChildPin}
                  onChangeText={t => { setAddChildPin(t); setAddChildPinError(false); }}
                  keyboardType="number-pad" secureTextEntry maxLength={4}
                  placeholder="····" placeholderTextColor="#C4C4C4" autoFocus
                />
                {addChildPinError && <Text style={styles.pinError}>Incorrect PIN</Text>}
                <View style={styles.pinRow}>
                  <TouchableOpacity style={styles.pinCancel} onPress={() => setAddChildVisible(false)}>
                    <Text style={styles.pinCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pinConfirm} onPress={() => {
                    if (checkPin(addChildPin)) { setProfileStep(2); }
                    else { setAddChildPinError(true); setAddChildPin(''); }
                  }}>
                    <Text style={styles.pinConfirmText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2 — Name */}
            {profileStep === 2 && (
              <>
                <Text style={styles.pinTitle}>What's their name?</Text>
                <Text style={styles.pinSub}>Step 1 of 3</Text>
                <TextInput
                  style={[styles.pinField, { fontSize: 18, letterSpacing: 0 }]}
                  value={newChildName} onChangeText={setNewChildName}
                  placeholder="Child's name" placeholderTextColor="#C4C4C4"
                  autoCapitalize="words" autoFocus maxLength={30}
                />
                <View style={styles.pinRow}>
                  <TouchableOpacity style={styles.pinCancel} onPress={() => setProfileStep(1)}>
                    <Text style={styles.pinCancelText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pinConfirm, !newChildName.trim() && { opacity: 0.5 }]}
                    disabled={!newChildName.trim()}
                    onPress={() => setProfileStep(3)}
                  >
                    <Text style={styles.pinConfirmText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 3 — Age + Communication level */}
            {profileStep === 3 && (
              <>
                <Text style={styles.pinTitle}>About {newChildName}</Text>
                <Text style={styles.pinSub}>Step 2 of 3</Text>

                <Text style={styles.profileLabel}>How old are they?</Text>
                <View style={styles.profileChipRow}>
                  {['2-3', '4-5', '6-7', '8-9', '10-12', '13+'].map(age => (
                    <TouchableOpacity
                      key={age}
                      style={[styles.profileChip, childAge === age && styles.profileChipActive]}
                      onPress={() => setChildAge(age)}
                    >
                      <Text style={[styles.profileChipText, childAge === age && styles.profileChipTextActive]}>
                        {age}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.profileLabel}>Communication level</Text>
                <View style={styles.profileChipRow}>
                  {['Nonverbal', 'Some words', 'Short sentences', 'Conversational'].map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.profileChip, commLevel === level && styles.profileChipActive]}
                      onPress={() => setCommLevel(level)}
                    >
                      <Text style={[styles.profileChipText, commLevel === level && styles.profileChipTextActive]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.pinRow}>
                  <TouchableOpacity style={styles.pinCancel} onPress={() => setProfileStep(2)}>
                    <Text style={styles.pinCancelText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pinConfirm, (!childAge || !commLevel) && { opacity: 0.5 }]}
                    disabled={!childAge || !commLevel}
                    onPress={() => setProfileStep(4)}
                  >
                    <Text style={styles.pinConfirmText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 4 — Focus areas */}
            {profileStep === 4 && (
              <>
                <Text style={styles.pinTitle}>What to focus on?</Text>
                <Text style={styles.pinSub}>Step 3 of 3 — Pick all that apply</Text>

                <View style={styles.profileChipRow}>
                  {['Emotions', 'Daily routines', 'Social skills', 'Communication', 'Body awareness', 'Learning', 'Behaviour'].map(area => (
                    <TouchableOpacity
                      key={area}
                      style={[styles.profileChip, focusAreas.includes(area) && styles.profileChipActive]}
                      onPress={() => setFocusAreas(prev =>
                        prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                      )}
                    >
                      <Text style={[styles.profileChipText, focusAreas.includes(area) && styles.profileChipTextActive]}>
                        {area}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.pinRow}>
                  <TouchableOpacity style={styles.pinCancel} onPress={() => setProfileStep(3)}>
                    <Text style={styles.pinCancelText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pinConfirm, savingChild && { opacity: 0.5 }]}
                    disabled={savingChild}
                    onPress={async () => {
                      setSavingChild(true);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        const { data, error } = await supabase
                          .from('child')
                          .insert({
                            caregiver_id: user.id,
                            name: newChildName.trim(),
                            avatar_config: {
                              avatarStyle: 'thumbs',
                              avatarSeed: newChildName.trim(),
                              age: childAge,
                              commLevel,
                              focusAreas,
                            },
                            theme: 'default',
                            music_pref: 'soft_piano',
                          })
                          .select()
                          .single();
                        if (!error && data) {
                          setChildProfiles(prev => [...prev, data]);
                        }
                      } catch (_) {}
                      setSavingChild(false);
                      setAddChildVisible(false);
                      setNewChildName('');
                      setChildAge('');
                      setCommLevel('');
                      setFocusAreas([]);
                      setProfileStep(1);
                    }}
                  >
                    {savingChild
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.pinConfirmText}>Create Profile ✨</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

          </View>
        </View>
      </Modal>

      {/* Sign Out Modal — PIN protected */}
      <Modal visible={signOutPinVisible} transparent animationType="fade">
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Sign Out</Text>
            <Text style={styles.pinSub}>Enter your PIN to sign out</Text>
            <TextInput
              style={[styles.pinField, signOutPinError && { borderColor: '#FF7757' }]}
              value={signOutPin}
              onChangeText={t => { setSignOutPin(t); setSignOutPinError(false); }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="····"
              placeholderTextColor="#C4C4C4"
              autoFocus
            />
            {signOutPinError && <Text style={styles.pinError}>Incorrect PIN</Text>}
            <View style={styles.pinRow}>
              <TouchableOpacity
                style={styles.pinCancel}
                onPress={() => { setSignOutPinVisible(false); setSignOutPin(''); setSignOutPinError(false); }}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinConfirm, { backgroundColor: '#FF4444' }]}
                onPress={() => {
                  if (checkPin(signOutPin)) {
                    setSignOutPinVisible(false);
                    setShowProfiles(false);
                    setSignOutPin('');
                    signOut();
                  } else {
                    setSignOutPinError(true);
                    setSignOutPin('');
                  }
                }}
              >
                <Text style={styles.pinConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ZONE_POSITIONS removed — cards now use flexWrap in 2x2 grid, not absolute positioning

// Zone bubble — card in 2x2 grid layout
function ZoneBubble({ zone, anim, onPress }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const [svgXml, setSvgXml] = useState(null);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadIllustration();
    // Gentle float — each card drifts at slightly different speed
    const duration = 2200 + Math.random() * 800;
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -5, duration, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue:  0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadIllustration() {
    try {
      const asset = illustrationMap[zone.illustration];
      if (!asset) {
        console.log('No illustration found for', zone.id);
        return;
      }
      // Asset is a require() call - get its URI
      const uri = Image.resolveAssetSource(asset).uri;
      const res = await fetch(uri);
      const text = await res.text();
      setSvgXml(text);
    } catch (e) {
      console.log('Zone illustration failed', zone.id, e.message || e);
    }
  }

  function onPressIn() {
    Animated.spring(pressScale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
  }
  function onPressOut() {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }

  return (
    <Animated.View style={[
      styles.zoneBubbleOuter,
      {
        opacity:   anim.opacity,
        transform: [
          { scale: Animated.multiply(anim.scale, pressScale) },
          { translateY: floatAnim },
        ],
      },
    ]}>
      <TouchableOpacity
        onPress={() => onPress(zone.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        accessibilityLabel={zone.label}
        accessibilityRole="button"
      >
        <View style={[styles.zoneCard, { backgroundColor: zone.bg }]}>

          {/* Top color edge — thick accent bar */}
          <View style={[styles.zoneEdge, { backgroundColor: zone.color }]} />

          {/* Illustration — large, centered, breathing room */}
          <View style={styles.zoneArtArea}>
            {svgXml
              ? <SvgXml xml={svgXml} width={100} height={100} />
              : <View style={{ width: 100, height: 100 }} />
            }
          </View>

          {/* Footer label strip */}
          <View style={styles.zoneLabelArea}>
            <Text style={[styles.zoneLabel, { color: zone.textColor }]} numberOfLines={1}>
              {zone.label}
            </Text>
            <Text style={[styles.zoneSub, { color: zone.textColor + '99' }]} numberOfLines={1}>
              {zone.sub}
            </Text>
          </View>

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ProfileCard({ child, isActive, onPress }) {
  const [xml, setXml] = useState(null);

  useEffect(() => {
    loadAvatar();
  }, []);

  async function loadAvatar() {
    try {
      const style = child.avatar_config?.avatarStyle || 'thumbs';
      const seed  = child.avatar_config?.avatarSeed  || child.name;
      const url   = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&radius=50`;
      const res   = await fetch(url);
      setXml(await res.text());
    } catch (e) {}
  }

  return (
    <TouchableOpacity
      style={[styles.profileCard, isActive && styles.profileCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.profileAvatar, isActive && styles.profileAvatarActive]}>
        {xml
          ? <SvgXml xml={xml} width={56} height={56} />
          : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#EDE9FF' }} />
        }
      </View>
      <Text style={[styles.profileName, isActive && styles.profileNameActive]}>
        {child.name}
      </Text>
      {isActive && <View style={styles.profileActiveDot} />}
    </TouchableOpacity>
  );
}

function ModeContent({ mode, onClose, onThemeChange }) {
  if (mode === 'feelings')  return <FeelingsContent onClose={onClose} />;
  if (mode === 'myroamly')  return <MyRoamlyContent onClose={onClose} onThemeChange={onThemeChange} />;
  if (mode === 'bodymap')   return <AACScreen onClose={onClose} />;
  if (mode === 'journey')   return <JourneyScreen onClose={onClose} />;
  if (mode === 'learn')     return <LearnScreen onClose={onClose} />;
  return null;
}


const st_signout = StyleSheet.create({
  btn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#FF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF4444',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  blob: {
    position: 'absolute',
  },
  cherryTree: {
    position: 'absolute',
    top: height * 0.08,
    left: -40,
    opacity: 0.55,
  },
  natureScene: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    opacity: 0.4,
  },
  happySun: {
    position: 'absolute',
    top: 40,
    right: 20,
    opacity: 0.8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FF',
  },
  zonesWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
    zIndex: 1,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  zonesLastRow: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
  },
  zoneBubbleOuter: {
    width: '46%',
  },
  zoneCard: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  zoneEdge: {
    height: 7,
    width: '100%',
  },
  zoneArtArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 8,
    minHeight: 120,
  },
  zoneLabelArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 2,
  },
  zoneLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  zoneSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  mascotArea: {
    alignItems: 'flex-end',
    paddingBottom: 60,
    paddingRight: 8,
    zIndex: 0,
  },
  speechBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: width * 0.6,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  speechText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D3D',
    lineHeight: 20,
  },
  speechTail: {
    position: 'absolute',
    bottom: -8,
    right: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: '#fff',
  },
  mascotWrapper: {
    width: 80,
    height: 80,
  },
  mascotPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FF',
  },
  caregiverBtn: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caregiverIcon: {
    fontSize: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F9F7FF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  closeBtn: {
    position: 'absolute',
    top: 20, right: 20,
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: '#EDE9FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#7C6AF7',
    fontWeight: '800',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderEmoji: { fontSize: 64 },
  placeholderTitle: { fontSize: 28, fontWeight: '800', color: '#3D3D3D' },
  placeholderSub:   { fontSize: 16, color: '#9E9E9E' },
  profilesBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  profilesSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
  },
  profilesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3D3D3D',
    textAlign: 'center',
    marginBottom: 24,
  },
  profilesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  profileCard: {
    alignItems: 'center',
    gap: 8,
  },
  profileCardActive: {},
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F9F7FF',
    borderWidth: 3,
    borderColor: '#EDE9FF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarActive: {
    borderColor: '#7C6AF7',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  profileNameActive: {
    color: '#7C6AF7',
    fontWeight: '800',
  },
  profileActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C6AF7',
  },
  pinOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  pinCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    width: '100%', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 28, elevation: 12,
  },
  pinTitle: { fontSize: 20, fontWeight: '800', color: '#3D3D3D', textAlign: 'center' },
  pinSub: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' },
  pinField: {
    borderWidth: 2, borderColor: '#C4C4C4', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
    fontSize: 24, textAlign: 'center', letterSpacing: 8, color: '#3D3D3D', minHeight: 60,
  },
  pinError: { color: '#FF7757', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  pinRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  pinCancel: {
    flex: 1, borderWidth: 2, borderColor: '#C4C4C4', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center',
  },
  pinCancelText: { fontSize: 14, color: '#9E9E9E', fontWeight: '600' },
  pinConfirm: {
    flex: 1, backgroundColor: '#7C6AF7', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center',
  },
  pinConfirmText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  addChildBtn: {
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#EDE9FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addChildBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C6AF7',
  },
  profileLabel: {
    fontSize: 13, fontWeight: '700', color: '#3D3D3D', marginBottom: 6, marginTop: 4,
  },
  profileChipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
  },
  profileChip: {
    borderWidth: 1.5, borderColor: '#C4C4C4', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#F9F7FF',
  },
  profileChipActive: {
    borderColor: '#7C6AF7', backgroundColor: '#EDE9FF',
  },
  profileChipText: {
    fontSize: 13, fontWeight: '600', color: '#9E9E9E',
  },
  profileChipTextActive: {
    color: '#7C6AF7',
  },
});