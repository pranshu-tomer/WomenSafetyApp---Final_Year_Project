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
} from 'react-native';
import { StorageService } from '../services/StorageService';

interface Props {
    onSetupComplete: () => void;
}

export const EmergencySetup: React.FC<Props> = ({ onSetupComplete }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [contacts, setContacts] = useState<string[]>([]);

    const addContact = () => {
        if (phoneNumber.length < 3) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }
        if (contacts.includes(phoneNumber)) {
            Alert.alert('Duplicate', 'This number is already added');
            return;
        }
        setContacts([...contacts, phoneNumber]);
        setPhoneNumber('');
    };

    const removeContact = (index: number) => {
        const newContacts = [...contacts];
        newContacts.splice(index, 1);
        setContacts(newContacts);
    };

    const finishSetup = async () => {
        if (contacts.length === 0) {
            Alert.alert('No Contacts', 'Please add at least one emergency contact');
            return;
        }
        await StorageService.saveContacts(contacts);
        onSetupComplete();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            <View style={styles.header}>
                <Text style={styles.title}>Emergency Setup</Text>
                <Text style={styles.subtitle}>
                    Add contacts to call when danger is detected.
                </Text>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Phone Number"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                />
                <TouchableOpacity style={styles.addButton} onPress={addContact}>
                    <Text style={styles.addButtonText}>ADD</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={contacts}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                    <View style={styles.contactItem}>
                        <Text style={styles.contactText}>{item}</Text>
                        <TouchableOpacity onPress={() => removeContact(index)}>
                            <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}
                style={styles.list}
                contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity style={styles.finishButton} onPress={finishSetup}>
                <Text style={styles.finishButtonText}>COMPLETE SETUP</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
        padding: 20,
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
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 20,
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
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
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
