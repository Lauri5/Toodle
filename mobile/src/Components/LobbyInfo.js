import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedBackground from './AnimatedBackground';

const crown = require('../assets/crown.png');
const esc = require('../assets/esc.png');
const modeChangeIcon = require('../assets/modeChange.png');

const tintColors = {
  Drawings: 'rgba(75, 236, 42, 0.3)',
  Pictures: 'rgba(255, 0, 0, 0.3)',
  AI: 'rgba(0, 162, 255, 0.3)',
};

const tintColorsButtons = {
  Drawings: 'rgb(75, 236, 42)',
  Pictures: 'rgb(214, 44, 44)',
  AI: 'rgb(0, 162, 255)',
};

const tintColorsBorders = {
  Drawings: 'rgba(41, 131, 23, 0.5)',
  Pictures: 'rgba(124, 4, 4, 0.5)',
  AI: 'rgba(4, 80, 124, 0.5)',
};

const tintColorsBacks = {
  Drawings: 'rgba(138, 240, 118, 0.5)',
  Pictures: 'rgba(238, 101, 101, 0.5)',
  AI: 'rgba(99, 186, 236, 0.5)',
};

const tintColorsTexts = {
  Drawings: 'rgb(26, 100, 12)',
  Pictures: 'rgb(124, 4, 4)',
  AI: 'rgb(4, 80, 124)',
};

const LobbyInfo = ({
  gameMode = 'Drawings',
  lobbyId,
  playerName,
  players,
  adminName,
  socket,
  setPlayerName,
  creatingTime,
  narrationTime,
}) => {
  const navigation = useNavigation();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(playerName);
  const [configCreatingTime, setConfigCreatingTime] = useState(creatingTime);
  const [configNarrationTime, setConfigNarrationTime] = useState(narrationTime);

  const gameModes = ['Drawings', 'Pictures', 'AI'];
  const [currentGameMode, setCurrentGameMode] = useState(gameMode);

  const dynamicTheme = {
    tintColor: tintColors[currentGameMode],
    tintColorButton: tintColorsButtons[currentGameMode],
    tintColorBorder: tintColorsBorders[currentGameMode],
    tintColorBack: tintColorsBacks[currentGameMode],
    tintColorText: tintColorsTexts[currentGameMode],
  };

  const styles = makeStyles(dynamicTheme);

  const toggleLobbyId = () => {
    Clipboard.setStringAsync(lobbyId);
    Alert.alert('Codice copiato!', String(lobbyId));
  };

  const copyLobbyLink = () => {
    const lobbyLink = `http://192.168.0.66/?c=${lobbyId}`;
    Clipboard.setStringAsync(lobbyLink);
    Alert.alert('Link copiato!', lobbyLink);
  };

  const startGame = () => {
    handleTimerConfiguration();
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'startGame',
        })
      );
    }
  };

  const leaveLobby = async () => {
    try {
      await AsyncStorage.removeItem('lobbyId');
      await AsyncStorage.removeItem('playerName');
    } catch (err) {
      console.warn('Error removing data from AsyncStorage', err);
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('LobbyControls');
    }
  };

  const handleNameChange = () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      return;
    }
    const isNameTaken = players.some(
      (name) => name === trimmedName && name !== playerName
    );
    if (isNameTaken) {
      Alert.alert("Name taken!", "Pick another name.");
      return;
    }
    if (trimmedName === playerName) {
      setIsEditing(false);
      return;
    }
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'changeName',
          payload: { newName: trimmedName },
        })
      );
      setPlayerName(trimmedName);
      setIsEditing(false);
    }
  };
  
  const handleTimerConfiguration = () => {
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'configureTimers',
          payload: {
            creatingTime: configCreatingTime,
            narrationTime: configNarrationTime,
          },
        })
      );
    }
  };

  const handleGameModeChange = () => {
    const currentIndex = gameModes.indexOf(currentGameMode);
    const nextIndex = (currentIndex + 1) % gameModes.length;
    const newMode = gameModes[nextIndex];
    setCurrentGameMode(newMode);

    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'changeGameMode',
          payload: { gameMode: newMode },
        })
      );
    }
  };

  useEffect(() => {
    const handleSocketMessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'joinSuccess' && data.payload?.gameMode) {
        setCurrentGameMode(data.payload.gameMode);
      }
      if (data.type === 'gameModeChange') {
        setCurrentGameMode(data.payload.gameMode);
      }
    };
  
    if (socket) {
      socket.addEventListener('message', handleSocketMessage);
    }
    
    return () => {
      if (socket) {
        socket.removeEventListener('message', handleSocketMessage);
      }
    };
  }, [socket]);  
  
return (
  <AnimatedBackground>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.containerOut}>
          <View style={styles.container}>
            {/* "Esc" or back button */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.escIconBack} onPress={leaveLobby}>
                <Image source={esc} style={styles.escIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.welcomeContainer}>
              <Text style={styles.sectionTitle}>Welcome</Text>
            </View>
            
            <View>
            {isEditing ? (
                <TextInput
                  style={[styles.nameEditInput]}
                  value={editedName}
                  onChangeText={setEditedName}
                  onEndEditing={() => {
                    setIsEditing(false);
                    handleNameChange();
                  }}
                  maxLength={15}
                  autoFocus
                />
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(true);
                    setEditedName(playerName);
                  }}
                  style={styles.editButton}
                >
                  <Text style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'center',
                    fontWeight: 'bold', 
                    color: dynamicTheme.tintColorText, fontSize: 24}}>
                    {playerName}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.lobbyInfoButton} onPress={copyLobbyLink}>
                <Text style={styles.lobbyInfoButtonText}>Copy Link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.lobbyInfoButton} onPress={toggleLobbyId}>
                <Text style={styles.lobbyInfoButtonText}>Copy Code</Text>
              </TouchableOpacity>
            </View>

            {playerName === adminName ? (
              <View style={styles.adminSection}>
                <View style={styles.timerConfig}>
                  <Text style={styles.sectionSubtitle}>Setup Timers</Text>

                  <View style={styles.timerLabel}>
                    <Text style={styles.labelText}>Creation Timer:</Text>
                    <TextInput
                      style={styles.timerInput}
                      keyboardType="numeric"
                      value={String(configCreatingTime)}
                      onChangeText={(val) => {
                        if (val.length <= 6) {
                          const numericVal = parseInt(val, 10);
                          setConfigCreatingTime(isNaN(numericVal) ? 0 : numericVal);
                        }
                      }}
                    />
                  </View>

                  <View style={styles.timerLabel}>
                    <Text style={styles.labelText}>Narration Timer:</Text>
                    <TextInput
                      style={styles.timerInput}
                      keyboardType="numeric"
                      value={String(configNarrationTime)}
                      onChangeText={(val) => {
                        if (val.length <= 6) {
                          const numericVal = parseInt(val, 10);
                          setConfigNarrationTime(isNaN(numericVal) ? 0 : numericVal);
                        }
                      }}
                    />
                  </View>
                </View>

                <View style={styles.modeConfig}>
                  <Text style={styles.sectionSubtitle}>Gamemode:</Text>
                  <Text style={styles.sectionSubtitle}>{currentGameMode}</Text>
                  <TouchableOpacity
                    style={styles.gameModeButton}
                    onPress={handleGameModeChange}
                  >
                    <Image source={modeChangeIcon} style={styles.modeChangeIcon} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.startGameButton} onPress={startGame}>
                  <Text style={styles.startGameButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.adminSection}>
                <View style={styles.modeConfig}>
                  <Text style={styles.sectionSubtitle}>Gamemode:</Text>
                  <Text style={styles.sectionSubtitle}>{currentGameMode}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Players</Text>

            <ScrollView style={styles.playersList} contentContainerStyle={{ paddingVertical: 4 }}>
              {players.map((player, index) => {
                const isAdmin = player === adminName;
                const isYou = player === playerName;
                return (
                  <View style={styles.playerItem} key={`${player}-${index}`}>
                    {isAdmin && (
                      <Image source={crown} style={styles.crownIcon} />
                    )}
                    <Text style={isYou ? styles.youHighlight : null}>
                      {player}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </AnimatedBackground>
);
};
    
function makeStyles(theme) {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  return StyleSheet.create({
    containerOut: {
      backgroundColor: theme.tintColorBack,
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    container: {
      flex: 1,
      width: SCREEN_WIDTH * 0.9,
      padding: 16,
      backgroundColor: theme.tintColor,
      borderWidth: 2,
      borderColor: theme.tintColorBorder,
      borderStyle: 'dashed',
      borderRadius: 16,
      margin: 50,
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'stretch',
      position: 'relative',
    },
    escIconBack: {
      marginTop: 8,
      backgroundColor: theme.tintColorButton,
      borderRadius: 16,
      padding: 10
    },
    header: {
      width: '100%',
      flexDirection: 'row',
      position: 'absolute',
      top: 16,             
      left: 16,
    },
    escIcon: {
      width: 20,
      height: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 8,
      color: theme.tintColorText,
    },
    nameEditInput: {
      alignSelf: 'center',
      textAlign: 'center',
      borderWidth: 1,
      borderColor: theme.tintColorText,
      borderRadius: 8,
      paddingHorizontal: 8,
      fontSize: 18,
      backgroundColor: '#fff',
      minWidth: 120,
      color: theme.tintColorText,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      columnGap: 8,
      marginVertical: 12,
    },
    lobbyInfoButton: {
      backgroundColor: theme.tintColorButton,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    lobbyInfoButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    adminSection: {
      marginVertical: 12,
      alignItems: 'center'
    },
    timerConfig: {
      backgroundColor: 'rgba(255,255,255,0.5)',
      borderWidth: 2,
      borderColor: '#bbb',
      borderStyle: 'dashed',
      borderRadius: 8,
      width: '100%',
      padding: 8,
      marginBottom: 12,
    },
    modeConfig: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.5)',
      borderWidth: 2,
      borderColor: '#bbb',
      borderStyle: 'dashed',
      borderRadius: 8,
      padding: 8,
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: 12,
    },
    timerLabel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 6,
    },
    labelText: {
      verticalAlign: 'middle',
      fontSize: 16,
      color: theme.tintColorText,
    },
    timerInput: {
      borderWidth: 1,
      borderColor: '#000',
      borderRadius: 8,
      width: 60,
      backgroundColor: '#fff',
      textAlign: 'center',
      fontSize: 16,
      color: theme.tintColorText,
      borderColor: theme.tintColorText,
    },
    sectionSubtitle: {
      verticalAlign: 'middle',
      fontSize: 18,
      textAlign: 'center',
      color: theme.tintColorText,
    },
    gameModeButton: {
      backgroundColor: theme.tintColorButton,
      borderRadius: 16,
      padding: 10
    },
    modeChangeIcon: {
      width: 30,
      height: 30,
    },
    startGameButton: {
      marginTop: 8,
      backgroundColor: theme.tintColorButton,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    startGameButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
    },
    playersList: {
      marginVertical: 8,
      width: '100%',
      maxHeight: 200,
      alignSelf: 'center',
    },
    playerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    crownIcon: {
      width: 20,
      height: 20,
      marginRight: 4,
    },
    youHighlight: {
      fontWeight: 'bold',
      color: '#ff2222',
    },
    welcomeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: -10,
    },
    editButton: {
      padding: 4,
    },
  });
}

export default LobbyInfo;
