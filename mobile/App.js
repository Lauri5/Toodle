import 'react-native-gesture-handler'; // Must be first!
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens'; // Optimizes navigation performance

import LobbyControls from './src/Components/LobbyControls';
import JoinLobby from './src/Components/JoinLobby';

// Enable screen optimizations
enableScreens();

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar hidden={true} />
      <Stack.Navigator
        initialRouteName="LobbyControls"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="LobbyControls" component={LobbyControls} />
        <Stack.Screen name="JoinLobby" component={JoinLobby} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
