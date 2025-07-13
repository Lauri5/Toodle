import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const FinalScreen = ({ socket, isAdmin, gameStarted }) => {
  const handleDecision = (decision) => {
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'finalDecision',
          payload: { decision },
        })
      );
    }
  };

  if (!gameStarted) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Ended!</Text>
      {isAdmin ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.endGameButton, styles.restartButton]}
            onPress={() => handleDecision('continue')}
          >
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.endGameButton, styles.lobbyButton]}
            onPress={() => handleDecision('endGame')}
          >
            <Text style={styles.buttonText}>Lobby</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.subtitle}>Wait for admin.</Text>
      )}
    </View>
  );
};

export default FinalScreen;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 22,
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'center',
  },
  endGameButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  restartButton: {
    backgroundColor: '#39ff1e',
  },
  lobbyButton: {
    backgroundColor: '#fd2228',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
