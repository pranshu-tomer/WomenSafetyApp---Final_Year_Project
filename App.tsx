import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { EmergencySetup } from './src/screens/EmergencySetup';
import { HomeScreen } from './src/screens/HomeScreen';
import { StorageService } from './src/services/StorageService';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    const completed = await StorageService.isSetupCompleted();
    setIsSetupComplete(completed);
    setIsLoading(false);
  };

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  const handleReset = async () => {
    await StorageService.clearStorage();
    setIsSetupComplete(false);
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {isSetupComplete ? (
        <HomeScreen onReset={handleReset} />
      ) : (
        <EmergencySetup onSetupComplete={handleSetupComplete} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
});

export default App;
