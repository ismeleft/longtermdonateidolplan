import React, { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import Welcome from "./views/welcome/Welcome";
import Setup from "./views/setup/Setup";
import Journal from "./views/journal/Journal";

// 主應用組件
const App = () => {
  const [page, setPage] = useState("welcome");
  const [userData, setUserData] = useState(null);

  const handleStart = () => {
    setPage("setup");
  };

  const handleSetupComplete = (data) => {
    setUserData(data);
    setPage("welcome");
  };

  const handleJournalClick = () => {
    setPage("journal");
  };

  const handleBackToWelcome = () => {
    setPage("welcome");
  };

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {page === "welcome" && (
          <Welcome
            onStart={handleStart}
            userData={userData}
            onJournalClick={handleJournalClick}
          />
        )}
        {page === "setup" && <Setup onComplete={handleSetupComplete} />}
        {page === "journal" && (
          <Journal
            idolName={userData?.idolName}
            onBackToWelcome={handleBackToWelcome}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
