import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LobbyControls from "./LobbyControls";
import LobbyInfo from "./LobbyInfo";
import FinalScreen from "./FinalScreen";
import GameManager from "./GameManager";

const JoinLobby = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState([]);
  const [inLobby, setInLobby] = useState(false);
  const [lobbyId, setLobbyId] = useState("");
  const [adminName, setAdminName] = useState("");
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

  useEffect(() => {
    const lobbyIdFromUrl = window.initialLobbyId;

    if (!lobbyIdFromUrl) {
      // If no lobbyid then show lobby controls
      setInLobby(false);
      return;
    }

    setLobbyId(lobbyIdFromUrl);
    setInLobby(true);

    const ws = new WebSocket("ws://localhost:3001");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "joinLobby",
          payload: {
            lobbyId: lobbyIdFromUrl,
            playerName: null,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "joinSuccess") {
        setInLobby(true);
        setPlayers(data.payload.playerNames);
        setAdminName(data.payload.adminName);
        setPlayerName(data.payload.playerName);
        setCreatingTime(data.payload.creatingTime);
        setNarrationTime(data.payload.narrationTime);
      } else if (data.type === "updatePlayerList") {
        setPlayers(data.payload.playerNames);
        setAdminName(data.payload.adminName);
      } else if (data.type === "gameStarted") {
        setGameStarted(true);
        setGameMode(data.payload.gameMode)
        setGamePhase(data.payload.gamePhase);
      } else if (data.type === "startCreating") {
        setGamePhase('collectCreations');
        setTimer(data.payload.creatingTime);
      } else if (data.type === "yourTurn") {
        setGamePhase('yourTurn');
        setCurrentCreation(data.payload.creation);
        setCreationOwner(data.payload.creationOwner);
        startTimer(data.payload.storyTime);
      } else if (data.type === "playerNarrating") {
        setGamePhase('otherPlayerNarrating');
        setCurrentCreation(data.payload.creation);
        setCreationOwner(data.payload.creationOwner);
        setNarratingPlayer(data.payload.narratingPlayer);
        startTimer(data.payload.storyTime);
      } else if (data.type === "gameEnded") {
        setGamePhase('final');
      } else if (data.type === "returnToLobby") {
        setGameMode(data.payload.gameMode);
        setInLobby(true);
        setGamePhase('waiting');
        setGameStarted(false);
      } else if (data.type === "error") {
        if (!(data.payload === "Name taken" || data.payload === "Name not valid")) {
          navigate("/", { replace: true });
          window.location.reload();
        }
      } else if (data.type === "timerConfigured") {
        setCreatingTime(data.payload.creatingTime);
        setNarrationTime(data.payload.narrationTime);
      }
    };

    setSocket(ws);

    // Cleanup on component dismount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      ws.close();
    };
  }, [navigate]);

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

  const handleFinishedNarrating = () => {
    if (socket && gamePhase === 'yourTurn') {
      socket.send(JSON.stringify({
        type: "finishedNarrating",
        payload: {}
      }));
      setGamePhase('waiting');
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleTimerEnd = () => {
    if (gamePhase === 'yourTurn') {
      handleFinishedNarrating();
    }
  };

  useEffect(() => {
    if (timer === 0 && (gamePhase === 'yourTurn' || gamePhase === 'otherPlayerNarrating')) {
      handleTimerEnd();
    }
  });

  if (!inLobby) {
    return <LobbyControls />;
  }

  return (
    <div>
      {gamePhase === 'collectCreations' && (
        <GameManager
          socket={socket}
          gameMode={gameMode}
          gamePhase={gamePhase}
          creatingTime={creatingTime}
        />
      )}
      {gamePhase === 'yourTurn' && (
        <div className="div-center">
          <div>
            <h2 className="section-title">Now you have to tell the story!</h2>
            <img className="narrating-canvas" src={currentCreation} alt="Drawings da narrare"/>
            <p className="section-subtitle">By: {creationOwner}</p>
            <p className="section-subtitle">Remaining time: {timer} second{timer === 1 ? '' : 's'}</p>
            <button className="button start-game-button" onClick={handleFinishedNarrating}>Finito</button>
          </div>
        </div>
      )}
      {gamePhase === 'otherPlayerNarrating' && (
        <div className="div-center">
          <div>
            <h2 className="section-title">{narratingPlayer} is telling a story!</h2>
            <img className="narrating-canvas" src={currentCreation} alt="Creation"/>
            <p className="section-subtitle">By: {creationOwner}</p>
            <p className="section-subtitle">Remaining time: {timer} second{timer === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}
      {gamePhase === 'final' && (
        <FinalScreen
          socket={socket}
          isAdmin={adminName === playerName}
          gameStarted={gameStarted}
        />
      )}
      {gamePhase === 'waiting' && gameStarted && (
        <h2>Waiting for next turn...</h2>
      )}
      {!gameStarted ? (
        inLobby ? (
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
        ) : null
      ) : null}
    </div>
  );
};

export default JoinLobby;
