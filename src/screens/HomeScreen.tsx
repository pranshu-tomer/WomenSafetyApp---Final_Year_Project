import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import AudioService from '../services/AudioService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [isMonitoring, setIsMonitoring] = useState(false);

    const toggleMonitoring = () => {
        if (isMonitoring) {
            AudioService.stopMonitoring();
            setIsMonitoring(false);
        } else {
            setIsMonitoring(true);
            AudioService.startMonitoring((result) => {
                if (result.threat) {
                    setIsMonitoring(false); // Service stops itself on threat usually, but we sync state
                    navigation.navigate('Threat', { details: result.details });
                }
            });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>System Status</Text>
                <Text style={[styles.status, { color: isMonitoring ? 'green' : 'gray' }]}>
                    {isMonitoring ? 'Monitoring Active' : 'Inactive'}
                </Text>
                {isMonitoring && <ActivityIndicator size="large" color="green" style={styles.loader} />}
            </View>

            <View style={styles.buttonContainer}>
                <Button
                    title={isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                    onPress={toggleMonitoring}
                    color={isMonitoring ? "red" : "green"}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    statusContainer: { marginBottom: 50, alignItems: 'center' },
    statusTitle: { fontSize: 20, marginBottom: 10 },
    status: { fontSize: 24, fontWeight: 'bold' },
    loader: { marginTop: 20 },
    buttonContainer: { width: '100%' }
});

export default HomeScreen;
