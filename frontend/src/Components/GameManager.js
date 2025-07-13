import React, { useState, useEffect, useRef } from "react";
import GameCanvas from "./GameCanvas";
import ImageUploader from "./ImageUploader"
import AiImageGenerator from "./AiImageGenerator";

const GameManager = ({
  socket,
  gameMode,
  gamePhase,
  creatingTime,
}) => {
  const [creationCompleted, setCreationCompleted] = useState(false);
  const [creationDataURL, setCreationDataURL] = useState(null);
  const [timer, setTimer] = useState(creatingTime);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    setTimer(creatingTime);
    startTimer(creatingTime);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [creatingTime]);

  const startTimer = (duration) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Adjust the timer to end slightly earlier than the server's timeout
    const adjustedDuration = duration;

    setTimer(adjustedDuration);

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
    if (gamePhase === "collectCreations") {
      setCreationCompleted(true); // Trigger GameCanvas or ImageUploader to disable and save
    }
  };

  const handleSubmitCreation = () => {
    if (creationDataURL) {
      socket.send(
        JSON.stringify({
          type: "submitCreation",
          payload: { creationDataURL },
        })
      );
    } else {
      // Create a temporary blank canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 800;
      tempCanvas.height = 600;
      const ctx = tempCanvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      const blankDataURL = tempCanvas.toDataURL("image/png");

      socket.send(
        JSON.stringify({
          type: "submitCreation",
          payload: { creationDataURL: blankDataURL },
        })
      );
    }
    setCreationCompleted(true);
  };

  const handleNotReady = () => {
    socket.send(
      JSON.stringify({
        type: "notReady",
      })
    );
    setCreationCompleted(false);
  };

  const handleCanvasSave = (dataURL) => {
    setCreationDataURL(dataURL);
    if (creationCompleted) {
      handleSubmitCreation();
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div className="div-center">
        <div>
          <h2 className="canvas-phase">Creation Phase</h2>
          <p className="canvas-phase-time">
            Remaining time: {timer} second{timer === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {gameMode === "Drawings" && (
        <GameCanvas
          onSave={handleCanvasSave}
          disabled={creationCompleted}
          onSubmitCreation={handleSubmitCreation}
          onNotReady={handleNotReady}
        />
      )}
      {gameMode === "Pictures" && (
        <ImageUploader
          onSave={handleCanvasSave}
          disabled={creationCompleted}
          onSubmitCreation={handleSubmitCreation}
          onNotReady={handleNotReady}
        />
      )}
      {gameMode === "AI" && (
        <AiImageGenerator
          onSave={handleCanvasSave}
          disabled={creationCompleted}
          onSubmitCreation={handleSubmitCreation}
          onNotReady={handleNotReady}
        />
      )}
    </div>
  );
};

export default GameManager;
