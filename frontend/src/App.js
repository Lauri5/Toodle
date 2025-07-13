// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import JoinLobby from "./Components/JoinLobby";
import "./App.css"

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<JoinLobby />} />
    </Routes>
  </Router>
);

export default App;
