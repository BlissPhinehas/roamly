// src/screens/AuthScreen.js
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export default function AuthScreen() {
    const { setCaregiverPin } = useApp();

    const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSignIn() {
        if (!email.trim() || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) Alert.alert('Sign in failed', error.message);
        else setCaregiverPin(password);
        setLoading(false);
    }

    async function handleSignUp() {
        if (!email.trim() || !password || !confirm) {
            Alert.alert('Missing fields', 'Please fill in all fields.');
            return;
        }
        if (password !== confirm) {
            Alert.alert('Passwords do not match', 'Please make sure your passwords match.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Password too short', 'Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { name: name.trim() } },
        });
        if (error) {
            Alert.alert('Sign up failed', error.message);
        } else if (data?.user && !data?.session) {
            Alert.alert(
                'Check your email',
                'We sent you a confirmation link. Please verify your email then sign in.',
                [{ text: 'OK', onPress: () => setMode('signin') }]
            );
        } else {
            setCaregiverPin(password);
        }
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView
            style={st.wrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={st.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo */}
                <View style={st.logoArea}>
                    <Text style={st.logo}>roamly</Text>
                    <Text style={st.tagline}>Every child deserves to be heard</Text>
                </View>

                {/* Mode toggle */}
                <View style={st.toggle}>
                    <TouchableOpacity
                        style={[st.toggleBtn, mode === 'signin' && st.toggleBtnActive]}
                        onPress={() => setMode('signin')}
                    >
                        <Text style={[st.toggleText, mode === 'signin' && st.toggleTextActive]}>
                            Sign In
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[st.toggleBtn, mode === 'signup' && st.toggleBtnActive]}
                        onPress={() => setMode('signup')}
                    >
                        <Text style={[st.toggleText, mode === 'signup' && st.toggleTextActive]}>
                            Create Account
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={st.form}>
                    {mode === 'signup' && (
                        <TextInput
                            style={st.input}
                            placeholder="Your name (optional)"
                            placeholderTextColor="#9E9E9E"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            textContentType="name"
                        />
                    )}

                    <TextInput
                        style={st.input}
                        placeholder="Email address"
                        placeholderTextColor="#9E9E9E"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        textContentType="emailAddress"
                    />

                    <TextInput
                        style={st.input}
                        placeholder="Password"
                        placeholderTextColor="#9E9E9E"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                    />

                    {mode === 'signup' && (
                        <TextInput
                            style={st.input}
                            placeholder="Confirm password"
                            placeholderTextColor="#9E9E9E"
                            value={confirm}
                            onChangeText={setConfirm}
                            secureTextEntry
                            textContentType="newPassword"
                        />
                    )}

                    <TouchableOpacity
                        style={[st.button, loading && { opacity: 0.6 }]}
                        onPress={mode === 'signin' ? handleSignIn : handleSignUp}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={st.buttonText}>
                                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                            </Text>
                        }
                    </TouchableOpacity>

                    {mode === 'signin' && (
                        <TouchableOpacity
                            style={st.forgotBtn}
                            onPress={async () => {
                                if (!email.trim()) {
                                    Alert.alert('Enter your email', 'Type your email address above first.');
                                    return;
                                }
                                const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                                if (error) Alert.alert('Error', error.message);
                                else Alert.alert('Email sent', 'Check your inbox for a password reset link.');
                            }}
                        >
                            <Text style={st.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={st.footer}>
                    {mode === 'signin'
                        ? "Don't have an account? "
                        : 'Already have an account? '}
                    <Text
                        style={st.footerLink}
                        onPress={() => {
                            setMode(mode === 'signin' ? 'signup' : 'signin');
                            setPassword(''); setConfirm('');
                        }}
                    >
                        {mode === 'signin' ? 'Create one' : 'Sign in'}
                    </Text>
                </Text>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const st = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#F9F7FF' },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 },

    logoArea: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 44, fontWeight: '800', color: '#7C6AF7', letterSpacing: -1.5 },
    tagline: { fontSize: 14, color: '#9E9E9E', marginTop: 6, textAlign: 'center' },

    toggle: {
        flexDirection: 'row', backgroundColor: '#EDE9FF',
        borderRadius: 14, padding: 4, marginBottom: 28,
    },
    toggleBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    },
    toggleBtnActive: { backgroundColor: '#7C6AF7' },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#9E9E9E' },
    toggleTextActive: { color: '#fff' },

    form: { gap: 12 },
    input: {
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EDE9FF',
        borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
        fontSize: 16, color: '#3D3D3D', minHeight: 60,
    },
    button: {
        backgroundColor: '#7C6AF7', borderRadius: 14, paddingVertical: 18,
        alignItems: 'center', marginTop: 4, minHeight: 60, justifyContent: 'center',
    },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    forgotBtn: { alignItems: 'center', paddingVertical: 10 },
    forgotText: { fontSize: 13, color: '#9E9E9E' },

    footer: { textAlign: 'center', fontSize: 14, color: '#9E9E9E', marginTop: 28 },
    footerLink: { color: '#7C6AF7', fontWeight: '700' },
});