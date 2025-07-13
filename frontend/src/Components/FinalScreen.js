import React from "react";

const FinalScreen = ({ socket, isAdmin, gameStarted }) => {
  const handleDecision = (decision) => {
    socket.send(
      JSON.stringify({
        type: "finalDecision",
        payload: { decision },
      })
    );
  };

  return (
    <div>
      {gameStarted && (
        <>
          <h2 className="section-title">Game Ended!</h2>
          {isAdmin ? (
            <div className="end-game-container" >
              <button className="button end-game-button" onClick={() => handleDecision('continue')}>
                Restart
              </button>
              <button className="button end-game-button red" onClick={() => handleDecision('endGame')}>
                Lobby
              </button>
            </div>
          ) : (
            <p className="section-subtitle">Wait for admin.</p>
          )}
        </>
      )}
    </div>
  );  
};

export default FinalScreen;
