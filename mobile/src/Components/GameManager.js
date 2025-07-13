import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';

import GameCanvas from './GameCanvas';
import ImageUploader from './ImageUploader';
import AiImageGenerator from './AiImageGenerator';

const BLANK_IMAGE_BASE64 = 
  `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+73BzaQAAAABJRU5ErkJggg==`;

const GameManager = ({
  socket,
  gameMode,
  gamePhase,
  creatingTime,
}) => {
  const [creationCompleted, setCreationCompleted] = useState(false);
  const [creationDataURL, setCreationDataURL] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    setStartTime(Date.now());
    timerIntervalRef.current = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [creatingTime]);

  const remainingTime = Math.max(0, creatingTime - Math.floor((Date.now() - startTime) / 1000));

  useEffect(() => {
    if (remainingTime === 0 && gamePhase === 'collectCreations') {
      handleSubmitCreation();
    }
  }, [remainingTime, gamePhase]);

  const handleSubmitCreation = () => {
    if (creationDataURL) {
      sendCreation(creationDataURL);
    } else {
      sendCreation(BLANK_IMAGE_BASE64);
    }
    setCreationCompleted(true);
  };

  const sendCreation = (dataUrl) => {
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'submitCreation',
          payload: { creationDataURL: dataUrl },
        })
      );
    }
  };

  const handleNotReady = () => {
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'notReady',
        })
      );
    }
    setCreationCompleted(false);
  };

  const handleCanvasSave = (dataURL) => {
    setCreationDataURL(dataURL);
    if (creationCompleted) {
      handleSubmitCreation();
    }
  };

  return (
    <View>
      {gameMode === 'Drawings' && (
        <GameCanvas
          onSave={handleCanvasSave}
          disabled={creationCompleted}
          onSubmitCreation={handleSubmitCreation}
          onNotReady={handleNotReady}
          timer={remainingTime}
        />
      )}

      {gameMode === 'Pictures' && (
        <ImageUploader
          onSave={handleCanvasSave}
          disabled={creationCompleted}
          onSubmitCreation={handleSubmitCreation}
          onNotReady={handleNotReady}
          timer={remainingTime}
        />
      )}

      {gameMode === 'AI' && (
        <AiImageGenerator
          onSave={handleCanvasSave}
          disabled={creationCompleted}
          onSubmitCreation={handleSubmitCreation}
          onNotReady={handleNotReady}
          timer={remainingTime}
        />
      )}
    </View>
  );
};

export default GameManager;
