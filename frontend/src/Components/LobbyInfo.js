import React, { useState, useEffect } from "react";
import crown from '../assets/crown.png';
import esc from '../assets/esc.png';
import editIcon from '../assets/edit.png';
import modeChangeIcon from '../assets/modeChange.png';

const LobbyInfo = ({
  gameMode,
  lobbyId,
  playerName,
  players,
  adminName,
  socket,
  setPlayerName,
  creatingTime,
  narrationTime,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(playerName);
  const [configCreatingTime, setConfigCreatingTime] = useState(creatingTime);
  const [configNarrationTime, setConfigNarrationTime] = useState(narrationTime);
  const [shake, setShake] = useState(false);

  const gameModes = ["Drawings", "Pictures", "AI"];
  const [currentGameMode, setCurrentGameMode] = useState(gameMode);

  const toggleLobbyId = () => {
    navigator.clipboard.writeText(lobbyId);
  };

  const copyLobbyLink = () => {
    const lobbyLink = `${window.location.origin}/?c=${lobbyId}`;
    navigator.clipboard.writeText(lobbyLink);
  };

  const startGame = () => {
    handleTimerConfiguration();

    socket.send(
      JSON.stringify({
        type: "startGame",
      })
    );
  };
  
  const tintColors = {
    Drawings: 'rgba(75, 236, 42, 0.5)',
    Pictures: 'rgba(255, 0, 0, 0.5)',
    AI: 'rgba(0, 162, 255, 0.5)',
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
    Drawings: 'rgba(138, 240, 118, 0.7)',
    Pictures: 'rgba(238, 101, 101, 0.7)',
    AI: 'rgba(99, 186, 236, 0.7)',
  };

  const tintColorsTexts = {
    Drawings: 'rgb(26, 100, 12)',
    Pictures: 'rgb(124, 4, 4)',
    AI: 'rgb(4, 80, 124)',
  };

  // Effect to set the tint color based on the current game mode
  useEffect(() => {
    const tintColor = tintColors[currentGameMode];
    document.body.style.setProperty('--tint-color', tintColor);

    const tintColorButton = tintColorsButtons[currentGameMode];
    document.body.style.setProperty('--tint-color-button', tintColorButton);

    const tintColorBorder = tintColorsBorders[currentGameMode];
    document.body.style.setProperty('--tint-color-border', tintColorBorder);
    
    const tintColorBack = tintColorsBacks[currentGameMode];
    document.body.style.setProperty('--tint-color-back', tintColorBack);
    
    const tintColorText = tintColorsTexts[currentGameMode];
    document.body.style.setProperty('--tint-color-text', tintColorText);

  }, [currentGameMode, tintColors]);

  const leaveLobby = () => {
    localStorage.removeItem("lobbyId");
    localStorage.removeItem("playerName");
    window.location.href = "/";
  };

  const handleNameChange = () => {
    const trimmedName = editedName.trim();

    if (trimmedName === "") {
      triggerShake();
      return;
    }

    const isNameTaken = players.some(
      (name) => name === trimmedName && name !== playerName
    );

    if (isNameTaken) {
      triggerShake();
      return;
    }

    if (trimmedName === playerName)
    {
      setIsEditing(false);
      return;
    }

    socket.send(
      JSON.stringify({
        type: "changeName",
        payload: { newName: trimmedName },
      })
    );
  };

  const triggerShake = () => {
    setShake(true);
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => {
        setShake(false);
      }, 500);
  
      return () => clearTimeout(timer);
    }
  }, [shake]);  

  const handleTimerConfiguration = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "configureTimers",
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

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "changeGameMode",
          payload: { gameMode: newMode },
        })
      );
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "joinSuccess") {
        const { playerName: newPlayerName, gameMode } = data.payload;
        setPlayerName(newPlayerName);
        localStorage.setItem("playerName", newPlayerName);
        setCurrentGameMode(gameMode);
        setIsEditing(false);
      } else if (data.type === "nameChangeSuccess") {
        const newPlayerName = data.payload.playerName;
        setPlayerName(newPlayerName);
        localStorage.setItem("playerName", newPlayerName);
        setIsEditing(false);
      } else if (data.type === "error") {
        if (
          data.payload === "Name taken" ||
          data.payload === "Name not valid"
        ) {
          triggerShake();
        } else {
          window.location.reload();
        }
      } else if (data.type === "gameModeChange") {
        if (data.payload && data.payload.gameMode) {
          setCurrentGameMode(data.payload.gameMode);
        }
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, setPlayerName]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleNameChange();
    }
  };

  return (
    <div className="lobby-info-container">
      <button onClick={leaveLobby} className="button lobby-info esc-icon-back">
        <img src={esc} alt="Esc" className="esc-icon" />
      </button>

      <h3 className="section-title">
        Benvenuto,{" "}
        {isEditing ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => {
              setEditedName(e.target.value);
            }}
            onKeyDown={handleKeyPress}
            onBlur={() => {
              setIsEditing(false);
            }}
            autoFocus
            maxLength={15}
            className={`name-edit-input ${shake ? 'shake' : ''}`}
          />
        ) : (
          <>
            {playerName}
            <button 
                onClick={() => { 
                  setIsEditing(true);
                  setEditedName(playerName);
                }}
                className="button lobby-info edit-button">
              <img src={editIcon} alt="Edit" className="edit-icon" title="Change Name"/>
            </button>
          </>
        )}
      </h3>

      <div className="buttons-row">
        <button className="button lobby-info" onClick={copyLobbyLink}>
          Copy Link
        </button>

        <button className="button lobby-info" onClick={toggleLobbyId}>
          Copy Code
        </button>
      </div>

      {playerName === adminName && (
        <div className="admin-section">
          <div className="timer-config">
            <h4 className="section-subtitle">Setup Timers</h4>
            <div className="timer-label">
              <label>Creation Time:</label>
              <input
                type="number"
                value={configCreatingTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 6) {
                    const numericValue = parseInt(value);
                    setConfigCreatingTime(numericValue || "0");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                min="0"
              />
            </div>
            <div className="timer-label">
              <label>Narrating Time:</label>
              <input
                type="number"
                value={configNarrationTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 6) { 
                    const numericValue = parseInt(value);
                    setConfigNarrationTime(numericValue || "0");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                min="0"
              />
            </div>
          </div>
          
          <div className="mode-config">
            <h3 className="section-subtitle">Gamemode:</h3>
            <h3 className="section-subtitle">{currentGameMode}</h3>
            <button className="button lobby-info game-mode-button" onClick={handleGameModeChange} title="Change Gamemode">
              <img src={modeChangeIcon} alt="Change Mode" className="mode-change-icon" />
            </button>
          </div>

          <button className="button start-game-button" onClick={startGame}>
            <strong>Start</strong>
          </button>
        </div>
      )}

    {playerName !== adminName && (
      <div className="admin-section">
        <div className="mode-config">
          <h3 className="section-subtitle">Gamemode:</h3>
          <h3 className="section-subtitle">{currentGameMode}</h3>
        </div>
      </div>
    )}

      <h3 className="section-title players">Players</h3>
      <div className="players-list">
        <ul>
          {players.map((player, index) => {
            let displayName = player;
            const isAdmin = player === adminName;
            const isYou = player === playerName;

            return (
              <li key={index} className="player-item">
                {isAdmin && <img src={crown} alt="Crown" className="crown-icon" />}
                {isYou ? (
                  <span className="you-highlight">{displayName}</span>
                ) : (
                  displayName
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default LobbyInfo;
