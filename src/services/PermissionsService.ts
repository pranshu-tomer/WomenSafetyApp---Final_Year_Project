import { PermissionsAndroid, Platform, Alert } from 'react-native';

export class PermissionsService {
    /**
     * Request CALL_PHONE permission
     */
    static async requestCallPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true; // iOS handles permissions differently
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CALL_PHONE,
                {
                    title: 'Phone Call Permission',
                    message: 'This app needs permission to make emergency phone calls when a threat is detected.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.error('Error requesting call permission:', error);
            return false;
        }
    }

    /**
     * Request SEND_SMS permission
     */
    static async requestSMSPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true; // iOS handles permissions differently
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.SEND_SMS,
                {
                    title: 'SMS Permission',
                    message: 'This app needs permission to send emergency SMS messages when a threat is detected.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.error('Error requesting SMS permission:', error);
            return false;
        }
    }

    /**
     * Request all required emergency permissions
     */
    static async requestAllEmergencyPermissions(): Promise<{
        call: boolean;
        sms: boolean;
    }> {
        const [callGranted, smsGranted] = await Promise.all([
            this.requestCallPermission(),
            this.requestSMSPermission(),
        ]);

        return {
            call: callGranted,
            sms: smsGranted,
        };
    }

    /**
     * Check if call permission is granted
     */
    static async hasCallPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.CALL_PHONE
            );
            return granted;
        } catch (error) {
            console.error('Error checking call permission:', error);
            return false;
        }
    }

    /**
     * Check if SMS permission is granted
     */
    static async hasSMSPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.SEND_SMS
            );
            return granted;
        } catch (error) {
            console.error('Error checking SMS permission:', error);
            return false;
        }
    }

    /**
     * Show alert when permissions are denied
     */
    static showPermissionDeniedAlert(permissionType: 'call' | 'sms' | 'both'): void {
        let message = '';

        switch (permissionType) {
            case 'call':
                message = 'Phone call permission is required to make emergency calls. Please enable it in app settings.';
                break;
            case 'sms':
                message = 'SMS permission is required to send emergency messages. Please enable it in app settings.';
                break;
            case 'both':
                message = 'Phone and SMS permissions are required for emergency features. Please enable them in app settings.';
                break;
        }

        Alert.alert('Permission Required', message);
    }
}
