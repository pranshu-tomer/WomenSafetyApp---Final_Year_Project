import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated,
    Dimensions,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { ThreatDetector } from '../services/ThreatDetector';

interface Props {
    onReset: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onReset }) => {
    const [isListening, setIsListening] = useState(false);
    const [threatLevel, setThreatLevel] = useState('SAFE'); // SAFE, LOW, MEDIUM, HIGH
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        if (isListening) {
            startPulse();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const toggleListening = async () => {
        const detector = ThreatDetector.getInstance();
        if (isListening) {
            await detector.stopMonitoring();
            setIsListening(false);
        } else {
            detector.setThreatUpdateCallback((level) => {
                setThreatLevel(level);
            });
            await detector.startMonitoring();
            setIsListening(true);
        }
    };

    const getStatusColor = () => {
        switch (threatLevel) {
            case 'SAFE': return '#34C759';
            case 'LOW': return '#FFCC00';
            case 'MEDIUM': return '#FF9500';
            case 'HIGH': return '#FF3B30';
            default: return '#34C759';
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            <View style={styles.header}>
                <Text style={styles.title}>Safety Shield</Text>
                <TouchableOpacity onPress={onReset}>
                    <Text style={styles.settingsText}>⚙️</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.centerContainer}>
                <Animated.View
                    style={[
                        styles.pulseCircle,
                        {
                            borderColor: getStatusColor(),
                            transform: [{ scale: pulseAnim }],
                            opacity: isListening ? 0.5 : 0.1,
                        },
                    ]}
                />
                <View style={[styles.statusCircle, { borderColor: getStatusColor() }]}>
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {threatLevel}
                    </Text>
                </View>
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>
                    {isListening ? 'Monitoring Environment...' : 'Protection Disabled'}
                </Text>
                <Text style={styles.infoSubtitle}>
                    {isListening
                        ? 'AI is analyzing surrounding audio for distress signals.'
                        : 'Tap the button below to activate safety monitoring.'}
                </Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.actionButton,
                    { backgroundColor: isListening ? '#FF3B30' : '#007AFF' },
                ]}
                onPress={toggleListening}
            >
                <Text style={styles.actionButtonText}>
                    {isListening ? 'STOP MONITORING' : 'ACTIVATE SHIELD'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
        padding: 20,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    settingsText: {
        fontSize: 24,
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
    },
    pulseCircle: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 2,
    },
    statusCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1A1A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    statusText: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    infoContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    infoTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    infoSubtitle: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionButton: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
