import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AnimatedBackground from './AnimatedBackground';

import LobbyControls from './LobbyControls';
import LobbyInfo from './LobbyInfo';
import FinalScreen from './FinalScreen';
import GameManager from './GameManager';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const JoinLobby = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { lobbyId } = route.params || {};

  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [inLobby, setInLobby] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState('Drawings');
  const [gamePhase, setGamePhase] = useState('waiting');
  const [currentCreation, setCurrentCreation] = useState(null);
  const [creationOwner, setCreationOwner] = useState(null);
  const [narratingPlayer, setNarratingPlayer] = useState(null);
  const [creatingTime, setCreatingTime] = useState(60);
  const [narrationTime, setNarrationTime] = useState(90);
  const [timer, setTimer] = useState(0);

  const timerIntervalRef = useRef(null);

  const dynamicTheme = useMemo(() => ({
    tintColor: tintColors[gameMode],
    tintColorButton: tintColorsButtons[gameMode],
    tintColorBorder: tintColorsBorders[gameMode],
    tintColorBack: tintColorsBacks[gameMode],
    tintColorText: tintColorsTexts[gameMode],
  }), [gameMode]);

  const styles = useMemo(() => makeStyles(dynamicTheme), [dynamicTheme]);

  useEffect(() => {
    if (!lobbyId) {
      setInLobby(false);
      return;
    }

    setInLobby(true);

    const ws = new WebSocket('ws://192.168.0.66:3001');

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'joinLobby',
          payload: {
            lobbyId,
            playerName: null,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'joinSuccess':
          setInLobby(true);
          setPlayers(data.payload.playerNames);
          setAdminName(data.payload.adminName);
          setPlayerName(data.payload.playerName);
          setCreatingTime(data.payload.creatingTime);
          setNarrationTime(data.payload.narrationTime);
          if (data.payload.gameMode) {
            setGameMode(data.payload.gameMode);
          }
          break;

        case 'updatePlayerList':
          setPlayers(data.payload.playerNames);
          setAdminName(data.payload.adminName);
          break;

        case 'gameStarted':
          setGameStarted(true);
          setGameMode(data.payload.gameMode);
          setGamePhase(data.payload.gamePhase);
          break;

        case 'startCreating':
          setGamePhase('collectCreations');
          setTimer(data.payload.creatingTime);
          break;

        case 'yourTurn':
          setGamePhase('yourTurn');
          setCurrentCreation(data.payload.creation);
          setCreationOwner(data.payload.creationOwner);
          startTimer(data.payload.storyTime);
          break;

        case 'playerNarrating':
          setGamePhase('otherPlayerNarrating');
          setCurrentCreation(data.payload.creation);
          setCreationOwner(data.payload.creationOwner);
          setNarratingPlayer(data.payload.narratingPlayer);
          startTimer(data.payload.storyTime);
          break;

        case 'gameEnded':
          setGamePhase('final');
          break;

        case 'returnToLobby':
          setGameMode(data.payload.gameMode);
          setInLobby(true);
          setGamePhase('waiting');
          setGameStarted(false);
          break;

        case 'error':
          if (
            !(data.payload === 'Name taken' || data.payload === 'Nome non valido')
          ) {
            Alert.alert('Error', data.payload);
            setInLobby(false);
          }
          break;

        case 'timerConfigured':
          setCreatingTime(data.payload.creatingTime);
          setNarrationTime(data.payload.narrationTime);
          break;

        default:
          break;
      }
    };

    setSocket(ws);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      ws.close();
    };
  }, [lobbyId]);

  const startTimer = (duration) => {
    setTimer(duration);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimerEnd = () => {
    if (gamePhase === 'yourTurn') {
      handleFinishedNarrating();
    }
  };

  const handleFinishedNarrating = () => {
    if (socket && gamePhase === 'yourTurn') {
      socket.send(
        JSON.stringify({
          type: 'finishedNarrating',
          payload: {},
        })
      );
      setGamePhase('waiting');
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (timer === 0 && (gamePhase === 'yourTurn' || gamePhase === 'otherPlayerNarrating')) {
      handleTimerEnd();
    }
  }, [timer, gamePhase]);

  if (!inLobby) {
    return <LobbyControls />;
  }

  return (
    <AnimatedBackground>
      {(
        gamePhase === 'yourTurn' ||
        gamePhase === 'otherPlayerNarrating' ||
        gamePhase === 'final' ||
        (gamePhase === 'waiting' && gameStarted)
      ) ? (
        <View style={styles.container}>
          <View style={styles.mainContent}>
            {gamePhase === 'yourTurn' && (
              <View style={styles.centered}>
                <Text style={styles.title}>It's your turn to tell a story!</Text>
                {currentCreation ? (
                  <Image
                    style={styles.narratingCanvas}
                    source={{ uri: currentCreation }}
                  />
                ) : null}
                <Text style={styles.subtitle}>By: {creationOwner}</Text>
                <Text style={styles.subtitle}>Remaining time: {timer} second{timer === 1 ? '' : 's'}</Text>
                <TouchableOpacity style={styles.finishButton} onPress={handleFinishedNarrating}>
                  <Text style={styles.finishButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {gamePhase === 'otherPlayerNarrating' && (
              <View style={styles.centered}>
                <Text style={styles.title}>{narratingPlayer} is telling a story!</Text>
                {currentCreation ? (
                  <Image
                    style={styles.narratingCanvas}
                    source={{ uri: currentCreation }}
                  />
                ) : null}
                <Text style={styles.subtitle}>By: {creationOwner}</Text>
                <Text style={styles.subtitle}>Remaining time: {timer} second{timer === 1 ? '' : 's'}</Text>
              </View>
            )}

            {gamePhase === 'final' && (
              <FinalScreen
                socket={socket}
                isAdmin={adminName === playerName}
                gameStarted={gameStarted}
              />
            )}

            {gamePhase === 'waiting' && gameStarted && (
              <Text style={styles.title}>Wating for the next turn...</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.defaultContainer}>
          {gamePhase === 'collectCreations' && (
            <GameManager
              socket={socket}
              gameMode={gameMode}
              gamePhase={gamePhase}
              creatingTime={creatingTime}
            />
          )}

          {!gameStarted && inLobby && (
            <LobbyInfo
              gameMode={gameMode}
              lobbyId={lobbyId}
              playerName={playerName}
              players={players}
              adminName={adminName}
              socket={socket}
              setPlayerName={setPlayerName}
              creatingTime={creatingTime}
              narrationTime={narrationTime}
            />
          )}
        </View>
      )}
    </AnimatedBackground>
  );
};

export default JoinLobby;

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.tintColorBack,
      width: SCREEN_WIDTH,
    },
    mainContent: {
      backgroundColor: theme.tintColorBack,
      borderWidth: 2,
      borderColor: theme.tintColorBorder,
      borderStyle: 'dashed',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      width: SCREEN_WIDTH * 0.9,
    },
    defaultContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      color: theme.tintColorText,
      marginVertical: 8,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 18,
      color: theme.tintColorText,
      marginVertical: 4,
      textAlign: 'center',
    },
    narratingCanvas: {
      width: SCREEN_WIDTH * 0.8,
      aspectRatio: 4 / 3,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: theme.tintColorBorder,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      resizeMode: 'contain',
      marginTop: 16,
      marginBottom: 16,
    },
    finishButton: {
      backgroundColor: theme.tintColorButton,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
    },
    finishButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });
}
