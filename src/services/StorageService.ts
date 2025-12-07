import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACTS_KEY = '@emergency_contacts';
const SETUP_COMPLETED_KEY = '@setup_completed';

export const StorageService = {
  async saveContacts(contacts: string[]) {
    try {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
      await AsyncStorage.setItem(SETUP_COMPLETED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save contacts', e);
    }
  },

  async getContacts(): Promise<string[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(CONTACTS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Failed to fetch contacts', e);
      return [];
    }
  },

  async isSetupCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(SETUP_COMPLETED_KEY);
      return value === 'true';
    } catch (e) {
      return false;
    }
  },
  
  async clearStorage() {
      await AsyncStorage.clear();
  }
};
