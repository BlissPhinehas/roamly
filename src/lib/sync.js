import { supabase } from './supabase';
import { getQueue, clearQueue } from './offlineQueue';

export async function flushOfflineQueue(childId) {
    const queue = await getQueue(childId);
    if (queue.length === 0) return;

    try {
        const { data, error } = await supabase.functions.invoke('syncOfflineQueue', {
            body: { child_id: childId, events: queue },
        });

        if (error) throw error;

        if (data.conflicts && data.conflicts.length > 0) {
            // log conflicts for the caregiver to see on the dashboard
            console.warn('Sync conflicts detected:', data.conflicts);
        }

        // only clear the queue once the server confirms receipt
        await clearQueue(childId);
        console.log(`Synced ${data.synced_count} events for child ${childId}`);
    } catch (err) {
        // leave the queue intact so it retries on next reconnect
        console.warn('Sync failed, queue preserved for retry:', err.message);
    }
}