import AsyncStorage from '@react-native-async-storage/async-storage';

const getQueueKey = (childId) => `queue_${childId}`;

// Add a single event to the local queue
export async function enqueueEvent(childId, type, payload) {
    const key = getQueueKey(childId);
    const raw = await AsyncStorage.getItem(key);
    const queue = raw ? JSON.parse(raw) : [];

    queue.push({
        type,
        payload,
        client_timestamp: new Date().toISOString(),
    });

    await AsyncStorage.setItem(key, JSON.stringify(queue));
}

// Read everything currently in the queue
export async function getQueue(childId) {
    const key = getQueueKey(childId);
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
}

// Clear the queue after a successful sync
export async function clearQueue(childId) {
    await AsyncStorage.removeItem(getQueueKey(childId));
}