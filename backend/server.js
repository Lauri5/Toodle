const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Middleware to log every request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const PORT = 3001;

// Random nicknames
const nicknamePool = [
  "SkyWalker",
  "IronClad",
  "MysticMage",
  "ShadowHunter",
  "ThunderBolt",
  "SilentAssassin",
  "LoneWolf",
  "SilverArrow",
  "NightCrawler",
  "CrimsonKnight",
  "GoldenEagle",
  "FrostDragon",
  "EmeraldWizard",
  "DarkPhoenix",
  "CyberNinja",
  "BlazeRider",
  "StealthSniper",
  "ElectricWolf",
  "PhantomRogue",
  "StormBringer"
];

const gameModes = ["Drawings", "Pictures", "AI"];
const lobbies = {};

app.get("/create-lobby", (req, res) => {
  const lobbyId = Math.floor(Math.random() * 9000) + 1000;
  lobbies[lobbyId] = {
    players: [],
    adminName: '',
    gameStarted: false,
    creations: {},
    pool: [],
    turnOrder: [],
    currentTurnIndex: 0,
    gamePhase: 'waiting',
    creatingTimeout: null,
    turnTimeout: null,
    creatingTime: 60,
    narrationTime: 90,
    usedCreations: new Set(),
    gameMode: gameModes[0],
  };
  console.log(`Lobby created: ${lobbyId}`);
  res.json({ lobbyId });
});

app.get("/", (req, res) => {
  res.send("Server active");
});

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

function getUniqueNickname(lobby, requestedName = null) {
  const usedNames = lobby.players.map(player => player.name);

  if (requestedName && !usedNames.includes(requestedName)) {
    return requestedName;
  }

  const availableNames = nicknamePool.filter(name => !usedNames.includes(name));

  // Returns a random nickname
  const randomIndex = Math.floor(Math.random() * availableNames.length);
  return availableNames[randomIndex];
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function startGame(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  lobby.gameStarted = true;
  lobby.creations = {};
  lobby.pool = [];
  lobby.turnOrder = shuffleArray(lobby.players.map(player => player.name));
  lobby.currentTurnIndex = 0;
  lobby.gamePhase = 'collectCreations';

  // Notify every player the game started
  lobby.players.forEach(player => {
    player.ws.send(JSON.stringify({
      type: 'gameStarted',
      payload: { gamePhase: lobby.gamePhase, gameMode: lobby.gameMode }
    }));
  });

  initiateCreationPhase(lobbyId);
}

function initiateCreationPhase(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  lobby.gamePhase = 'collectCreations';

  // Notify each player to start creating
  lobby.players.forEach(player => {
    player.ws.send(JSON.stringify({
      type: 'startCreating',
      payload: { creatingTime: lobby.creatingTime }
    }));
  });

  lobby.creatingTimeout = setTimeout(() => {
    finalizeCreations(lobbyId);
  }, (lobby.creatingTime + 1) * 1000);
}

function finalizeCreations(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  lobby.gamePhase = 'narrate';
  lobby.pool = Object.values(lobby.creations).filter(creation => !lobby.usedCreations.has(creation.playerName));

  initiateTurn(lobbyId);
}

function initiateTurn(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  if (lobby.currentTurnIndex >= lobby.turnOrder.length) {
    initiateFinalPhase(lobbyId);
    return;
  }

  const currentPlayer = lobby.turnOrder[lobby.currentTurnIndex];

  // Selecting a random creation that has to be both not already used and not of the narrator
  const availableCreations = lobby.pool.filter(creation => creation.playerName !== currentPlayer && !lobby.usedCreations.has(creation.playerName));
  if (availableCreations.length === 0 || !lobby.players.some(player => player.name === currentPlayer)) {
    lobby.currentTurnIndex += 1;
    initiateTurn(lobbyId);
    return;
  }

  const selectedCreationIndex = Math.floor(Math.random() * availableCreations.length);
  const selectedCreation = availableCreations[selectedCreationIndex];

  lobby.usedCreations.add(selectedCreation.playerName);

  // Remove the creation from the pool
  lobby.pool.splice(lobby.pool.indexOf(selectedCreation), 1);

  // Notify each player of the creation name and the narrator
  lobby.players.forEach(player => {
    if (player.name === currentPlayer) {
      player.ws.send(JSON.stringify({
        type: 'yourTurn',
        payload: {
          creation: selectedCreation.creationDataURL,
          creationOwner: selectedCreation.playerName,
          storyTime: lobby.narrationTime,
          gameMode: lobby.gameMode,
        }
      }));
    } else {
      player.ws.send(JSON.stringify({
        type: 'playerNarrating',
        payload: {
          creation: selectedCreation.creationDataURL,
          creationOwner: selectedCreation.playerName,
          narratingPlayer: currentPlayer,
          storyTime: lobby.narrationTime,
          gameMode: lobby.gameMode,
        }
      }));
    }
  });

  lobby.turnTimeout = setTimeout(() => {
    lobby.currentTurnIndex += 1;
    initiateTurn(lobbyId);
  }, lobby.narrationTime * 1000);
}

function initiateFinalPhase(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  lobby.gamePhase = 'final';

  // Notify each player that the game ended
  lobby.players.forEach(player => {
    player.ws.send(JSON.stringify({
      type: 'gameEnded',
      payload: {}
    }));
  });
}

function handleContinue(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  // Reset of lobby state for a new game
  clearTimeout(lobby.creatingTimeout);
  clearTimeout(lobby.turnTimeout);
  lobby.creations = {};
  lobby.pool = [];
  lobby.turnOrder = shuffleArray(lobby.players.map(player => player.name));
  lobby.currentTurnIndex = 0;
  lobby.gamePhase = 'collectCreations';
  lobby.usedCreations = new Set();
  initiateCreationPhase(lobbyId);
}

function handleLobby(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  // Reset of lobby state for a new game
  clearTimeout(lobby.creatingTimeout);
  clearTimeout(lobby.turnTimeout);
  lobby.gameStarted = false;
  lobby.creations = {};
  lobby.pool = [];
  lobby.turnOrder = shuffleArray(lobby.players.map(player => player.name));
  lobby.currentTurnIndex = 0;
  lobby.gamePhase = 'waiting';
  lobby.usedCreations = new Set();

  // Notify each player so the page is refreshed
  lobby.players.forEach(player => {
    player.ws.send(JSON.stringify({
      type: "returnToLobby",
      payload: { gameMode: lobby.gameMode,}
    }));
  });
}

wss.on("connection", (ws) => {
  let currentLobbyId = null;
  let playerName = null;

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", payload: "Message not valid." }));
      return;
    }
    const { type, payload } = data;

    if (type === "joinLobby") {
      const { lobbyId, playerName: requestedName } = payload;
      if (lobbies[lobbyId]) {
        currentLobbyId = lobbyId;
        const lobby = lobbies[lobbyId];

        playerName = getUniqueNickname(lobby, requestedName);
        lobby.players.push({ ws, name: playerName });

        // Chose an admin if not assigned already
        if (!lobby.adminName) {
          lobby.adminName = playerName;
          console.log(`${playerName} is now the admin of the lobby ${lobbyId}`);
        }

        ws.send(
          JSON.stringify({
            type: "joinSuccess",
            payload: {
              lobbyId,
              playerNames: lobby.players.map(player => player.name),
              adminName: lobby.adminName,
              playerName,
              gameStarted: lobby.gameStarted,
              gamePhase: lobby.gamePhase,
              turnOrder: lobby.turnOrder,
              creatingTime: lobby.creatingTime,
              narrationTime: lobby.narrationTime,
              gameMode: lobby.gameMode,
            },
          })
        );

        const playerNames = lobby.players.map((player) => player.name);
        const adminName = lobby.adminName;

        // Notify each player to update the list of players
        lobby.players.forEach((player) =>
          player.ws.send(
            JSON.stringify({
              type: "updatePlayerList",
              payload: { playerNames, adminName },
            })
          )
        );

        console.log(`Lobby ${lobbyId}: ${playerNames.length} players connected`);
      } else {
        ws.send(JSON.stringify({ type: "error", payload: "Lobby not found." }));
      }
    }

    if (type === "changeName") {
      const { newName } = payload;
      if (currentLobbyId && lobbies[currentLobbyId]) {
        const lobby = lobbies[currentLobbyId];
        const usedNames = lobby.players.map(player => player.name);

        if (usedNames.includes(newName)) {
          ws.send(JSON.stringify({ type: "error", payload: "Name taken." }));
          return;
        }

        // Update player name
        const player = lobby.players.find(p => p.ws === ws);
        if (player) {
          player.name = newName;
          if (lobby.adminName === playerName) {
            // Update adminName if the admin changed name
            lobby.adminName = newName;
          }
          playerName = newName;
          ws.send(JSON.stringify({ type: "nameChangeSuccess", payload: { playerName: newName } }));

          // Notify each player to update the list of players
          const playerNames = lobby.players.map((player) => player.name);
          const adminName = lobby.adminName;
          lobby.players.forEach((player) =>
            player.ws.send(
              JSON.stringify({
                type: "updatePlayerList",
                payload: { playerNames, adminName },
              })
            )
          );
        }
      }
    }

    if (type === "startGame") {
      if (currentLobbyId && lobbies[currentLobbyId]) {
        const lobby = lobbies[currentLobbyId];
        if (playerName === lobby.adminName) {
          startGame(currentLobbyId);
          console.log(`Game started in lobby ${currentLobbyId} by admin ${playerName}`);
        } else {
          ws.send(JSON.stringify({ type: "error", payload: "Only the admin can start the game." }));
        }
      }
    }

    if (type === "submitCreation") {
      if (currentLobbyId && lobbies[currentLobbyId] && lobbies[currentLobbyId].gamePhase === 'collectCreations') {
        const lobby = lobbies[currentLobbyId];
        lobby.creations[playerName] = {
          playerName,
          creationDataURL: payload.creationDataURL
        };
        console.log(`Lobby ${currentLobbyId}: Creation received from ${playerName}`);

        // Check if every player sent a creation
        if (Object.keys(lobby.creations).length === lobby.players.length) {
          clearTimeout(lobby.creatingTimeout);
          finalizeCreations(currentLobbyId);
        }
      }
    }

    if (type === "notReady") {
      if (currentLobbyId && lobbies[currentLobbyId] && lobbies[currentLobbyId].gamePhase === 'collectCreations') {
        const lobby = lobbies[currentLobbyId];
        delete lobby.creations[playerName];
      }
    }

    if (type === "finalDecision") {
      if (currentLobbyId && lobbies[currentLobbyId]) {
        if (payload.decision === "endGame") {
          handleLobby(currentLobbyId);
        } else if (payload.decision === "continue") {
          handleContinue(currentLobbyId);
        }
      }
    }

    if (type === "finishedNarrating") {
      if (currentLobbyId && lobbies[currentLobbyId] && lobbies[currentLobbyId].gamePhase === 'narrate') {
        const lobby = lobbies[currentLobbyId];
        clearTimeout(lobby.turnTimeout);
        lobby.currentTurnIndex += 1;
        initiateTurn(currentLobbyId);
      }
    }

    if (type === "configureTimers") {
      if (currentLobbyId && lobbies[currentLobbyId] && lobbies[currentLobbyId].adminName === playerName && !lobbies[currentLobbyId].gameStarted) {
        const { creatingTime, narrationTime } = payload;
        const lobby = lobbies[currentLobbyId];
        lobby.creatingTime = creatingTime;
        lobby.narrationTime = narrationTime;

        lobby.players.forEach(player => {
          player.ws.send(JSON.stringify({
            type: 'timerConfigured',
            payload: { creatingTime, narrationTime }
          }));
        });
      }
    }

    if (type === "changeGameMode") {
      if (currentLobbyId && lobbies[currentLobbyId]) {
        const lobby = lobbies[currentLobbyId];
        if (playerName === lobby.adminName && !lobby.gameStarted) {
          const { gameMode } = payload;
          if (gameModes.includes(gameMode)) {
            lobby.gameMode = gameMode;
            console.log(`Lobby ${currentLobbyId}: Game mode changed to ${gameMode} from ${playerName}`);

            lobby.players.forEach(player => {
              player.ws.send(JSON.stringify({
                type: "gameModeChange",
                payload: { gameMode }
              }));
            });
          } else {
            ws.send(JSON.stringify({ type: "error", payload: "Modalità di gioco non valida." }));
          }
        } else {
          ws.send(JSON.stringify({ type: "error", payload: "Solo l'admin può cambiare la modalità di gioco o il gioco è già iniziato." }));
        }
      }
    }
  }); 

  ws.on("close", () => {
    if (currentLobbyId && lobbies[currentLobbyId]) {
      const lobby = lobbies[currentLobbyId];

      // Remove player from list
      lobby.players = lobby.players.filter((player) => player.ws !== ws);

      if (playerName === lobby.adminName) {
        if (lobby.players.length > 0) {
          // New random admin
          const newAdminIndex = Math.floor(Math.random() * lobby.players.length);
          const newAdmin = lobby.players[newAdminIndex].name;
          if (newAdmin) {
            lobby.adminName = newAdmin;

            const playerNames = lobby.players.map((player) => player.name);
            const adminName = lobby.adminName;

            lobby.players.forEach((player) =>
              player.ws.send(
                JSON.stringify({
                  type: "updatePlayerList",
                  payload: { playerNames, adminName },
                })
              )
            );

            console.log(`${playerName} disconnected from lobby ${currentLobbyId}. New admin: ${newAdmin}`);
          }
        } else {
          lobby.adminName = '';
        }
      }

      if (lobby.players.length === 0) {
        delete lobbies[currentLobbyId];
        console.log(`Lobby ${currentLobbyId} deleted.`);
      } else {
        const playerNames = lobby.players.map((player) => player.name);
        const adminName = lobby.adminName;

        lobby.players.forEach((player) =>
          player.ws.send(
            JSON.stringify({
              type: "updatePlayerList",
              payload: { playerNames, adminName },
            })
          )
        );
      }

      // If the player disconnected was in an ongoing game
      if (lobby.gameStarted) {
        if (lobby.gamePhase === 'collectCreations') {
          delete lobby.creations[playerName];
          lobby.pool = lobby.pool.filter(creation => creation.playerName !== playerName);
          
          if (Object.keys(lobby.creations).length === lobby.players.length) {
            clearTimeout(lobby.creatingTimeout);
            finalizeCreations(currentLobbyId);
          }
        } else if (lobby.gamePhase === 'narrate') {
          if (currentLobbyId && lobbies[currentLobbyId]) {
            const lobby = lobbies[currentLobbyId];
            clearTimeout(lobby.turnTimeout);
            lobby.currentTurnIndex += 1;
            initiateTurn(currentLobbyId);
          }
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});
