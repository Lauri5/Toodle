import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from '../assets/logo.svg';
import ImageCarousel from './ImageCarousel';

const LobbyControls = () => {
  const navigate = useNavigate();
  const [inputLobbyId, setInputLobbyId] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    console.log("Shake active");
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

  const createLobby = () => {
    fetch("http://localhost:3001/create-lobby") 
      .then((res) => res.json())
      .then((data) => {
        const lobbyId = data.lobbyId;

        navigate(`/?c=${lobbyId}`);
        window.location.reload();
      })
      .catch((error) => {
        console.error("Errore nella creazione della partita:", error);
      });
  };

  const joinLobby = () => {
    if (inputLobbyId.trim()) {
      navigate(`/?c=${inputLobbyId}`);
      window.location.reload();
    } else {
      triggerShake();
    }
  };

  return (
    <div className="home-container">
      <div className="lobby-container">
        <img className="logo" src={logo} alt="Game Logo" />
        <div className="button-container">
          <button className="button home-button" onClick={createLobby}>
            Create a Lobby
          </button>
          <input
            type="text"
            className={`input-field ${shake ? 'shake' : ''}`}
            value={inputLobbyId}
            onChange={(e) => setInputLobbyId(e.target.value)}
            placeholder="Lobby ID"
          />
          <button className="button home-button" onClick={joinLobby}>
            Join a Lobby
          </button>
        </div>
      </div>
      <ImageCarousel />
    </div>
  );
};

export default LobbyControls;
