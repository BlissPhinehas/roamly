import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const AppContext = createContext({});

export function AppProvider({ children }) {
    const [caregiver, setCaregiver] = useState(null);
    const [activeChild, setActiveChild] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const caregiverPinRef = useRef('');
    const setCaregiverPin = (pin) => { caregiverPinRef.current = pin; };
    const checkPin = (input) => input === caregiverPinRef.current;

    const player = useAudioPlayer(null);
    const [musicOn, setMusicOn] = useState(true);
    const [currentTrackId, setCurrentTrackId] = useState(null);

    const MUSIC_URLS = {
      piano:   'https://cdn.pixabay.com/download/audio/2026/03/27/audio_748373740e.mp3?filename=atlasaudio-soft-509813.mp3',
      lofi:    'https://cdn.pixabay.com/download/audio/2026/01/17/audio_5524f072d7.mp3?filename=franzian-deo-lo-fi-467754.mp3',
      nature:  'https://cdn.pixabay.com/audio/2024/09/10/audio_6e5d7d1912.mp3',
      rain:    'https://cdn.pixabay.com/audio/2022/08/06/audio_4b514cb18f.mp3',
      lullaby: 'https://cdn.pixabay.com/audio/2026/04/08/audio_192268d154.mp3',
      forest:  'https://cdn.pixabay.com/audio/2023/01/29/audio_580d2c877d.mp3',
      ocean:   'https://cdn.pixabay.com/audio/2025/10/06/audio_2f2e635e93.mp3',
    };

    async function playTrack(musicId) {
      const url = MUSIC_URLS[musicId];
      setCurrentTrackId(musicId);
      if (!url || !musicOn) { player.pause(); return; }
      try {
        player.replace({ uri: url });
        player.loop = true;
        player.volume = 0.6;
        player.play();
      } catch (_) {}
    }

    async function toggleMusicOn() {
      const next = !musicOn;
      setMusicOn(next);
      if (!next) { player.pause(); }
      else { playTrack(currentTrackId || 'piano'); }
    }

    useEffect(() => {
      if (!activeChild) return;
      const savedTrack = activeChild?.avatar_config?.music || activeChild?.music_pref || 'piano';
      if (musicOn && savedTrack !== 'silence') {
        playTrack(savedTrack);
      }
    }, [activeChild, musicOn]);

    // Auto-resume music on active child change
    useEffect(() => {
        // check if a session already exists on app launch
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        // restore the last active child from storage
        AsyncStorage.getItem('activeChild').then(raw => {
            if (raw) setActiveChild(JSON.parse(raw));
        });

        return () => subscription.unsubscribe();
    }, []);

    async function selectChild(child) {
        // persist the selected child so it survives app restarts
        setActiveChild(child);
        await AsyncStorage.setItem('activeChild', JSON.stringify(child));
    }

    async function signOut() {
        await supabase.auth.signOut();
        setSession(null);
        setActiveChild(null);
        await AsyncStorage.removeItem('activeChild');
    }

    return (
        <AppContext.Provider value={{
            session,
            caregiver,
            activeChild,
            loading,
            selectChild,
            signOut,
            player,
            musicOn,
            currentTrackId,
            playTrack,
            toggleMusicOn,
            setCaregiverPin,
            checkPin,
        }}>
            {children}
        </AppContext.Provider>
    );
}

// custom hook so any screen can access context with one line
export function useApp() {
    return useContext(AppContext);
}

// Build personalized context string from child profile
export function buildChildContext(child) {
    const config = child?.avatar_config || {};
    const name   = child?.name || 'the child';
    const age    = config.age || '4-8';
    const comm   = config.commLevel || 'nonverbal';
    const focus  = config.focusAreas?.join(', ') || 'daily routines and communication';
    return `Child's name: ${name}. Age range: ${age}. Communication level: ${comm}. Focus areas: ${focus}.`;
}