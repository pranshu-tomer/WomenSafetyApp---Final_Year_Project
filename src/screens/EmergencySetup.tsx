import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    StatusBar,
    Alert,
    ScrollView,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { PermissionsService } from '../services/PermissionsService';

interface Props {
    onSetupComplete: () => void;
}

export const EmergencySetup: React.FC<Props> = ({ onSetupComplete }) => {
    const [callContact, setCallContact] = useState('');
    const [smsPhoneNumber, setSmsPhoneNumber] = useState('');
    const [smsContacts, setSmsContacts] = useState<string[]>([]);

    const addSmsContact = () => {
        if (smsPhoneNumber.length < 3) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }
        if (smsContacts.includes(smsPhoneNumber)) {
            Alert.alert('Duplicate', 'This number is already added to SMS list');
            return;
        }
        setSmsContacts([...smsContacts, smsPhoneNumber]);
        setSmsPhoneNumber('');
    };

    const removeSmsContact = (index: number) => {
        const newContacts = [...smsContacts];
        newContacts.splice(index, 1);
        setSmsContacts(newContacts);
    };

    const finishSetup = async () => {
        // Validate inputs
        if (!callContact || callContact.length < 3) {
            Alert.alert('Missing Call Contact', 'Please add a phone number for emergency calls');
            return;
        }
        if (smsContacts.length === 0) {
            Alert.alert('Missing SMS Contacts', 'Please add at least one contact for emergency SMS');
            return;
        }

        // Request permissions
        const permissions = await PermissionsService.requestAllEmergencyPermissions();

        if (!permissions.call || !permissions.sms) {
            let deniedPerms: 'call' | 'sms' | 'both' = 'both';
            if (permissions.call && !permissions.sms) deniedPerms = 'sms';
            if (!permissions.call && permissions.sms) deniedPerms = 'call';

            PermissionsService.showPermissionDeniedAlert(deniedPerms);

            // Still save contacts but warn user
            Alert.alert(
                'Warning',
                'Some permissions were denied. Emergency features may not work properly. Continue anyway?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Continue',
                        onPress: async () => {
                            await saveAndComplete();
                        },
                    },
                ]
            );
            return;
        }

        await saveAndComplete();
    };

    const saveAndComplete = async () => {
        try {
            await StorageService.saveContacts(callContact, smsContacts);
            Alert.alert('Setup Complete', 'Emergency contacts saved successfully!');
            onSetupComplete();
        } catch (error) {
            Alert.alert('Error', 'Failed to save emergency contacts. Please try again.');
            console.error('Error saving contacts:', error);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            <View style={styles.header}>
                <Text style={styles.title}>Emergency Setup</Text>
                <Text style={styles.subtitle}>
                    Set up emergency contacts for calls and SMS alerts.
                </Text>
            </View>

            {/* CALL CONTACT SECTION */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📞 Emergency Call Contact</Text>
                <Text style={styles.sectionSubtitle}>
                    This contact will be called when threat is detected
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Phone Number for Calls"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                    value={callContact}
                    onChangeText={setCallContact}
                />
                {callContact ? (
                    <View style={styles.contactItem}>
                        <Text style={styles.contactText}>📞 {callContact}</Text>
                        <TouchableOpacity onPress={() => setCallContact('')}>
                            <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>

            {/* SMS CONTACTS SECTION */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💬 SMS Alert Contacts</Text>
                <Text style={styles.sectionSubtitle}>
                    These contacts will receive SMS with your location
                </Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Phone Number for SMS"
                        placeholderTextColor="#666"
                        keyboardType="phone-pad"
                        value={smsPhoneNumber}
                        onChangeText={setSmsPhoneNumber}
                    />
                    <TouchableOpacity style={styles.addButton} onPress={addSmsContact}>
                        <Text style={styles.addButtonText}>ADD</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={smsContacts}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <View style={styles.contactItem}>
                            <Text style={styles.contactText}>💬 {item}</Text>
                            <TouchableOpacity onPress={() => removeSmsContact(index)}>
                                <Text style={styles.removeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    scrollEnabled={false}
                    style={styles.list}
                />
            </View>

            <TouchableOpacity style={styles.finishButton} onPress={finishSetup}>
                <Text style={styles.finishButtonText}>COMPLETE SETUP</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        lineHeight: 24,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 15,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    input: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 12,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 10,
    },
    addButton: {
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: 12,
        marginLeft: 10,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    list: {
        marginTop: 10,
    },
    contactItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 20,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    contactText: {
        color: '#fff',
        fontSize: 18,
    },
    removeText: {
        color: '#FF3B30',
        fontSize: 20,
        fontWeight: 'bold',
    },
    finishButton: {
        backgroundColor: '#34C759',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    finishButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
