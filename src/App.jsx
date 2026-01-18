import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import Welcome from "./views/welcome/Welcome";
import Setup from "./views/setup/Setup";
import Journal from "./views/journal/Journal";
import YearlyReview from "./views/yearlyreview/YearlyReview";
import Auth from "./views/auth/Auth";
import Loading from "./components/Loading";
import IdolSidebar from "./components/IdolSidebar/IdolSidebar";
import { db, auth } from "./firebase";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

// 主應用組件
const App = () => {
  const [page, setPage] = useState("welcome");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 側邊欄狀態（手機版用）
  const [idolList, setIdolList] = useState([]); // 所有 idol 列表（暫時用於 UI 展示）
  const hasLoadedData = React.useRef(false); // 追蹤是否已載入資料（避免重複載入）

  // 監聽認證狀態變化
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // 只在第一次載入時從 Firebase 獲取資料
        if (!hasLoadedData.current) {
          await loadIdolData(authUser.uid);
          hasLoadedData.current = true;
        }
      } else {
        setUser(null);
        setUserData(null);
        localStorage.removeItem("current_idol_id");
        hasLoadedData.current = false; // 重置標記
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 從 Firestore 加載偶像數據 (根據用戶 ID) - 支持多 idol
  const loadIdolData = async (userId) => {
    try {
      // 1. 查詢用戶的所有 idol
      const idolsQuery = query(
        collection(db, "idols"),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(idolsQuery);

      if (querySnapshot.empty) {
        setIdolList([]);
        setUserData(null);
        return;
      }

      // 2. 將所有 idol 轉換為陣列
      const allIdols = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setIdolList(allIdols);

      // 3. 決定當前顯示的 idol
      let currentIdol = null;

      // 3.1 優先使用 localStorage 中保存的 idol
      const savedIdolId = localStorage.getItem("current_idol_id");

      if (savedIdolId) {
        currentIdol = allIdols.find((idol) => idol.id === savedIdolId);
      }

      // 3.2 如果沒有，使用第一個 idol
      if (!currentIdol) {
        currentIdol = allIdols[0];
        localStorage.setItem("current_idol_id", currentIdol.id);
      }

      // 4. 設定當前 idol
      setUserData(currentIdol);
    } catch (error) {
      console.error("❌ 加載偶像數據失敗:", error);
      setIdolList([]);
      setUserData(null);
    }
  };

  const handleStart = () => {
    setPage("setup");
  };

  const handleSetupComplete = async (data) => {
    if (data.isFirstIdol) {
      // 第一個 idol：正常流程
      setUserData(data);
      setIdolList([data]);
      setPage("welcome");
    } else {
      // 新增 idol：重新載入所有 idol
      await loadIdolData(user.uid);
      setPage("welcome");
    }
  };

  const handleJournalClick = () => {
    setPage("journal");
  };

  const handleYearlyReviewClick = () => {
    setPage("yearlyreview");
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
    // 同步更新 idolList 中對應的 idol
    setIdolList((prevList) =>
      prevList.map((idol) => (idol.id === updatedData.id ? updatedData : idol))
    );
  };

  // 切換 idol
  const handleSwitchIdol = (idolId) => {
    // 從 idolList 中找到對應的 idol
    const targetIdol = idolList.find((idol) => idol.id === idolId);

    if (targetIdol) {
      // 更新當前 idol
      setUserData(targetIdol);
      // 保存到 localStorage
      localStorage.setItem("current_idol_id", idolId);
    } else {
      console.error("❌ 找不到 idol:", idolId);
    }

    // 手機版關閉側邊欄
    setSidebarOpen(false);
  };

  // 新增 idol
  const handleAddNewIdol = () => {
    setPage("setup");
    setSidebarOpen(false);
  };

  // 刪除 idol
  const handleDeleteIdol = async (idolId) => {
    try {
      // 找到要刪除的 idol
      const targetIdol = idolList.find((idol) => idol.id === idolId);
      if (!targetIdol) {
        console.error("❌ 找不到要刪除的 idol");
        return;
      }

      // 從 Firebase 刪除 idol 文件
      await deleteDoc(doc(db, "idols", idolId));

      // 更新 idolList（移除被刪除的 idol）
      const newIdolList = idolList.filter((idol) => idol.id !== idolId);
      setIdolList(newIdolList);

      // 如果刪除的是當前 idol，需要切換到另一個 idol
      if (userData?.id === idolId) {
        if (newIdolList.length > 0) {
          // 切換到第一個 idol
          const newCurrentIdol = newIdolList[0];
          setUserData(newCurrentIdol);
          localStorage.setItem("current_idol_id", newCurrentIdol.id);
        } else {
          // 如果沒有 idol 了，清空狀態
          setUserData(null);
          localStorage.removeItem("current_idol_id");
        }
      }

      alert(`Successfully removed ${targetIdol.idolName}`);

      // 注意：此處不刪除相關的 expenses，保留歷史記錄
      // 如果需要刪除 expenses，可以取消下面的註解
      /*
      const expensesQuery = query(
        collection(db, "expenses"),
        where("idolName", "==", targetIdol.idolName),
        where("userId", "==", user.uid)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const deletePromises = expensesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      */
    } catch (error) {
      console.error("❌ 刪除 idol 失敗:", error);
      alert("Failed to remove artist, please try again later");
    }
  };

  if (loading) {
    return <Loading />;
  }

  // 如果用戶未登入，顯示認證頁面
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app">
      {/* IdolSidebar - 只在有 userData 時顯示（非 setup 頁面） */}
      {userData && page !== "setup" && (
        <IdolSidebar
          idolList={idolList}
          currentIdolId={userData?.id}
          onSwitchIdol={handleSwitchIdol}
          onAddNew={handleAddNewIdol}
          onDelete={handleDeleteIdol}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* 主內容區 */}
      <div
        className={`main-app-content ${
          userData && page !== "setup" ? "with-sidebar" : ""
        }`}
      >
        {/* 手機版漢堡選單按鈕 */}
        {userData && page !== "setup" && !sidebarOpen && (
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Menu"
          >
            ☰
          </button>
        )}

        {/* 全局返回首頁按鈕 - 只在非首頁時顯示 */}
        {page !== "welcome" && (
          <button
            className="home-button"
            onClick={handleBackToWelcome}
            aria-label="Back to Home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
        )}

        {/* 登出按鈕 - 只在首頁時顯示 */}
        {page === "welcome" && userData && (
          <button
            className="logout-button"
            onClick={handleLogout}
            aria-label="Logout"
          >
            Sign Out
          </button>
        )}

        <AnimatePresence mode="wait">
          {page === "welcome" && (
            <Welcome
              onStart={handleStart}
              userData={userData}
              onJournalClick={handleJournalClick}
              onYearlyReviewClick={handleYearlyReviewClick}
              user={user}
              onUserDataUpdate={handleUserDataUpdate}
            />
          )}
          {page === "setup" && (
            <Setup onComplete={handleSetupComplete} user={user} />
          )}
          {page === "journal" && (
            <Journal
              idolName={userData?.idolName}
              user={user}
              onYearlyReviewClick={handleYearlyReviewClick}
            />
          )}
          {page === "yearlyreview" && (
            <YearlyReview idolName={userData?.idolName} user={user} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
