// src/screens/AACScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Dimensions, Modal, TextInput, FlatList, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {
    Person, Users, Question, Lightning, MapPin, Clock,
    Heart, Star, House, Drop, Cookie,
    Ball, Book, MusicNote, Bed, HandWaving, ArrowLeft,
    SpeakerHigh, Trash, Plus, Check, X,
    ArrowFatUp, ArrowFatDown, ArrowRight, Smiley, MagnifyingGlass, Hash,
    ForkKnife, Toilet, Car, Sun, Tree,
    Dog, Cat, Phone, Television, GameController, Tooth,
    FirstAid, Warning, ThumbsUp, ThumbsDown, Coffee,
} from 'phosphor-react-native';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

const ICON_KEYWORD_MAP = [
  { keywords: ['mom','mother','mama'],         icon: Person      },
  { keywords: ['dad','father','papa'],         icon: Person      },
  { keywords: ['baby','sister','brother'],     icon: Person      },
  { keywords: ['friend','teacher','doctor'],   icon: Person      },
  { keywords: ['dog','puppy'],                 icon: Dog         },
  { keywords: ['cat','kitten'],                icon: Cat         },
  { keywords: ['food','eat','meal'],           icon: ForkKnife   },
  { keywords: ['water','drink','juice'],       icon: Drop        },
  { keywords: ['home','house'],                icon: House       },
  { keywords: ['school','class'],              icon: Book        },
  { keywords: ['ball','sport','game'],         icon: Ball        },
  { keywords: ['music','song'],                icon: MusicNote   },
  { keywords: ['phone','call'],                icon: Phone       },
  { keywords: ['tv','video','watch'],          icon: Television  },
  { keywords: ['book','read','story'],         icon: Book        },
  { keywords: ['car','ride','drive'],          icon: Car         },
  { keywords: ['park','outside','garden'],     icon: Tree        },
  { keywords: ['sleep','bed','nap','tired'],   icon: Bed         },
  { keywords: ['hurt','pain','sick','ache'],   icon: FirstAid    },
  { keywords: ['happy','love','like'],         icon: Heart       },
  { keywords: ['angry','mad','stop'],          icon: Warning     },
  { keywords: ['star','good','great','best'],  icon: Star        },
  { keywords: ['sun','hot','warm','day'],      icon: Sun         },
  { keywords: ['help','please'],               icon: HandWaving  },
  { keywords: ['yes','ok','okay'],             icon: Check       },
  { keywords: ['no','not','never'],            icon: X           },
  { keywords: ['more','again','another'],      icon: Plus        },
  { keywords: ['where','place','location'],    icon: MapPin      },
  { keywords: ['time','when','clock'],         icon: Clock       },
  { keywords: ['people','person','who'],       icon: Users       },
];

function matchIconToWord(label) {
  const lower = label.toLowerCase().trim();
  for (const entry of ICON_KEYWORD_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.icon;
  }
  return null;
}

const C = {
    purple: '#7C6AF7',
    coral: '#FF7757',
    bg: '#F9F7FF',
    dark: '#3D3D3D',
    muted: '#9E9E9E',
    inactive: '#C4C4C4',
    white: '#fff',
    completed: '#EDE9FF',
};

const CAT_COLORS = {
    all: { bg: '#F9F7FF', border: '#7C6AF7', text: '#3D00C8' },
    core: { bg: '#FFF3C4', border: '#FFD166', text: '#7A5C00' },
    people: { bg: '#FFE8E2', border: '#FF7757', text: '#8B2500' },
    actions: { bg: '#EDE9FF', border: '#7C6AF7', text: '#3D00C8' },
    feelings: { bg: '#FFE8F5', border: '#F48FB1', text: '#880044' },
    places: { bg: '#D4F4E2', border: '#52C788', text: '#1B5E3B' },
    food: { bg: '#FFF3C4', border: '#FFD166', text: '#7A5C00' },
    objects: { bg: '#E4F4FF', border: '#64B5F6', text: '#0D47A1' },
    social: { bg: '#F3E5F5', border: '#CE93D8', text: '#4A148C' },
    numbers: { bg: '#E4F4FF', border: '#64B5F6', text: '#0D47A1' },
    body: { bg: '#FFE8E2', border: '#FF7757', text: '#8B2500' },
    custom: { bg: '#F9F7FF', border: '#7C6AF7', text: '#3D00C8' },
};

const CATEGORIES = [
    { id: 'all', label: 'All Words', icon: Star },
    { id: 'core', label: 'Core', icon: Star },
    { id: 'people', label: 'People', icon: Person },
    { id: 'actions', label: 'Actions', icon: Lightning },
    { id: 'feelings', label: 'Feelings', icon: Heart },
    { id: 'places', label: 'Places', icon: MapPin },
    { id: 'food', label: 'Food', icon: ForkKnife },
    { id: 'objects', label: 'Objects', icon: Star },
    { id: 'social', label: 'Social', icon: HandWaving },
    { id: 'numbers', label: 'Numbers', icon: Hash },
    { id: 'body', label: 'Body', icon: Person },
    { id: 'custom', label: 'My Words', icon: Plus },
];

const DEFAULT_WORDS = {
    core: [
        { id: 'i', label: 'I', icon: Person },
        { id: 'you', label: 'You', icon: Users },
        { id: 'want', label: 'Want', icon: Heart },
        { id: 'need', label: 'Need', icon: Warning },
        { id: 'like', label: 'Like', icon: ThumbsUp },
        { id: 'dont', label: "Don't", icon: ThumbsDown },
        { id: 'can', label: 'Can', icon: Check },
        { id: 'is', label: 'Is', icon: null },
        { id: 'the', label: 'The', icon: null },
        { id: 'a', label: 'A', icon: null },
        { id: 'my', label: 'My', icon: null },
        { id: 'more', label: 'More', icon: Plus },
        { id: 'no', label: 'No', icon: X },
        { id: 'yes', label: 'Yes', icon: Check },
        { id: 'help', label: 'Help', icon: FirstAid },
        { id: 'stop', label: 'Stop', icon: Warning },
        { id: 'go', label: 'Go', icon: ArrowRight },
        { id: 'here', label: 'Here', icon: MapPin },
        { id: 'that', label: 'That', icon: null },
        { id: 'with', label: 'With', icon: Users },
        { id: 'in', label: 'In', icon: null },
        { id: 'on', label: 'On', icon: null },
        { id: 'at', label: 'At', icon: MapPin },
        { id: 'for', label: 'For', icon: null },
        { id: 'and', label: 'And', icon: Plus },
        { id: 'not', label: 'Not', icon: X },
        { id: 'what', label: 'What', icon: Question },
        { id: 'where', label: 'Where', icon: MapPin },
        { id: 'when', label: 'When', icon: Clock },
        { id: 'who', label: 'Who', icon: Person },
        { id: 'up', label: 'Up', icon: ArrowFatUp },
        { id: 'down', label: 'Down', icon: ArrowFatDown },
        { id: 'out', label: 'Out', icon: null },
        { id: 'off', label: 'Off', icon: null },
        { id: 'now', label: 'Now', icon: Clock },
        { id: 'later', label: 'Later', icon: Clock },
        { id: 'today', label: 'Today', icon: Sun },
        { id: 'tomorrow', label: 'Tomorrow', icon: Sun },
        { id: 'before', label: 'Before', icon: null },
        { id: 'after', label: 'After', icon: null },
        { id: 'big', label: 'Big', icon: null },
        { id: 'little', label: 'Little', icon: null },
        { id: 'fast', label: 'Fast', icon: Lightning },
        { id: 'slow', label: 'Slow', icon: null },
        { id: 'same', label: 'Same', icon: null },
        { id: 'different', label: 'Different', icon: null },
        { id: 'because', label: 'Because', icon: null },
        { id: 'if', label: 'If', icon: null },
        { id: 'but', label: 'But', icon: null },
    ],
    people: [
        { id: 'mom', label: 'Mom', icon: Person },
        { id: 'dad', label: 'Dad', icon: Person },
        { id: 'friend', label: 'Friend', icon: Users },
        { id: 'teacher', label: 'Teacher', icon: Person },
        { id: 'doctor', label: 'Doctor', icon: FirstAid },
        { id: 'me', label: 'Me', icon: Person },
        { id: 'we', label: 'We', icon: Users },
        { id: 'they', label: 'They', icon: Users },
        { id: 'baby', label: 'Baby', icon: Person },
    ],
    actions: [
        { id: 'eat', label: 'Eat', icon: ForkKnife },
        { id: 'drink', label: 'Drink', icon: Drop },
        { id: 'go', label: 'Go', icon: ArrowRight },
        { id: 'come', label: 'Come', icon: ArrowFatUp },
        { id: 'play', label: 'Play', icon: GameController },
        { id: 'sleep', label: 'Sleep', icon: Bed },
        { id: 'read', label: 'Read', icon: Book },
        { id: 'watch', label: 'Watch', icon: Television },
        { id: 'listen', label: 'Listen', icon: MusicNote },
        { id: 'stop', label: 'Stop', icon: Warning },
        { id: 'help', label: 'Help', icon: FirstAid },
        { id: 'finish', label: 'Finish', icon: Check },
        { id: 'give', label: 'Give', icon: null },
        { id: 'sit', label: 'Sit', icon: null },
        { id: 'walk', label: 'Walk', icon: null },
        { id: 'open', label: 'Open', icon: null },
        { id: 'take', label: 'Take', icon: null },
        { id: 'put', label: 'Put', icon: null },
        { id: 'turn', label: 'Turn', icon: null },
        { id: 'stand', label: 'Stand', icon: ArrowFatUp },
        { id: 'wash', label: 'Wash', icon: Drop },
        { id: 'brush', label: 'Brush', icon: null },
        { id: 'dress', label: 'Dress', icon: null },
        { id: 'hug', label: 'Hug', icon: Heart },
        { id: 'show', label: 'Show', icon: null },
        { id: 'tell', label: 'Tell', icon: null },
        { id: 'make', label: 'Make', icon: null },
        { id: 'find', label: 'Find', icon: null },
    ],
    feelings: [
        { id: 'happy', label: 'Happy', icon: Smiley },
        { id: 'sad', label: 'Sad', icon: Smiley },
        { id: 'angry', label: 'Angry', icon: Warning },
        { id: 'scared', label: 'Scared', icon: Warning },
        { id: 'tired', label: 'Tired', icon: Bed },
        { id: 'hungry', label: 'Hungry', icon: ForkKnife },
        { id: 'thirsty', label: 'Thirsty', icon: Drop },
        { id: 'hurt', label: 'Hurt', icon: FirstAid },
        { id: 'sick', label: 'Sick', icon: FirstAid },
        { id: 'excited', label: 'Excited', icon: Star },
        { id: 'confused', label: 'Confused', icon: Question },
        { id: 'calm', label: 'Calm', icon: Heart },
        { id: 'love', label: 'Love', icon: Heart },
        { id: 'bored', label: 'Bored', icon: null },
    ],
    places: [
        { id: 'home', label: 'Home', icon: House },
        { id: 'school', label: 'School', icon: Book },
        { id: 'bathroom', label: 'Bathroom', icon: Toilet },
        { id: 'bedroom', label: 'Bedroom', icon: Bed },
        { id: 'outside', label: 'Outside', icon: Sun },
        { id: 'car', label: 'Car', icon: Car },
        { id: 'kitchen', label: 'Kitchen', icon: ForkKnife },
        { id: 'park', label: 'Park', icon: null },
        { id: 'store', label: 'Store', icon: null },
        { id: 'here', label: 'Here', icon: MapPin },
        { id: 'there', label: 'There', icon: MapPin },
    ],
    food: [
        { id: 'water', label: 'Water', icon: Drop },
        { id: 'milk', label: 'Milk', icon: Drop },
        { id: 'juice', label: 'Juice', icon: Drop },
        { id: 'food', label: 'Food', icon: ForkKnife },
        { id: 'snack', label: 'Snack', icon: Cookie },
        { id: 'cookie', label: 'Cookie', icon: Cookie },
        { id: 'fruit', label: 'Fruit', icon: null },
        { id: 'bread', label: 'Bread', icon: null },
        { id: 'meat', label: 'Meat', icon: null },
        { id: 'rice', label: 'Rice', icon: null },
        { id: 'hot', label: 'Hot', icon: Sun },
        { id: 'cold', label: 'Cold', icon: null },
        { id: 'egg', label: 'Egg', icon: null },
        { id: 'soup', label: 'Soup', icon: null },
        { id: 'pasta', label: 'Pasta', icon: null },
        { id: 'pizza', label: 'Pizza', icon: null },
        { id: 'chicken', label: 'Chicken', icon: null },
        { id: 'fish', label: 'Fish', icon: null },
        { id: 'salad', label: 'Salad', icon: null },
        { id: 'sandwich', label: 'Sandwich', icon: null },
        { id: 'cereal', label: 'Cereal', icon: null },
        { id: 'yogurt', label: 'Yogurt', icon: null },
        { id: 'cheese', label: 'Cheese', icon: null },
        { id: 'butter', label: 'Butter', icon: null },
        { id: 'sugar', label: 'Sugar', icon: null },
        { id: 'sweet', label: 'Sweet', icon: Cookie },
        { id: 'spicy', label: 'Spicy', icon: Warning },
        { id: 'yummy', label: 'Yummy', icon: ThumbsUp },
        { id: 'yucky', label: 'Yucky', icon: ThumbsDown },
    ],
    objects: [
        { id: 'toy', label: 'Toy', icon: Ball },
        { id: 'book', label: 'Book', icon: Book },
        { id: 'phone', label: 'Phone', icon: Phone },
        { id: 'tablet', label: 'Tablet', icon: Television },
        { id: 'tv', label: 'TV', icon: Television },
        { id: 'music', label: 'Music', icon: MusicNote },
        { id: 'ball', label: 'Ball', icon: Ball },
        { id: 'blanket', label: 'Blanket', icon: null },
        { id: 'cup', label: 'Cup', icon: Coffee },
        { id: 'dog', label: 'Dog', icon: Dog },
        { id: 'cat', label: 'Cat', icon: Cat },
    ],
    social: [
        { id: 'hello', label: 'Hello', icon: HandWaving },
        { id: 'bye', label: 'Bye', icon: HandWaving },
        { id: 'please', label: 'Please', icon: Heart },
        { id: 'thanks', label: 'Thanks', icon: ThumbsUp },
        { id: 'sorry', label: 'Sorry', icon: Heart },
        { id: 'good', label: 'Good', icon: ThumbsUp },
        { id: 'bad', label: 'Bad', icon: ThumbsDown },
        { id: 'wait', label: 'Wait', icon: Clock },
        { id: 'together', label: 'Together', icon: Users },
        { id: 'again', label: 'Again', icon: null },
    ],
    numbers: [
        { id: '0',    label: '0',     icon: null },
        { id: '1',    label: '1',     icon: null },
        { id: '2',    label: '2',     icon: null },
        { id: '3',    label: '3',     icon: null },
        { id: '4',    label: '4',     icon: null },
        { id: '5',    label: '5',     icon: null },
        { id: '6',    label: '6',     icon: null },
        { id: '7',    label: '7',     icon: null },
        { id: '8',    label: '8',     icon: null },
        { id: '9',    label: '9',     icon: null },
        { id: '10',   label: '10',    icon: null },
        { id: 'many', label: 'Many',  icon: null },
        { id: 'some', label: 'Some',  icon: null },
        { id: 'few',  label: 'Few',   icon: null },
        { id: 'lots', label: 'Lots',  icon: null },
    ],
    body: [
        { id: 'head', label: 'Head', icon: Person },
        { id: 'throat', label: 'Throat', icon: null },
        { id: 'stomach', label: 'Stomach', icon: null },
        { id: 'hand', label: 'Hand', icon: null },
        { id: 'arm', label: 'Arm', icon: null },
        { id: 'leg', label: 'Leg', icon: null },
        { id: 'foot', label: 'Foot', icon: null },
        { id: 'back', label: 'Back', icon: null },
        { id: 'eye', label: 'Eye', icon: null },
        { id: 'ear', label: 'Ear', icon: null },
        { id: 'nose', label: 'Nose', icon: null },
        { id: 'mouth', label: 'Mouth', icon: null },
        { id: 'tooth', label: 'Tooth', icon: Tooth },
        { id: 'hair', label: 'Hair', icon: null },
        { id: 'skin', label: 'Skin', icon: null },
        { id: 'heart', label: 'Heart', icon: Heart },
        { id: 'hurts', label: 'Hurts', icon: FirstAid },
        { id: 'itchy', label: 'Itchy', icon: null },
        { id: 'sore', label: 'Sore', icon: FirstAid },
        { id: 'bleeding', label: 'Bleeding', icon: FirstAid },
    ],
};

export default function AACScreen({ onClose }) {
    const { activeChild, checkPin } = useApp();
    const { width: W } = useWindowDimensions();
    const NUM_COLUMNS = W > 700 ? 7 : W > 500 ? 5 : 4;
    const CARD_SIZE = Math.floor((W - 48) / NUM_COLUMNS) - 8;

    const [sentence, setSentence] = useState([]);
    const [activeCategory, setActiveCategory] = useState('core');
    const [customWords, setCustomWords] = useState([]);
    const [pinVisible, setPinVisible] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [addWordVisible, setAddWordVisible] = useState(false);
    const [newWord, setNewWord] = useState('');
    const [newWordCategory, setNewWordCategory] = useState('people');
    const [speaking, setSpeaking] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { loadCustomWords(); }, [activeChild]);

    async function loadCustomWords() {
        try {
            const { data } = await supabase
                .from('child').select('avatar_config')
                .eq('id', activeChild.id).single();
            if (data?.avatar_config?.customWords) setCustomWords(data.avatar_config.customWords);
        } catch (_) { }
    }

    async function saveCustomWords(words) {
        try {
            const { data } = await supabase
                .from('child').select('avatar_config')
                .eq('id', activeChild.id).single();
            const updated = { ...(data?.avatar_config || {}), customWords: words };
            await supabase.from('child').update({ avatar_config: updated }).eq('id', activeChild.id);
        } catch (_) { }
    }

    function addToSentence(word) {
        Speech.speak(word.label, { rate: 0.9, pitch: 1.0, language: 'en-US' });
        setSentence(prev => [...prev, word]);
    }

    function removeLastWord() { setSentence(prev => prev.slice(0, -1)); }

    function clearSentence() { setSentence([]); Speech.stop(); }

    function speakSentence() {
        if (sentence.length === 0) return;
        
        // Merge consecutive number words into one token (e.g. "1" + "2" → "12")
        const merged = [];
        let numBuffer = '';
        
        sentence.forEach((word, i) => {
            const isNum = /^\d+$/.test(word.label);
            if (isNum) {
                numBuffer += word.label;
            } else {
                if (numBuffer) { merged.push(numBuffer); numBuffer = ''; }
                merged.push(word.label);
            }
        });
        if (numBuffer) merged.push(numBuffer);
        
        const text = merged.join(' ');
        setSpeaking(true);
        Speech.speak(text, {
            rate: 0.85, pitch: 1.0, language: 'en-US',
            onDone: () => setSpeaking(false),
            onStopped: () => setSpeaking(false),
        });
    }

    function openAddWord() { setPinInput(''); setPinError(false); setPinVisible(true); }

    function submitPin() {
        if (checkPin(pinInput)) { setPinVisible(false); setNewWord(''); setAddWordVisible(true); }
        else { setPinError(true); setPinInput(''); }
    }

    async function saveNewWord() {
        if (!newWord.trim() || !newWordCategory) return;
        const word = {
            id: Date.now().toString(),
            label: newWord.trim(),
            icon: matchIconToWord(newWord.trim()),
            category: newWordCategory,
        };
        const updated = [...customWords, word];
        setCustomWords(updated);
        await saveCustomWords(updated);
        setNewWord('');
        setNewWordCategory('people');
        setAddWordVisible(false);
        setActiveCategory(newWordCategory);
    }

    async function deleteCustomWord(wordId) {
        const updated = customWords.filter(w => w.id !== wordId);
        setCustomWords(updated);
        await saveCustomWords(updated);
    }

    const renderWord = useCallback(({ item }) => {
        const colors = (activeCategory === 'all' || searchQuery.trim())
            ? CAT_COLORS[item.category] || CAT_COLORS.core
            : CAT_COLORS[activeCategory] || CAT_COLORS.core;
        return (
            <WordCard
                item={item}
                colors={colors}
                cardSize={CARD_SIZE}
                onPress={addToSentence}
                onLongPress={activeCategory === 'custom' ? deleteCustomWord : null}
            />
        );
    }, [activeCategory, searchQuery, customWords, CARD_SIZE]);

    const allWords = [
        ...Object.entries(DEFAULT_WORDS).flatMap(([cat, words]) =>
            words.map(w => ({ ...w, category: cat }))
        ),
        ...customWords,
    ];

    const baseWords = activeCategory === 'all'
        ? allWords
        : activeCategory === 'custom'
        ? customWords
        : [
            ...(DEFAULT_WORDS[activeCategory] || []),
            ...customWords.filter(w => w.category === activeCategory),
          ];

    const currentWords = searchQuery.trim()
        ? allWords.filter(w => w.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : baseWords;

    return (
        <SafeAreaView style={st.screen}>

            {/* Header */}
            <View style={st.header}>
                <TouchableOpacity style={st.backBtn} onPress={onClose}>
                    <ArrowLeft size={22} color={C.dark} weight="bold" />
                </TouchableOpacity>
                <Text style={st.headerTitle}>My Voice</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search bar */}
            <View style={st.searchBar}>
                <MagnifyingGlass size={16} color={C.muted} weight="bold" />
                <TextInput
                    style={st.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search words..."
                    placeholderTextColor={C.inactive}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={16} color={C.muted} weight="bold" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Sentence bar */}
            <View style={st.sentenceBar}>
                <ScrollView
                    horizontal showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }} contentContainerStyle={st.sentenceScroll}
                >
                    {sentence.length === 0
                        ? <Text style={st.placeholder}>Tap cards to build a sentence...</Text>
                        : sentence.map((word, i) => (
                            <View key={`${word.id}-${i}`} style={st.chip}>
                                <Text style={st.chipText}>{word.label}</Text>
                            </View>
                        ))
                    }
                </ScrollView>
                <View style={st.sentenceActions}>
                    {sentence.length > 0 && (
                        <TouchableOpacity style={st.actionBtn} onPress={removeLastWord}>
                            <ArrowLeft size={18} color={C.muted} weight="bold" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[st.speakBtn, speaking && { backgroundColor: C.coral }]}
                        onPress={speakSentence}
                        disabled={sentence.length === 0}
                    >
                        <SpeakerHigh size={22} color={C.white} weight="fill" />
                    </TouchableOpacity>
                    {sentence.length > 0 && (
                        <TouchableOpacity style={st.clearBtn} onPress={clearSentence}>
                            <Trash size={18} color={C.coral} weight="bold" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category tabs */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={st.catScroll} contentContainerStyle={st.catRow}
            >
                {CATEGORIES.map(cat => {
                    const IconComp = cat.icon;
                    const isActive = activeCategory === cat.id;
                    const colors = CAT_COLORS[cat.id] || CAT_COLORS.core;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[st.catTab, isActive && { backgroundColor: colors.bg, borderColor: colors.border }]}
                            onPress={() => setActiveCategory(cat.id)}
                        >
                            <IconComp size={15} color={isActive ? colors.text : C.muted} weight={isActive ? 'fill' : 'regular'} />
                            <Text style={[st.catTabText, isActive && { color: colors.text, fontWeight: '700' }]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Word grid */}
            {activeCategory === 'all' && !searchQuery.trim() ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {[
                  { id: 'people',   label: 'People'   },
                  { id: 'actions',  label: 'Actions'  },
                  { id: 'feelings', label: 'Feelings' },
                  { id: 'places',   label: 'Places'   },
                  { id: 'food',     label: 'Food'     },
                  { id: 'objects',  label: 'Objects'  },
                  { id: 'social',   label: 'Social'   },
                  { id: 'numbers',  label: 'Numbers'  },
                  { id: 'core',     label: 'Core Words'},
                  ...(customWords.length > 0 ? [{ id: 'custom', label: 'My Words' }] : []),
                ].map(section => {
                  const words = section.id === 'custom'
                    ? customWords
                    : DEFAULT_WORDS[section.id] || [];
                  const colors = CAT_COLORS[section.id] || CAT_COLORS.core;
                  if (words.length === 0) return null;
                  return (
                    <View key={section.id} style={{ marginBottom: 20 }}>
                      {/* Section header */}
                      <View style={[st.sectionHeader, { borderLeftColor: colors.border }]}>
                        <Text style={[st.sectionHeaderText, { color: colors.text }]}>{section.label}</Text>
                      </View>
                      {/* Cards grid */}
                      <View style={st.sectionGrid}>
                        {words.map(item => {
                          const IconComp = item.icon;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[st.wordCard, { width: CARD_SIZE, height: CARD_SIZE, backgroundColor: colors.bg, borderColor: colors.border }]}
                              onPress={() => addToSentence(item)}
                              activeOpacity={0.75}
                              onLongPress={() => section.id === 'custom' && deleteCustomWord(item.id)}
                              delayLongPress={600}
                            >
                              {IconComp && <IconComp size={26} color={colors.text} weight="duotone" />}
                              <Text style={[st.wordLabel, { color: colors.text }]} numberOfLines={1}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={currentWords}
                keyExtractor={item => `${item.category || 'default'}-${item.id}`}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={st.grid}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={st.emptyState}>
                        <Text style={st.emptyText}>No words yet</Text>
                        <TouchableOpacity style={st.emptyBtn} onPress={openAddWord}>
                            <Text style={st.emptyBtnText}>＋ Add a word</Text>
                        </TouchableOpacity>
                    </View>
                }
                ListFooterComponent={
                    activeCategory === 'custom' && currentWords.length > 0 ? (
                        <TouchableOpacity style={st.addWordBtn} onPress={openAddWord}>
                            <Plus size={16} color={C.purple} weight="bold" />
                            <Text style={st.addWordBtnText}>Add Word</Text>
                        </TouchableOpacity>
                    ) : null
                }
                renderItem={renderWord}
              />
            )}

            {/* PIN modal */}
            <Modal visible={pinVisible} transparent animationType="fade">
                <View style={st.overlay}>
                    <View style={st.modal}>
                        <Text style={st.modalTitle}>Caregiver Access</Text>
                        <Text style={st.modalSub}>Enter PIN to add custom words</Text>
                        <TextInput
                            style={[st.pinInput, pinError && { borderColor: C.coral }]}
                            value={pinInput}
                            onChangeText={t => { setPinInput(t); setPinError(false); }}
                            keyboardType="number-pad" secureTextEntry maxLength={4}
                            placeholder="····" placeholderTextColor={C.inactive} autoFocus
                        />
                        {pinError && <Text style={st.pinError}>Incorrect PIN</Text>}
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

            {/* Add word modal */}
            <Modal visible={addWordVisible} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={st.modal}>
                        <Text style={st.modalTitle}>Add a Word</Text>
                        <Text style={st.modalSub}>Type the word and choose its category</Text>
                        
                        <TextInput
                            style={[st.pinInput, { fontSize: 18, letterSpacing: 0 }]}
                            value={newWord}
                            onChangeText={setNewWord}
                            placeholder="e.g. Eden, Grandma, soccer..."
                            placeholderTextColor={C.inactive}
                            autoCapitalize="words"
                            autoFocus
                            maxLength={20}
                        />

                        <Text style={[st.modalSub, { textAlign: 'left', marginTop: 4 }]}>Category</Text>
                        <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {CATEGORIES.filter(c => c.id !== 'custom').map(cat => {
                                    const colors = CAT_COLORS[cat.id] || CAT_COLORS.core;
                                    const isSelected = newWordCategory === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[st.catTab, isSelected && { backgroundColor: colors.bg, borderColor: colors.border }]}
                                            onPress={() => setNewWordCategory(cat.id)}
                                        >
                                            <Text style={[st.catTabText, isSelected && { color: colors.text, fontWeight: '700' }]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={st.modalRow}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setAddWordVisible(false)}>
                                <Text style={st.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.confirmBtn, (!newWord.trim() || !newWordCategory) && { opacity: 0.5 }]}
                                onPress={saveNewWord}
                                disabled={!newWord.trim() || !newWordCategory}
                            >
                                <Text style={st.confirmText}>Add Word</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const WordCard = React.memo(({ item, colors, cardSize, onPress, onLongPress }) => {
    const IconComp = item.icon;
    return (
        <TouchableOpacity
            style={[st.wordCard, { width: cardSize, height: cardSize, backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => onPress(item)}
            activeOpacity={0.75}
            onLongPress={() => onLongPress && onLongPress(item.id)}
            delayLongPress={600}
        >
            {IconComp && <IconComp size={26} color={colors.text} weight="duotone" />}
            <Text style={[st.wordLabel, { color: colors.text }]} numberOfLines={1}>
                {item.label}
            </Text>
        </TouchableOpacity>
    );
});

const st = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: C.white, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: C.dark },

    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.white, marginHorizontal: 12,
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 8, borderWidth: 1.5, borderColor: C.inactive,
    },
    searchInput: {
        flex: 1, fontSize: 14, color: C.dark,
    },

    sentenceBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.white, marginHorizontal: 12,
        borderRadius: 18, padding: 10, marginBottom: 10,
        minHeight: 64, borderWidth: 2, borderColor: C.completed,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    sentenceScroll: { alignItems: 'center', gap: 6, paddingRight: 8 },
    placeholder: { fontSize: 14, color: C.inactive, fontStyle: 'italic', paddingLeft: 4 },
    chip: { backgroundColor: C.completed, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontSize: 15, fontWeight: '700', color: C.purple },
    sentenceActions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
    actionBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
    },
    speakBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: C.purple, justifyContent: 'center', alignItems: 'center',
        shadowColor: C.purple, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    },
    clearBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FFF0ED', justifyContent: 'center', alignItems: 'center',
    },

    catScroll: { flexGrow: 0, marginBottom: 10 },
    catRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
    catTab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: C.inactive, backgroundColor: C.white,
    },
    catTabText: { fontSize: 12, fontWeight: '500', color: C.muted },

    grid: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
    sectionHeader: {
      borderLeftWidth: 4, paddingLeft: 10,
      marginBottom: 10, marginTop: 4,
    },
    sectionHeaderText: {
      fontSize: 13, fontWeight: '800',
      textTransform: 'uppercase', letterSpacing: 0.6,
    },
    sectionGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    },
    wordCard: {
        borderRadius: 16, borderWidth: 1.5,
        justifyContent: 'center', alignItems: 'center',
        gap: 6, margin: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    wordLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },

    emptyState: { alignItems: 'center', paddingTop: 40, gap: 14 },
    emptyText: { fontSize: 15, color: C.muted },
    emptyBtn: {
        backgroundColor: C.purple, borderRadius: 14,
        paddingVertical: 12, paddingHorizontal: 24,
    },
    emptyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
    addWordBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        justifyContent: 'center', paddingVertical: 14,
        borderWidth: 2, borderColor: C.completed,
        borderRadius: 14, marginHorizontal: 12,
        marginTop: 8, borderStyle: 'dashed',
    },
    addWordBtnText: { fontSize: 14, fontWeight: '700', color: C.purple },

    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modal: {
        backgroundColor: C.white, borderRadius: 24, padding: 26,
        width: '100%', maxWidth: 360, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15, shadowRadius: 28, elevation: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, textAlign: 'center' },
    modalSub: { fontSize: 13, color: C.muted, textAlign: 'center' },
    pinInput: {
        borderWidth: 2, borderColor: C.inactive, borderRadius: 14,
        paddingVertical: 14, paddingHorizontal: 20,
        fontSize: 24, textAlign: 'center', letterSpacing: 8,
        color: C.dark, minHeight: 60,
    },
    pinError: { color: C.coral, fontSize: 13, textAlign: 'center', fontWeight: '500' },
    modalRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
    cancelBtn: {
        flex: 1, borderWidth: 2, borderColor: C.inactive, borderRadius: 14,
        paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center',
    },
    cancelText: { fontSize: 14, color: C.muted, fontWeight: '600' },
    confirmBtn: {
        flex: 1, backgroundColor: C.purple, borderRadius: 14,
        paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center',
    },
    confirmText: { fontSize: 14, color: C.white, fontWeight: '700' },
});