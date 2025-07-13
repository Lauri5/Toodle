import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AnimatedBackground from './AnimatedBackground';

const theme = {
  tintColorButton: 'rgb(214, 44, 44)',
  tintColorBorder: 'rgba(124, 4, 4, 0.5)',
  tintColorBack: 'rgba(238, 101, 101, 0.5)',
  tintColorText: 'rgb(124, 4, 4)',
};

const upload = require('../assets/upload.png');
const bin = require('../assets/bin.png');

export default function ImageUploader({
  onSave,
  disabled = false,
  onSubmitCreation,
  onNotReady,
  timer,
}) {
  const [pickedImage, setPickedImage] = useState(null);

  const handlePickImageAsync = useCallback(async () => {
    if (disabled) return;
  
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need permission to access your photo library!');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaType: 'Image',
      base64: true,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setPickedImage(asset.uri);

      if (asset.base64) {
        const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
        onSave(dataUrl);
      }
    }
  }, [disabled, onSave]);

  const clearImage = useCallback(() => {
    if (disabled) return;
    setPickedImage(null);

    if (onSave) {
      const blank =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+73BzaQAAAABJRU5ErkJggg==';
      onSave(blank);
    }
  }, [disabled, onSave]);

  const styles = makeStyles(theme);

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          {timer !== undefined && (
            <View>
              <Text style={styles.title}>Fase Creativa</Text>
              <Text style={styles.timerText}>
                Tempo rimanente: {'\n' + timer} secondi
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.uploadIconBack,
                styles.actionButton,
                disabled && styles.actionButtonDisabled,
              ]}
              onPress={handlePickImageAsync}
            >
              <Image source={upload} style={styles.uploadIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.binIconBack,
                styles.actionButton,
                (disabled || !pickedImage) && styles.actionButtonDisabled,
              ]}
              onPress={clearImage}
              disabled={disabled || !pickedImage}
            >
              <Image source={bin} style={styles.binIcon} />
            </TouchableOpacity>

            {!disabled ? (
              <TouchableOpacity style={styles.actionButton} onPress={onSubmitCreation}>
                <Text style={styles.buttonText}>Ready</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.unreadyButton} onPress={onNotReady}>
                <Text style={styles.buttonText}>Ready</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.canvasContainer}>
            {pickedImage ? (
              <Image source={{ uri: pickedImage }} style={styles.canvasImage} />
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedBackground>
  );
}

function makeStyles(theme) {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    title: {
      fontSize: 28,
      color: theme.tintColorText,
      marginBottom: 8,
      fontWeight: 'bold',
      alignSelf: 'center',
    },
    timerText: {
      fontSize: 18,
      color: theme.tintColorText,
      marginBottom: 8,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 5,
      marginVertical: 12,
    },
    actionButton: {
      backgroundColor: theme.tintColorButton,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    uploadIconBack: {
      width: 50,
      height: 50,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadIcon: {
      width: 35,
      height: 35,
    },
    binIconBack: {
      width: 50,
      height: 50,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    binIcon: {
      width: 35,
      height: 35,
    },
    actionButtonDisabled: {
      backgroundColor: '#ccc',
    },
    unreadyButton: {
      backgroundColor: '#39ff1e',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    buttonText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    canvasContainer: {
      width: SCREEN_WIDTH * 0.8,
      aspectRatio: 4 / 3,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: theme.tintColorBorder,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginTop: 16,
    },
    canvasImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
  });
}
