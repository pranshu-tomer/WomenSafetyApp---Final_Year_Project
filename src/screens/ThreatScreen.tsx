import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, TextInput, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StorageService } from '../services/StorageService';
import { PermissionsService } from '../services/PermissionsService';

type ThreatScreenRouteProp = RouteProp<RootStackParamList, 'Threat'>;
type ThreatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Threat'>;

const ThreatScreen = () => {
    const navigation = useNavigation<ThreatScreenNavigationProp>();
    const route = useRoute<ThreatScreenRouteProp>();
    const [countdown, setCountdown] = useState(10);
    const [modalVisible, setModalVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [sosTriggered, setSosTriggered] = useState(false);

    // Hardcoded password for demo
    const CORRECT_PASSWORD = '1234';

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && !sosTriggered) {
            // Trigger SOS only once
            setSosTriggered(true);
            triggerSOS();
        }
    }, [countdown, sosTriggered]);

    const triggerSOS = async () => {
        console.log('🚨 SOS TRIGGERED - Starting emergency response');

        try {
            // Get emergency contacts
            console.log('📞 Retrieving emergency contacts...');
            const { callContact, smsContacts } = await StorageService.getAllContacts();
            console.log('Contacts retrieved:', { callContact, smsContacts });

            // Check if contacts are configured
            if (!callContact && smsContacts.length === 0) {
                console.log('❌ No emergency contacts found');
                Alert.alert(
                    'No Emergency Contacts',
                    'No emergency contacts configured. Please set up emergency contacts in Settings.'
                );
                return;
            }

            // Make emergency call
            if (callContact) {
                console.log('📱 Attempting to call:', callContact);
                const hasPermission = await PermissionsService.hasCallPermission();
                console.log('Call permission granted:', hasPermission);

                if (hasPermission) {
                    const phoneUrl = `tel:${callContact}`;
                    const canOpen = await Linking.canOpenURL(phoneUrl);
                    console.log('Can open tel URL:', canOpen);

                    if (canOpen) {
                        console.log('✅ Opening dialer for:', callContact);
                        await Linking.openURL(phoneUrl);
                        Alert.alert('Emergency Call', `Calling ${callContact}...`);
                    } else {
                        console.log('❌ Cannot open tel URL');
                        Alert.alert('Error', 'Unable to make phone call');
                    }
                } else {
                    console.log('❌ Call permission not granted');
                    Alert.alert(
                        'Permission Denied',
                        'Phone call permission not granted. Cannot make emergency call.'
                    );
                }
            } else {
                console.log('⚠️ No call contact configured');
            }

            // Send SMS to all SMS contacts
            if (smsContacts.length > 0) {
                console.log('💬 Attempting to send SMS to:', smsContacts);
                const hasPermission = await PermissionsService.hasSMSPermission();
                console.log('SMS permission granted:', hasPermission);

                if (hasPermission) {
                    await sendEmergencySMS(smsContacts);
                } else {
                    console.log('❌ SMS permission not granted');
                    Alert.alert(
                        'Permission Denied',
                        'SMS permission not granted. Cannot send emergency messages.'
                    );
                }
            } else {
                console.log('⚠️ No SMS contacts configured');
            }
        } catch (error) {
            console.error('❌ Error triggering SOS:', error);
            Alert.alert('Error', `Failed to send emergency alerts: ${error}`);
        }
    };

    const sendEmergencySMS = async (contacts: string[]) => {
        try {
            const message = '🚨 EMERGENCY ALERT! I may be in danger. This is an automated message from my safety app.';

            // For Android, we'll use the SMS intent
            if (Platform.OS === 'android') {
                // Send to each contact
                for (const contact of contacts) {
                    const smsUrl = `sms:${contact}?body=${encodeURIComponent(message)}`;
                    const canOpen = await Linking.canOpenURL(smsUrl);

                    if (canOpen) {
                        await Linking.openURL(smsUrl);
                    }
                }

                Alert.alert(
                    'SMS Sent',
                    `Emergency SMS sent to ${contacts.length} contact(s)`
                );
            }
        } catch (error) {
            console.error('Error sending SMS:', error);
            Alert.alert('Error', 'Failed to send SMS messages');
        }
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
