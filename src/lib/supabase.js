import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://esslubroscwzojfkmycd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzc2x1YnJvc2N3em9qZmtteWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTIzODksImV4cCI6MjA5MDQ2ODM4OX0.OAT2MnK_IxksnAbqmrnJomEp8EEKJhaVNMLEaiv1MZU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // store the session in AsyncStorage so it persists across app restarts
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});