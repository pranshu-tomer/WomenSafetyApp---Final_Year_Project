import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { StorageService } from './StorageService';
import { Linking } from 'react-native';

const { AudioProcessor } = NativeModules;
const audioEventEmitter = new NativeEventEmitter(AudioProcessor);

// Keywords mapping (Simplified Model)
const CRITICAL_KEYWORDS = [
    'help', 'help me', 'stop', 'stop it', 'police', 'call police', 'rape', 'attack',
    'bachaao', 'bachao', 'madad', 'chodo', 'mat karo', 'ruko', 'nahi'
];

const ALERT_PHRASES = [
    'don\'t touch', 'get away', 'go away', 'leave me', 'no', 'please'
];

export class ThreatDetector {
    private static instance: ThreatDetector;
    private isMonitoring = false;
    private onThreatUpdate: ((level: string) => void) | null = null;

    private constructor() {
        Voice.onSpeechResults = this.onSpeechResults.bind(this);
    }

    static getInstance(): ThreatDetector {
        if (!ThreatDetector.instance) {
            ThreatDetector.instance = new ThreatDetector();
        }
        return ThreatDetector.instance;
    }

    setThreatUpdateCallback(callback: (level: string) => void) {
        this.onThreatUpdate = callback;
    }

    async requestPermissions(): Promise<boolean> {
        if (Platform.OS === 'android') {
            try {
                const grants = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
                ]);

                return (
                    grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
                    grants['android.permission.CALL_PHONE'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    }

    async startMonitoring() {
        if (this.isMonitoring) return;

        const hasPermissions = await this.requestPermissions();
        if (!hasPermissions) {
            console.error('Permissions not granted');
            return;
        }

        try {
            // Check for Overlay Permission (Required for background calls)
            if (Platform.OS === 'android') {
                await AudioProcessor.checkOverlayPermission();
            }

            // Get contacts
            const contacts = await StorageService.getContacts();
            const emergencyNumber = contacts.length > 0 ? contacts[0] : '';

            // Start Native Audio Processing (Pitch/Energy) with emergency number
            await AudioProcessor.startListening(emergencyNumber);

            // Start Speech Recognition
            await Voice.start('en-US'); // Default to English, can add Hindi locale if needed

            this.isMonitoring = true;
            console.log('Monitoring started');

            // Listen for native events
            audioEventEmitter.addListener('onPitchDetected', (event) => {
                // High pitch might indicate screaming (e.g. > 300Hz for adult male, > 500Hz for female)
                if (event.pitch > 500) {
                    this.updateThreatLevel('HIGH');
                    this.triggerEmergency();
                }
            });

            audioEventEmitter.addListener('onEnergyDetected', (event) => {
                // High energy might indicate loud noise/screaming
                if (event.energy > 80) { // Threshold needs calibration
                    // this.updateThreatLevel('MEDIUM');
                }
            });

        } catch (e) {
            console.error('Failed to start monitoring', e);
        }
    }

    async stopMonitoring() {
        if (!this.isMonitoring) return;

        try {
            await AudioProcessor.stopListening();
            await Voice.stop();
            audioEventEmitter.removeAllListeners('onPitchDetected');
            audioEventEmitter.removeAllListeners('onEnergyDetected');
            this.isMonitoring = false;
            this.updateThreatLevel('SAFE');
            console.log('Monitoring stopped');
        } catch (e) {
            console.error('Failed to stop monitoring', e);
        }
    }

    private onSpeechResults(e: SpeechResultsEvent) {
        if (e.value) {
            const text = e.value.join(' ').toLowerCase();
            console.log('Detected text:', text);
            this.analyzeText(text);
        }
    }

    private analyzeText(text: string) {
        let threatLevel = 'SAFE';

        // Check Critical Keywords
        for (const keyword of CRITICAL_KEYWORDS) {
            if (text.includes(keyword)) {
                threatLevel = 'HIGH';
                break;
            }
        }

        // Check Alert Phrases if not already High
        if (threatLevel === 'SAFE') {
            for (const phrase of ALERT_PHRASES) {
                if (text.includes(phrase)) {
                    threatLevel = 'MEDIUM';
                    break;
                }
            }
        }

        this.updateThreatLevel(threatLevel);

        if (threatLevel === 'HIGH') {
            this.triggerEmergency();
        }
    }

    private updateThreatLevel(level: string) {
        if (this.onThreatUpdate) {
            this.onThreatUpdate(level);
        }
    }

    private async triggerEmergency() {
        console.warn('EMERGENCY TRIGGERED!');
        const contacts = await StorageService.getContacts();

        if (contacts.length > 0) {
            const number = contacts[0]; // Call the first contact
            const url = `tel:${number}`;

            try {
                // Use native module for direct calling
                await AudioProcessor.makeDirectCall(number);
            } catch (e) {
                console.error('Failed to make call', e);
            }
        }
    }
}
