import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, TextInput, Modal, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type ThreatScreenRouteProp = RouteProp<RootStackParamList, 'Threat'>;
type ThreatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Threat'>;

const ThreatScreen = () => {
    const navigation = useNavigation<ThreatScreenNavigationProp>();
    const route = useRoute<ThreatScreenRouteProp>();
    const [countdown, setCountdown] = useState(10);
    const [modalVisible, setModalVisible] = useState(false);
    const [password, setPassword] = useState('');

    // Hardcoded password for demo
    const CORRECT_PASSWORD = '1234';

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // Trigger SOS
            triggerSOS();
        }
    }, [countdown]);

    const triggerSOS = () => {
        Alert.alert("SOS SENT!", "Emergency contacts have been notified with your location.");
        // Logic to actually send SMS/Call would go here
    };

    const handleSafe = () => {
        setModalVisible(true);
    };

    const verifyPassword = () => {
        if (password === CORRECT_PASSWORD) {
            setModalVisible(false);
            navigation.replace('Home');
        } else {
            Alert.alert("Incorrect Password", "Please try again.");
            setPassword('');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.alertText}>⚠️ THREAT DETECTED ⚠️</Text>
            <Text style={styles.detailsText}>{route.params?.details || "Suspicious audio detected"}</Text>

            <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{countdown}</Text>
                <Text style={styles.timerLabel}>seconds to SOS</Text>
            </View>

            <TouchableOpacity style={styles.safeButton} onPress={handleSafe}>
                <Text style={styles.safeButtonText}>I'M SAFE (CANCEL)</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Enter Password to Cancel</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            keyboardType="numeric"
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Cancel" onPress={() => setModalVisible(false)} color="red" />
                            <Button title="Verify" onPress={verifyPassword} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertText: { fontSize: 30, color: 'white', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    detailsText: { fontSize: 18, color: '#ffcccc', marginBottom: 50 },
    timerContainer: { marginBottom: 60, alignItems: 'center' },
    timerText: { fontSize: 80, color: 'white', fontWeight: 'bold' },
    timerLabel: { fontSize: 20, color: 'white' },
    safeButton: { backgroundColor: 'white', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
    safeButtonText: { color: '#800000', fontSize: 18, fontWeight: 'bold' },

    // Modal styles
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
    modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '80%' },
    modalText: { marginBottom: 15, textAlign: 'center', fontSize: 18 },
    input: { borderWidth: 1, borderColor: '#ccc', width: '100%', padding: 10, marginBottom: 20, borderRadius: 5, textAlign: 'center' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }
});

export default ThreatScreen;
