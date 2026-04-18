// src/Navigation.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from './context/AppContext';

import AuthScreen from './screens/AuthScreen';
import ChildSelectScreen from './screens/ChildSelectScreen';
import WorldScreen from './screens/WorldScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
    const { session, activeChild } = useApp();

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
                {!session ? (
                    // No session — caregiver needs to sign in
                    <Stack.Screen name="Auth" component={AuthScreen} />
                ) : !activeChild ? (
                    // Session exists but no child selected yet
                    <Stack.Screen name="ChildSelect" component={ChildSelectScreen} />
                ) : (
                    // Child is active — enter the world
                    <Stack.Screen name="World" component={WorldScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}