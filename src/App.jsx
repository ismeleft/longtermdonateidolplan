import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import Welcome from "./views/welcome/Welcome";
import Setup from "./views/setup/Setup";
import Journal from "./views/journal/Journal";
import Auth from "./views/auth/Auth";
import Loading from "./components/Loading";
import IdolSidebar from "./components/IdolSidebar/IdolSidebar";
import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  Timestamp,
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

  // 自動遷移舊資料到新結構
  const migrateOldData = async (userId) => {
    try {
      // 1. 檢查是否已經遷移過
      const migrationKey = `migration_v2_done_${userId}`;
      const migrationDone = localStorage.getItem(migrationKey);

      if (migrationDone) {
        console.log("✅ 資料已經遷移過，跳過");
        return;
      }

      console.log("🔄 開始檢查是否需要遷移舊資料...");

      // 2. 檢查 userSettings 中是否有舊的 idolName
      const userSettingsDoc = await getDoc(doc(db, "userSettings", userId));

      if (!userSettingsDoc.exists()) {
        console.log("⚠️ userSettings 不存在，標記遷移完成");
        localStorage.setItem(migrationKey, "true");
        return;
      }

      const userSettings = userSettingsDoc.data();
      const oldIdolName = userSettings.idolName;
      const oldPhotos = userSettings.photos || [];
      const oldStartDate = userSettings.startDate; // 也遷移 startDate

      console.log("📋 userSettings 資料:", {
        oldIdolName,
        oldPhotos,
        oldStartDate,
      });

      if (!oldIdolName) {
        console.log("⚠️ 沒有舊的 idolName，無需遷移");
        localStorage.setItem(migrationKey, "true");
        return;
      }

      // 3. 檢查 idols collection 中是否已經有對應的 idol
      const idolsQuery = query(
        collection(db, "idols"),
        where("userId", "==", userId),
        where("idolName", "==", oldIdolName)
      );
      const existingIdols = await getDocs(idolsQuery);

      if (!existingIdols.empty) {
        console.log("✅ 已存在對應的 idol，無需遷移");
        localStorage.setItem(migrationKey, "true");
        return;
      }

      // 4. 創建新的 idol 文件（從舊資料遷移，包含 startDate）
      console.log("🚀 開始遷移：創建新的 idol 文件...");
      const newIdolDoc = await addDoc(collection(db, "idols"), {
        idolName: oldIdolName,
        photos: oldPhotos,
        startDate: oldStartDate || new Date().toISOString(), // 遷移 startDate
        userId: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log("✅ 遷移成功！新 idol ID:", newIdolDoc.id);

      // 5. 設定為當前 idol
      localStorage.setItem("current_idol_id", newIdolDoc.id);

      // 6. 標記遷移完成
      localStorage.setItem(migrationKey, "true");

      console.log("🎉 資料遷移完成！");

      // 注意：我們不刪除 userSettings 中的舊欄位，保留以備不時之需
    } catch (error) {
      console.error("❌ 資料遷移失敗:", error);
      // 遷移失敗不影響正常流程
    }
  };

  // 從 Firestore 加載偶像數據 (根據用戶 ID) - 支持多 idol
  const loadIdolData = async (userId) => {
    try {
      console.log("🔍 開始加載用戶偶像資料，用戶ID:", userId);

      // 先執行資料遷移
      await migrateOldData(userId);

      // 1. 查詢用戶的所有 idol
      console.log("🔎 從Firebase查詢用戶的所有偶像資料...");
      const idolsQuery = query(
        collection(db, "idols"),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(idolsQuery);

      console.log("📊 查詢結果:", querySnapshot.size, "個偶像");

      if (querySnapshot.empty) {
        console.log("❌ 沒有找到該用戶的偶像資料");
        setIdolList([]);
        setUserData(null);
        return;
      }

      // 2. 將所有 idol 轉換為陣列
      const allIdols = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("✅ 成功載入", allIdols.length, "個 idol:", allIdols);
      setIdolList(allIdols);

      // 3. 決定當前顯示的 idol
      let currentIdol = null;

      // 3.1 優先使用 localStorage 中保存的 idol
      const savedIdolId = localStorage.getItem("current_idol_id");
      console.log("💾 localStorage中的偶像ID:", savedIdolId);

      if (savedIdolId) {
        currentIdol = allIdols.find((idol) => idol.id === savedIdolId);
        if (currentIdol) {
          console.log("✅ 使用 localStorage 中的 idol:", currentIdol.idolName);
        } else {
          console.log("⚠️ localStorage 中的 idol 不存在於當前列表中");
        }
      }

      // 3.2 如果沒有，使用第一個 idol
      if (!currentIdol) {
        currentIdol = allIdols[0];
        localStorage.setItem("current_idol_id", currentIdol.id);
        console.log("✅ 使用第一個 idol:", currentIdol.idolName);
      }

      // 4. 設定當前 idol
      setUserData(currentIdol);
      console.log("🎯 當前偶像已設定:", currentIdol.idolName);
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
    console.log("📝 Setup 完成，資料:", data);

    if (data.isFirstIdol) {
      // 第一個 idol：正常流程
      console.log("🎉 這是第一個 idol，跳轉到 welcome");
      setUserData(data);
      setIdolList([data]);
      setPage("welcome");
    } else {
      // 新增 idol：重新載入所有 idol
      console.log("➕ 新增了另一個 idol，重新載入列表");
      await loadIdolData(user.uid);
      setPage("welcome");
    }
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
    // 同步更新 idolList 中對應的 idol
    setIdolList((prevList) =>
      prevList.map((idol) => (idol.id === updatedData.id ? updatedData : idol))
    );
  };

  // 切換 idol
  const handleSwitchIdol = (idolId) => {
    console.log("🔄 切換到 idol:", idolId);

    // 從 idolList 中找到對應的 idol
    const targetIdol = idolList.find((idol) => idol.id === idolId);

    if (targetIdol) {
      // 更新當前 idol
      setUserData(targetIdol);
      // 保存到 localStorage
      localStorage.setItem("current_idol_id", idolId);
      console.log("✅ 成功切換到:", targetIdol.idolName);
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
      console.log("🗑️ 準備刪除 idol:", idolId);

      // 找到要刪除的 idol
      const targetIdol = idolList.find((idol) => idol.id === idolId);
      if (!targetIdol) {
        console.error("❌ 找不到要刪除的 idol");
        return;
      }

      // 從 Firebase 刪除 idol 文件
      await deleteDoc(doc(db, "idols", idolId));
      console.log("✅ 已從 Firebase 刪除 idol:", targetIdol.idolName);

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
          console.log("🔄 已切換到:", newCurrentIdol.idolName);
        } else {
          // 如果沒有 idol 了，清空狀態
          setUserData(null);
          localStorage.removeItem("current_idol_id");
          console.log("⚠️ 已刪除所有 idol");
        }
      }

      console.log("✅ 刪除操作完成");
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
      console.log("✅ 已刪除相關的", expensesSnapshot.size, "筆支出記錄");
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
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
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
              user={user}
              onUserDataUpdate={handleUserDataUpdate}
            />
          )}
          {page === "setup" && (
            <Setup onComplete={handleSetupComplete} user={user} />
          )}
          {page === "journal" && (
            <Journal idolName={userData?.idolName} user={user} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
