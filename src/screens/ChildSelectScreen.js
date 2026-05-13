// src/screens/ChildSelectScreen.js
import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    FlatList, ActivityIndicator, Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export default function ChildSelectScreen() {
    const { session, selectChild, loading: contextLoading } = useApp();
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [childName, setChildName] = useState('');
    const [childAge, setChildAge] = useState('');
    const [commLevel, setCommLevel] = useState('');
    const [focusAreas, setFocusAreas] = useState([]);

    useEffect(() => {
        // Only fetch children when session is ready
        if (!contextLoading && session?.user?.id) {
            fetchChildren();
        } else {
            setLoading(!contextLoading);
        }
    }, [session?.user?.id, contextLoading]);

    async function fetchChildren() {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('child').select('id, name, avatar_config, theme')
            .eq('caregiver_id', session.user.id)
            .order('created_at', { ascending: true });
        if (error) Alert.alert('Could not load profiles', error.message);
        else setChildren(data);
        setLoading(false);
    }

    function openAddChild() {
        setChildName(''); setChildAge(''); setCommLevel('');
        setFocusAreas([]); setStep(1); setModalVisible(true);
    }

    async function saveChild() {
        if (!childName.trim()) return;
        setSaving(true);
        try {
            // DEBUG: Check if session and user ID are available
            console.log('session user id:', session?.user?.id);
            console.log('full session:', session);
            
            if (!session?.user?.id) {
                Alert.alert('Error', 'User session not found. Please log in again.');
                setSaving(false);
                return;
            }
            
            const { data, error } = await supabase.from('child').insert({
                caregiver_id: session.user.id,
                name: childName.trim(),
                avatar_config: { avatarStyle: 'thumbs', avatarSeed: childName.trim(), age: childAge, commLevel, focusAreas },
                theme: 'default', music_pref: 'piano',
            }).select().single();
            if (error) Alert.alert('Error', error.message);
            else { setChildren(prev => [...prev, data]); setModalVisible(false); }
        } catch (e) { Alert.alert('Error', e.message); }
        setSaving(false);
    }

    if (loading) return (
        <View style={s.centered}><ActivityIndicator size="large" color="#7C6AF7" /></View>
    );

    return (
        <View style={s.wrapper}>
            <Text style={s.heading}>Who is using Roamly?</Text>
            <Text style={s.sub}>Choose a profile to continue</Text>
            <FlatList
                data={children}
                keyExtractor={item => item.id}
                contentContainerStyle={s.list}
                ListEmptyComponent={
                    <View style={s.emptyState}>
                        <Text style={s.emptyEmoji}>??</Text>
                        <Text style={s.emptyTitle}>No profiles yet</Text>
                        <Text style={s.emptyText}>Create your first child profile to get started</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity style={s.card} onPress={() => selectChild(item)} activeOpacity={0.85}>
                        <View style={s.avatar}>
                            <Text style={s.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
                        </View>
                        <View>
                            <Text style={s.childName}>{item.name}</Text>
                            {item.avatar_config?.age && (
                                <Text style={s.childMeta}>{item.avatar_config.age} � {item.avatar_config.commLevel || 'Nonverbal'}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            />
            {children.length < 3 && (
                <TouchableOpacity style={s.addBtn} onPress={openAddChild}>
                    <Text style={s.addBtnText}>+ Add Child Profile</Text>
                </TouchableOpacity>
            )}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={s.modal}>
                        {step === 1 && (<>
                            <Text style={s.modalTitle}>Child Name</Text>
                            <Text style={s.modalSub}>Step 1 of 3</Text>
                            <TextInput style={s.input} value={childName} onChangeText={setChildName}
                                placeholder="e.g. Eden" placeholderTextColor="#C4C4C4"
                                autoCapitalize="words" autoFocus maxLength={30} />
                            <View style={s.row}>
                                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={s.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.confirmBtn, !childName.trim() && {opacity:0.5}]}
                                    disabled={!childName.trim()} onPress={() => setStep(2)}>
                                    <Text style={s.confirmText}>Next</Text>
                                </TouchableOpacity>
                            </View>
                        </>)}
                        {step === 2 && (<>
                            <Text style={s.modalTitle}>About {childName}</Text>
                            <Text style={s.modalSub}>Step 2 of 3</Text>
                            <Text style={s.fieldLabel}>Age range</Text>
                            <View style={s.chipRow}>
                                {['2-3','4-5','6-7','8-9','10-12','13+'].map(a => (
                                    <TouchableOpacity key={a} style={[s.chip, childAge===a && s.chipActive]} onPress={() => setChildAge(a)}>
                                        <Text style={[s.chipText, childAge===a && s.chipTextActive]}>{a}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={s.fieldLabel}>Communication level</Text>
                            <View style={s.chipRow}>
                                {['Nonverbal','Some words','Short sentences','Conversational'].map(l => (
                                    <TouchableOpacity key={l} style={[s.chip, commLevel===l && s.chipActive]} onPress={() => setCommLevel(l)}>
                                        <Text style={[s.chipText, commLevel===l && s.chipTextActive]}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={s.row}>
                                <TouchableOpacity style={s.cancelBtn} onPress={() => setStep(1)}>
                                    <Text style={s.cancelText}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.confirmBtn, (!childAge||!commLevel) && {opacity:0.5}]}
                                    disabled={!childAge||!commLevel} onPress={() => setStep(3)}>
                                    <Text style={s.confirmText}>Next</Text>
                                </TouchableOpacity>
                            </View>
                        </>)}
                        {step === 3 && (<>
                            <Text style={s.modalTitle}>Focus Areas</Text>
                            <Text style={s.modalSub}>Step 3 of 3 - pick all that apply</Text>
                            <View style={s.chipRow}>
                                {['Emotions','Daily routines','Social skills','Communication','Body awareness','Learning','Behaviour'].map(area => (
                                    <TouchableOpacity key={area}
                                        style={[s.chip, focusAreas.includes(area) && s.chipActive]}
                                        onPress={() => setFocusAreas(prev => prev.includes(area) ? prev.filter(a=>a!==area) : [...prev,area])}>
                                        <Text style={[s.chipText, focusAreas.includes(area) && s.chipTextActive]}>{area}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={s.row}>
                                <TouchableOpacity style={s.cancelBtn} onPress={() => setStep(2)}>
                                    <Text style={s.cancelText}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.confirmBtn, saving && {opacity:0.5}]}
                                    disabled={saving} onPress={saveChild}>
                                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Create Profile</Text>}
                                </TouchableOpacity>
                            </View>
                        </>)}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    wrapper:   { flex:1, backgroundColor:'#F9F7FF', paddingTop:80, paddingHorizontal:32 },
    centered:  { flex:1, backgroundColor:'#F9F7FF', justifyContent:'center', alignItems:'center' },
    heading:   { fontSize:28, fontWeight:'700', color:'#3D3D3D', textAlign:'center', marginBottom:6 },
    sub:       { fontSize:15, color:'#9E9E9E', textAlign:'center', marginBottom:40 },
    list:      { gap:16, paddingBottom:24 },
    emptyState:{ alignItems:'center', paddingVertical:40, gap:10 },
    emptyEmoji:{ fontSize:48 },
    emptyTitle:{ fontSize:18, fontWeight:'700', color:'#3D3D3D' },
    emptyText: { fontSize:14, color:'#9E9E9E', textAlign:'center', lineHeight:22 },
    card:      { backgroundColor:'#fff', borderRadius:20, borderWidth:1.5, borderColor:'#EDE9FF',
                 paddingVertical:24, paddingHorizontal:24, flexDirection:'row', alignItems:'center', gap:20,
                 shadowColor:'#7C6AF7', shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:2 },
    avatar:    { width:64, height:64, borderRadius:32, backgroundColor:'#EDE9FF', justifyContent:'center', alignItems:'center' },
    avatarText:{ fontSize:26, fontWeight:'700', color:'#7C6AF7' },
    childName: { fontSize:20, fontWeight:'600', color:'#3D3D3D' },
    childMeta: { fontSize:13, color:'#9E9E9E', marginTop:3 },
    addBtn:    { borderWidth:2, borderColor:'#7C6AF7', borderStyle:'dashed', borderRadius:16,
                 paddingVertical:16, alignItems:'center', marginTop:16, marginBottom:40 },
    addBtnText:{ fontSize:15, fontWeight:'700', color:'#7C6AF7' },
    overlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
    modal:     { backgroundColor:'#fff', borderTopLeftRadius:28, borderTopRightRadius:28, padding:28, gap:14 },
    modalTitle:{ fontSize:22, fontWeight:'800', color:'#3D3D3D', textAlign:'center' },
    modalSub:  { fontSize:13, color:'#9E9E9E', textAlign:'center' },
    input:     { borderWidth:2, borderColor:'#C4C4C4', borderRadius:14, paddingVertical:14,
                 paddingHorizontal:18, fontSize:18, color:'#3D3D3D', minHeight:60 },
    fieldLabel:{ fontSize:13, fontWeight:'700', color:'#3D3D3D' },
    chipRow:   { flexDirection:'row', flexWrap:'wrap', gap:8 },
    chip:      { borderWidth:1.5, borderColor:'#C4C4C4', borderRadius:20, paddingVertical:8, paddingHorizontal:14, backgroundColor:'#F9F7FF' },
    chipActive:{ borderColor:'#7C6AF7', backgroundColor:'#EDE9FF' },
    chipText:  { fontSize:13, fontWeight:'600', color:'#9E9E9E' },
    chipTextActive:{ color:'#7C6AF7' },
    row:       { flexDirection:'row', gap:10, marginTop:6 },
    cancelBtn: { flex:1, borderWidth:2, borderColor:'#C4C4C4', borderRadius:14, paddingVertical:14, alignItems:'center', minHeight:52, justifyContent:'center' },
    cancelText:{ fontSize:14, color:'#9E9E9E', fontWeight:'600' },
    confirmBtn:{ flex:1, backgroundColor:'#7C6AF7', borderRadius:14, paddingVertical:14, alignItems:'center', minHeight:52, justifyContent:'center' },
    confirmText:{ fontSize:14, color:'#fff', fontWeight:'700' },
});
