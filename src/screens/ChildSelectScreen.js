// src/screens/ChildSelectScreen.js
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export default function ChildSelectScreen() {
    const { session, selectChild } = useApp();
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChildren();
    }, []);

    async function fetchChildren() {
        const { data, error } = await supabase
            .from('child')
            .select('id, name, avatar_config, theme')
            .eq('caregiver_id', session.user.id)
            .order('created_at', { ascending: true });

        if (error) {
            Alert.alert('Could not load profiles', error.message);
        } else {
            setChildren(data);
        }

        setLoading(false);
    }

    function getInitial(name) {
        // Just grab the first letter for the avatar placeholder
        return name ? name.charAt(0).toUpperCase() : '?';
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7C6AF7" />
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <Text style={styles.heading}>Who's using Roamly?</Text>
            <Text style={styles.sub}>Choose a profile to continue</Text>

            <FlatList
                data={children}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => selectChild(item)}
                        activeOpacity={0.8}
                    >
                        {/* Avatar circle with first initial until real avatars are built */}
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
                        </View>
                        <Text style={styles.childName}>{item.name}</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={styles.empty}>
                        No profiles found. Add a child in the caregiver dashboard.
                    </Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#F9F7FF',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    centered: {
        flex: 1,
        backgroundColor: '#F9F7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 28,
        fontWeight: '700',
        color: '#3D3D3D',
        textAlign: 'center',
        marginBottom: 6,
    },
    sub: {
        fontSize: 15,
        color: '#9E9E9E',
        textAlign: 'center',
        marginBottom: 40,
    },
    list: {
        gap: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#EDE9FF',
        paddingVertical: 24,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        // Shadow gives the cards a little lift
        shadowColor: '#7C6AF7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EDE9FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#7C6AF7',
    },
    childName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#3D3D3D',
    },
    empty: {
        textAlign: 'center',
        color: '#9E9E9E',
        fontSize: 15,
        marginTop: 40,
        lineHeight: 24,
    },
});