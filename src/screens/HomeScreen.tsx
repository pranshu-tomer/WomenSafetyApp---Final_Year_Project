import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import AudioService from '../services/AudioService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [features, setFeatures] = useState({
        voiceDetection: false,
        powerButton: false,
        runningDetection: false,
        throwDetection: false,
        safeLocation: false,
        switchOffProtection: false,
    });

    const toggleMonitoring = () => {
        if (isMonitoring) {
            AudioService.stopMonitoring();
            setIsMonitoring(false);
        } else {
            setIsMonitoring(true);
            AudioService.startMonitoring((result) => {
                if (result.threat) {
                    setIsMonitoring(false);
                    navigation.navigate('Threat', { details: result.details });
                }
            });
        }
    };

    const toggleFeature = (feature: keyof typeof features) => {
        setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Safety Companion</Text>
                    <Text style={styles.subtitle}>You're Protected</Text>
                </View>
                <TouchableOpacity
                    style={styles.settingsIcon}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Text style={styles.settingsIconText}>⚙️</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Safe Status */}
                <View style={styles.safeContainer}>
                    <View style={styles.safeIcon} />
                    <Text style={styles.safeText}>SAFE</Text>
                </View>

                {/* Threat Level */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Threat Level</Text>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '0%' }]} />
                        </View>
                        <Text style={styles.progressText}>0%</Text>
                    </View>
                </View>

                {/* Start Monitoring Button */}
                <TouchableOpacity
                    style={[styles.monitoringButton, isMonitoring && styles.monitoringButtonActive]}
                    onPress={toggleMonitoring}
                >
                    <Text style={styles.monitoringButtonText}>
                        {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                    </Text>
                    <Text style={styles.monitoringButtonSubtext}>
                        {isMonitoring ? 'Tap to stop protection' : 'Tap to start protection'}
                    </Text>
                </TouchableOpacity>

                {/* Active Protection */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Active Protection</Text>

                    <FeatureItem
                        icon="🎤"
                        title="Voice Detection"
                        isOn={features.voiceDetection}
                        onToggle={() => toggleFeature('voiceDetection')}
                    />
                    <FeatureItem
                        icon="⚪"
                        title="Power Button (5x)"
                        isOn={features.powerButton}
                        onToggle={() => toggleFeature('powerButton')}
                    />
                    <FeatureItem
                        icon="🏃"
                        title="Running Detection"
                        isOn={features.runningDetection}
                        onToggle={() => toggleFeature('runningDetection')}
                    />
                    <FeatureItem
                        icon="💥"
                        title="Throw Detection"
                        isOn={features.throwDetection}
                        onToggle={() => toggleFeature('throwDetection')}
                    />
                    <FeatureItem
                        icon="📍"
                        title="Safe Location"
                        isOn={features.safeLocation}
                        onToggle={() => toggleFeature('safeLocation')}
                    />
                    <FeatureItem
                        icon="📱"
                        title="Switch Off Protection"
                        isOn={features.switchOffProtection}
                        onToggle={() => toggleFeature('switchOffProtection')}
                    />
                </View>
            </ScrollView>
        </View>
    );
};

interface FeatureItemProps {
    icon: string;
    title: string;
    isOn: boolean;
    onToggle: () => void;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, isOn, onToggle }) => (
    <View style={styles.featureItem}>
        <View style={styles.featureLeft}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={styles.featureTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.toggleContainer} onPress={onToggle}>
            <View style={[styles.toggle, isOn && styles.toggleOn]}>
                <View style={[styles.toggleThumb, isOn && styles.toggleThumbOn]} />
            </View>
            <Text style={styles.toggleText}>{isOn ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    settingsIcon: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsIconText: {
        fontSize: 28,
    },
    safeContainer: {
        backgroundColor: '#D1FAE5',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    safeIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10B981',
        marginRight: 16,
    },
    safeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#059669',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        marginRight: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10B981',
    },
    monitoringButton: {
        backgroundColor: '#EF4444',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    monitoringButtonActive: {
        backgroundColor: '#059669',
    },
    monitoringButtonText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    monitoringButtonSubtext: {
        fontSize: 14,
        color: '#FFFFFF',
        marginTop: 4,
        opacity: 0.9,
    },
    featureItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    featureLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    featureIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    featureTitle: {
        fontSize: 16,
        color: '#111827',
    },
    toggleContainer: {
        alignItems: 'center',
    },
    toggle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        marginBottom: 4,
    },
    toggleOn: {
        borderColor: '#10B981',
    },
    toggleThumb: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'transparent',
    },
    toggleThumbOn: {
        backgroundColor: '#10B981',
    },
    toggleText: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '600',
    },
});

export default HomeScreen;
