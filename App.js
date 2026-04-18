import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Network from 'expo-network';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import Navigation from './src/Navigation';

export default function App() {
  useEffect(() => {
    const checkConnection = async () => {
      const status = await Network.getNetworkStateAsync();
      if (status.isConnected) {
        console.log('App online');
      } else {
        console.log('App offline — queue will flush on reconnect');
      }
    };
    checkConnection();
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}