import AsyncStorage from '@react-native-async-storage/async-storage';

const CALL_CONTACT_KEY = '@emergency_call_contact';
const SMS_CONTACTS_KEY = '@emergency_sms_contacts';

export interface EmergencyContacts {
    callContact: string | null;
    smsContacts: string[];
}

export class StorageService {
    /**
     * Save the call contact (only one allowed)
     */
    static async saveCallContact(phoneNumber: string): Promise<void> {
        try {
            await AsyncStorage.setItem(CALL_CONTACT_KEY, phoneNumber);
        } catch (error) {
            console.error('Error saving call contact:', error);
            throw error;
        }
    }

    /**
     * Save SMS contacts (multiple allowed)
     */
    static async saveSMSContacts(phoneNumbers: string[]): Promise<void> {
        try {
            await AsyncStorage.setItem(SMS_CONTACTS_KEY, JSON.stringify(phoneNumbers));
        } catch (error) {
            console.error('Error saving SMS contacts:', error);
            throw error;
        }
    }

    /**
     * Save both call and SMS contacts together
     */
    static async saveContacts(callContact: string, smsContacts: string[]): Promise<void> {
        await Promise.all([
            this.saveCallContact(callContact),
            this.saveSMSContacts(smsContacts),
        ]);
    }

    /**
     * Get the call contact
     */
    static async getCallContact(): Promise<string | null> {
        try {
            const contact = await AsyncStorage.getItem(CALL_CONTACT_KEY);
            return contact;
        } catch (error) {
            console.error('Error getting call contact:', error);
            return null;
        }
    }

    /**
     * Get SMS contacts
     */
    static async getSMSContacts(): Promise<string[]> {
        try {
            const contacts = await AsyncStorage.getItem(SMS_CONTACTS_KEY);
            return contacts ? JSON.parse(contacts) : [];
        } catch (error) {
            console.error('Error getting SMS contacts:', error);
            return [];
        }
    }

    /**
     * Get all emergency contacts
     */
    static async getAllContacts(): Promise<EmergencyContacts> {
        const [callContact, smsContacts] = await Promise.all([
            this.getCallContact(),
            this.getSMSContacts(),
        ]);
        return { callContact, smsContacts };
    }

    /**
     * Clear all emergency contacts
     */
    static async clearAllContacts(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([CALL_CONTACT_KEY, SMS_CONTACTS_KEY]);
        } catch (error) {
            console.error('Error clearing contacts:', error);
            throw error;
        }
    }
}
