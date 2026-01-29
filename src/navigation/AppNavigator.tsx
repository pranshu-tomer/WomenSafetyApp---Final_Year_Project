import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RegistrationScreen from '../screens/RegistrationScreen';
import HomeScreen from '../screens/HomeScreen';
import ThreatScreen from '../screens/ThreatScreen';

export type RootStackParamList = {
    Registration: undefined;
    Home: undefined;
    Threat: { details?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Registration">
                <Stack.Screen name="Registration" component={RegistrationScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Threat" component={ThreatScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
