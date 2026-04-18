import { View, Text, StyleSheet } from 'react-native';

export default function JourneyScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>My Romaly</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: '500',
        color: '#7C6AF7',
    },
});