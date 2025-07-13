import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Keyboard
} from 'react-native';
import Canvas, { Image as CanvasImage } from 'react-native-canvas';

const bin = require('../assets/bin.png');
const enter = require('../assets/enter.png');

const theme = {
  tintColorButton: 'rgb(0, 162, 255)',
  tintColorBorder: 'rgba(4, 80, 124, 0.5)',
  tintColorBack: 'rgba(99, 186, 236, 0.5)',
  tintColorText: 'rgb(4, 80, 124)',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AiImageGenerator = ({ onSave, disabled, onSubmitCreation, onNotReady, timer }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const [promptInput, setPromptInput] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Write a prompt');

  const handleCanvasReady = useCallback(async (canvas) => {
    if (!canvas || canvasRef.current) return;   
  
    canvasRef.current = canvas;
    canvas.width = SCREEN_WIDTH * 0.8;
    canvas.height = canvas.width * 3 / 4;
  
    const ctx = canvas.getContext('2d');
    contextRef.current = ctx;
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    // Immediately call onSave with the blank state if needed
    if (onSave) {
      const blank =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+73BzaQAAAABJRU5ErkJggg==';
      onSave(blank);
    }
  }, [onSave]);  

  const drawImageToCanvas = useCallback(async (base64Url) => {
    if (!canvasRef.current || !contextRef.current) return;

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const canvasImg = new CanvasImage(canvas);
    canvasImg.src = base64Url;

    canvasImg.addEventListener('load', async () => {
      const imgAspect = canvasImg.width / canvasImg.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawWidth, drawHeight, offsetX, offsetY;
      if (imgAspect > canvasAspect) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }
      ctx.drawImage(canvasImg, offsetX, offsetY, drawWidth, drawHeight);
      setImageLoaded(true);
      setStatusMessage('Image drawn');

      if (onSave) {
        onSave(base64Url);
      }
    });

    canvasImg.addEventListener('error', () => {
      setStatusMessage('Error loading image');
    });
  }, [onSave]);

  const clearCanvas = useCallback(async () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setImageLoaded(false);

    // Immediately call onSave with the blank state if needed
    if (onSave) {
      const blank =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+73BzaQAAAABJRU5ErkJggg==';
      onSave(blank);
    }
  }, [disabled, onSave]);

  const handleGenerate = useCallback(() => {
    if (disabled) return;
    Keyboard.dismiss();

    const trimmed = promptInput.trim();
    if (!trimmed) {
      setStatusMessage('Please write a valid prompt');
      return;
    }
    setStatusMessage(`Generating image "${trimmed}", waiting...`);

    const apiEndpoint = 'http://192.168.0.5:7860/sdapi/v1/txt2img';

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: trimmed + 
          ' Highly detailed, vibrant colors, cinematic lighting, ultra-realistic textures, sharp focus, dynamic composition, 8K resolution, intricate details, masterpiece quality, professional rendering, clothed',
        negative_prompt: 'low quality, blurry, pixelated, bad anatomy, extra limbs, mutated hands, watermark, text, logo, poor lighting, harsh shadows, overexposed, cluttered background, distracting elements, incorrect color palette, distorted perspective, out of focus, nsfw, nude',
        steps: 6,
        cfg_scale: 2,
        width: 512,
        height: 512,
        sampler_name: 'DPM++ SDE Karras',
        sd_model_checkpoint: 'dreamshaper_8.safetensors'
      })
    };

    fetch(apiEndpoint, options)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.images && data.images.length > 0) {
          setStatusMessage('Image generated. Almost there...');
          const imageBase64 = data.images[0];
          const imageDataUrl = `data:image/png;base64,${imageBase64}`;
          drawImageToCanvas(imageDataUrl);
        } else {
          setStatusMessage('No image sent by server');
        }
      })
      .catch((err) => {
        setStatusMessage(`Error: ${err.message}`);
      });
  }, [promptInput, disabled, drawImageToCanvas]);

  const handleReady = () => {
    if (!disabled && onSubmitCreation) {
      onSubmitCreation();
    }
  };

  const handleNotReady = () => {
    if (disabled && onNotReady) {
      onNotReady();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {timer !== undefined && (
                    <View>
                      <Text style={styles.title}>Creation Phase</Text>
                      <Text style={styles.timerText}>
                        Remaining time: {'\n' + timer} second{timer === 1 ? '' : 's'}
                      </Text>
                    </View>
                  )}

        <View style={styles.actionRow}>
          <TextInput
            style={[styles.textInput, disabled && { backgroundColor: '#ccc' }]}
            placeholder="Write your prompt..."
            value={promptInput}
            onChangeText={setPromptInput}
            editable={!disabled}
          />

          <TouchableOpacity
            style={[
              styles.iconBack,
              styles.actionButton, 
              disabled && styles.disabledButton]}
            onPress={handleGenerate}
            disabled={disabled}
          >
            <Image source={enter} style={styles.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBack,
              styles.actionButton,
              (disabled || !imageLoaded) && styles.disabledButton
            ]}
            onPress={clearCanvas}
            disabled={disabled || !imageLoaded}
          >
            <Image source={bin} style={styles.icon} />
          </TouchableOpacity>

          {!disabled ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleReady}>
              <Text style={styles.buttonText}>Ready</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.unreadyButton} onPress={handleNotReady}>
              <Text style={styles.buttonText}>Ready</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.statusText}>
          <Text style={{ fontWeight: 'bold' }}>Status: </Text>
          {statusMessage}
        </Text>

        {/* Canvas */}
        <View style={styles.canvasWrapper}>
          <Canvas
            ref={handleCanvasReady}
            style={styles.canvas}
          />
        </View>
      </View>
    </View>
  );
};

export default AiImageGenerator;

const styles = StyleSheet.create({
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
  actionRow: {
    flexDirection: 'row',
    gap: 5,
    marginVertical: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    borderColor: theme.tintColorBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    marginRight: 8,
    width: 180,
    height: 50,
    backgroundColor: '#fff',
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
  actionButton: {
    backgroundColor: theme.tintColorButton,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  unreadyButton: {
    backgroundColor: '#39ff1e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  icon: {
    width: 35,
    height: 35,
  },
  iconBack: {
    width: 50,
    height: 50,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 18,
    color: theme.tintColorText,
    marginVertical: 8,
    textAlign: 'center',
  },
  canvasWrapper: {
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
  canvas: {
    width: '100%',
    height: '100%',
  },
});
