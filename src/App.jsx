import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import Welcome from "./views/welcome/Welcome";
import Setup from "./views/setup/Setup";
import Journal from "./views/journal/Journal";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// 主應用組件
const App = () => {
  const [page, setPage] = useState("welcome");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 從 Firestore 加載偶像數據
  useEffect(() => {
    const loadIdolData = async () => {
      try {
        const savedIdolId = localStorage.getItem("current_idol_id");
        if (savedIdolId) {
          const idolDoc = await getDoc(doc(db, "idols", savedIdolId));
          if (idolDoc.exists()) {
            setUserData({
              id: idolDoc.id,
              ...idolDoc.data(),
            });
          } else {
            // 如果文檔不存在，清除 localStorage 中的 ID
            localStorage.removeItem("current_idol_id");
          }
        }
      } catch (error) {
        console.error("加載偶像數據失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIdolData();
  }, []);

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

  if (loading) {
    return <div className="loading">加載中...</div>;
  }

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
