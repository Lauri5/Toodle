import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  StyleSheet,
  ScrollView, 
} from 'react-native';
import AnimatedBackground from './AnimatedBackground';
import ImageCarousel from './ImageCarousel';
import { useNavigation } from '@react-navigation/native';

const logoPng = require('../assets/logo.png');

const LobbyControls = () => {
  const navigation = useNavigation();

  const [inputLobbyId, setInputLobbyId] = useState('');

  const createLobby = async () => {
    try {
      const res = await fetch('http://192.168.0.66:3001/create-lobby');
      const data = await res.json();
      const lobbyId = data.lobbyId;

      navigation.replace('JoinLobby', { lobbyId });
    } catch (error) {
      console.error('Error', error);
      Alert.alert('Error', 'Creation lobby failed');
    }
  };

  const joinLobby = () => {
    if (inputLobbyId.trim()) {
      navigation.replace('JoinLobby', { lobbyId: inputLobbyId.trim() });
    } else {
    }
  };

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.lobbyContainer}>
              <Image source={logoPng} style={styles.logo} />

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.homeButton} onPress={createLobby}>
                  <Text style={styles.homeButtonText}>Create a Lobby</Text>
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.inputField
                  ]}
                  value={inputLobbyId}
                  keyboardType="numeric"
                  onChangeText={setInputLobbyId}
                  placeholder="Lobby ID"
                />

                <TouchableOpacity style={styles.homeButton} onPress={joinLobby}>
                  <Text style={styles.homeButtonText}>Join a Lobby</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.carouselWrapper}>
              <ImageCarousel />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

export default LobbyControls;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff3ca83',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  lobbyContainer: {
    width: '100%',
    backgroundColor: '#fff3ca83',
    borderWidth: 2,
    borderColor: '#e0ac0096',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: '#fd2228',
    borderWidth: 2,
    borderColor: '#a1181c',
    borderStyle: 'dashed',
    borderRadius: 10,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '80%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputField: {
    borderWidth: 2,
    borderColor: '#a8a69b',
    borderRadius: 8,
    marginVertical: 8,
    fontSize: 16,
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
    width: '80%',
  },
  carouselWrapper: {
    width: '100%',
    alignItems: 'center',
  },
});
