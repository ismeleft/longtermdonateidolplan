import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import Welcome from "./views/welcome/Welcome";
import Setup from "./views/setup/Setup";
import Journal from "./views/journal/Journal";
import Auth from "./views/auth/Auth";
import { db, auth } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

// 主應用組件
const App = () => {
  const [page, setPage] = useState("welcome");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 監聽認證狀態變化
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        await loadIdolData(authUser.uid);
      } else {
        setUser(null);
        setUserData(null);
        localStorage.removeItem("current_idol_id");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 從 Firestore 加載偶像數據 (根據用戶 ID)
  const loadIdolData = async (userId) => {
    try {
      console.log("🔍 開始加載用戶偶像資料，用戶ID:", userId);
      let idolData = null;
      
      // 1. 首先嘗試從 localStorage 加載
      const savedIdolId = localStorage.getItem("current_idol_id");
      console.log("💾 localStorage中的偶像ID:", savedIdolId);
      
      if (savedIdolId) {
        const idolDoc = await getDoc(doc(db, "idols", savedIdolId));
        if (idolDoc.exists() && idolDoc.data().userId === userId) {
          idolData = {
            id: idolDoc.id,
            ...idolDoc.data(),
          };
          console.log("✅ 從 localStorage 成功加載偶像資料:", idolData);
        } else {
          console.log("❌ localStorage中的偶像ID無效或不屬於當前用戶");
          localStorage.removeItem("current_idol_id");
        }
      }

      // 2. 如果 localStorage 沒有或無效，查詢用戶的偶像資料
      if (!idolData) {
        console.log("🔎 從Firebase查詢用戶的偶像資料...");
        const idolsQuery = query(
          collection(db, "idols"),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(idolsQuery);
        
        console.log("📊 查詢結果:", querySnapshot.size, "個偶像");
        
        if (!querySnapshot.empty) {
          // 取得第一個偶像資料 (通常用戶只有一個)
          const firstIdol = querySnapshot.docs[0];
          idolData = {
            id: firstIdol.id,
            ...firstIdol.data(),
          };
          // 更新 localStorage
          localStorage.setItem("current_idol_id", firstIdol.id);
          console.log("✅ 從Firebase成功加載偶像資料:", idolData);
        } else {
          console.log("❌ 沒有找到該用戶的偶像資料");
        }
      }

      // 3. 設定用戶資料
      if (idolData) {
        setUserData(idolData);
        console.log("🎯 偶像資料已設定到狀態");
      } else {
        console.log("⚠️ 沒有偶像資料可設定");
      }
    } catch (error) {
      console.error("❌ 加載偶像數據失敗:", error);
    }
  };

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

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    setPage("welcome");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPage("welcome");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  const handleUserDataUpdate = (updatedData) => {
    setUserData(updatedData);
  };

  if (loading) {
    return <div className="loading">加載中...</div>;
  }

  // 如果用戶未登入，顯示認證頁面
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app">
      {/* 全局返回首頁按鈕 - 只在非首頁時顯示 */}
      {page !== "welcome" && (
        <button 
          className="home-button" 
          onClick={handleBackToWelcome}
          aria-label="Back to Home"
        >
          Home
        </button>
      )}

      {/* 登出按鈕 - 只在首頁時顯示 */}
      {page === "welcome" && (
        <button 
          className="logout-button" 
          onClick={handleLogout}
          aria-label="Logout"
        >
          登出
        </button>
      )}
      
      <AnimatePresence mode="wait">
        {page === "welcome" && (
          <Welcome
            onStart={handleStart}
            userData={userData}
            onJournalClick={handleJournalClick}
            user={user}
            onUserDataUpdate={handleUserDataUpdate}
          />
        )}
        {page === "setup" && <Setup onComplete={handleSetupComplete} user={user} />}
        {page === "journal" && (
          <Journal
            idolName={userData?.idolName}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
