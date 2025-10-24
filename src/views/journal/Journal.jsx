import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../firebase";
import PieChart from "../../components/PieChart";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

const Journal = ({ idolName }) => {
  const [expenses, setExpenses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const savedDate = localStorage.getItem("idol_start_date");
    return savedDate ? new Date(savedDate) : new Date();
  });
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const savedBudget = localStorage.getItem("monthly_budget");
    return savedBudget ? Number(savedBudget) : 0;
  });
  const [yearlyBudget, setYearlyBudget] = useState(() => {
    const savedBudget = localStorage.getItem("yearly_budget");
    return savedBudget ? Number(savedBudget) : 0;
  });
  const [countdownEvents, setCountdownEvents] = useState(() => {
    const savedEvents = localStorage.getItem("countdown_events");
    return savedEvents ? JSON.parse(savedEvents) : [];
  });
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "",
    description: "",
  });
  const [errors, setErrors] = useState({});

  // 保存設置到 localStorage
  useEffect(() => {
    localStorage.setItem("idol_start_date", startDate.toISOString());
    localStorage.setItem("monthly_budget", monthlyBudget.toString());
    localStorage.setItem("yearly_budget", yearlyBudget.toString());
    localStorage.setItem("countdown_events", JSON.stringify(countdownEvents));
  }, [startDate, monthlyBudget, yearlyBudget, countdownEvents]);

  // 從 Firebase 加載數據
  useEffect(() => {
    if (idolName) {
      loadExpenses();
    }
  }, [idolName]);

  const loadExpenses = async () => {
    try {
      const expensesRef = collection(db, "expenses");
      const q = query(expensesRef, where("idolName", "==", idolName));
      const querySnapshot = await getDocs(q);

      const loadedExpenses = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date || Timestamp.now(),
      }));

      setExpenses(loadedExpenses);
    } catch (error) {
      console.error("加載支出記錄失敗:", error);
      alert("加載支出記錄失敗，請稍後再試");
    }
  };

  // 驗證表單
  const validateForm = () => {
    const newErrors = {};
    if (!newExpense.amount || Number(newExpense.amount) <= 0) {
      newErrors.amount = "請輸入有效金額";
    }
    if (!newExpense.category) {
      newErrors.category = "請選擇分類";
    }
    if (!newExpense.description) {
      newErrors.description = "請輸入描述";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 計算追星時長（天數）
  const calculateDuration = () => {
    const now = new Date();
    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 計算總支出
  const calculateTotalExpenses = () => {
    return expenses.reduce(
      (total, expense) => total + Number(expense.amount),
      0
    );
  };

  // 計算年度支出
  const calculateYearlyExpenses = () => {
    const currentYear = new Date().getFullYear();
    return expenses
      .filter((expense) => {
        try {
          const expenseDate = expense.date.toDate();
          return expenseDate.getFullYear() === currentYear;
        } catch (error) {
          console.error("計算年度支出時日期轉換失敗:", error);
          return false;
        }
      })
      .reduce((total, expense) => total + Number(expense.amount), 0);
  };

  // 計算年度剩餘預算
  const calculateRemainingBudget = () => {
    const yearlyExpenses = calculateYearlyExpenses();
    return yearlyBudget - yearlyExpenses;
  };

  // 計算各類別支出
  const calculateCategoryExpenses = () => {
    return expenses.reduce((acc, expense) => {
      acc[expense.category] =
        (acc[expense.category] || 0) + Number(expense.amount);
      return acc;
    }, {});
  };

  // 為圓餅圖準備數據
  const getPieChartData = () => {
    const categoryExpenses = calculateCategoryExpenses();
    return Object.entries(categoryExpenses).map(([category, amount]) => ({
      label: category,
      value: amount
    }));
  };

  // 計算倒數天數
  const calculateDaysLeft = (targetDate) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 處理添加或更新支出
  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const now = Timestamp.now();
      const expenseData = {
        amount: Number(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description,
        idolName,
        date: now,
        createdAt: now,
      };

      if (editingExpense) {
        // 更新現有支出
        const expenseRef = doc(db, "expenses", editingExpense.id);
        await updateDoc(expenseRef, {
          ...expenseData,
          updatedAt: now,
        });

        setExpenses((prevExpenses) =>
          prevExpenses.map((expense) =>
            expense.id === editingExpense.id
              ? { ...expense, ...expenseData }
              : expense
          )
        );
      } else {
        // 添加新支出
        const docRef = await addDoc(collection(db, "expenses"), expenseData);
        const newDoc = { id: docRef.id, ...expenseData };
        setExpenses((prevExpenses) => [...prevExpenses, newDoc]);
      }

      // 重置表單
      setNewExpense({
        amount: "",
        category: "",
        description: "",
      });
      setShowAddForm(false);
      setEditingExpense(null);
      setErrors({});

      // 重新加載數據以確保同步
      await loadExpenses();
    } catch (error) {
      console.error("保存支出記錄失敗:", error);
      alert("保存支出記錄失敗，請稍後再試");
    }
  };

  // 處理刪除支出
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("確定要刪除這筆支出嗎？")) {
      return;
    }

    try {
      const expenseRef = doc(db, "expenses", expenseId);
      await deleteDoc(expenseRef);
      setExpenses((prevExpenses) =>
        prevExpenses.filter((expense) => expense.id !== expenseId)
      );
    } catch (error) {
      console.error("刪除支出記錄失敗:", error);
      alert("刪除支出記錄失敗，請稍後再試");
    }
  };

  // 處理編輯支出
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setNewExpense({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
    });
    setShowAddForm(true);
  };

  // 格式化日期
  const formatDate = (timestamp) => {
    if (!timestamp) return "日期未知";
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("日期格式化失敗:", error);
      return "日期格式錯誤";
    }
  };

  // 添加新倒數事件
  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;

    const newEventObj = {
      id: Date.now(),
      title: newEvent.title,
      date: newEvent.date,
    };

    setCountdownEvents([...countdownEvents, newEventObj]);
    setNewEvent({ title: "", date: "" });
    setShowAddEventForm(false);
  };

  // 刪除倒數事件
  const handleDeleteEvent = (eventId) => {
    setCountdownEvents(countdownEvents.filter((event) => event.id !== eventId));
  };

  return (
    <div className="accounting-app">
      {/* 頁面標題 */}
      <header className="app-header">
        <h1 className="app-title">{idolName} 追星記帳</h1>
        <div className="header-stats">
          <span className="days-count">{calculateDuration()} 天</span>
        </div>
      </header>

      {/* 主要統計卡片 */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">總支出</div>
          <div className="stat-value">${calculateTotalExpenses()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">本年度支出</div>
          <div className="stat-value">${calculateYearlyExpenses()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">年度預算</div>
          <div className="stat-value">${yearlyBudget}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">剩餘預算</div>
          <div className="stat-value">${calculateRemainingBudget()}</div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="main-content-grid">
        <div className="budget-section">
          <h3>預算管理</h3>
          <div className="budget-controls">
            <div className="input-group">
              <label>月定期存款：</label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMonthlyBudget(value);
                  setYearlyBudget(value * 12);
                }}
                placeholder="0"
              />
            </div>
            <div className="input-group">
              <label>開始日期：</label>
              <input
                type="date"
                value={startDate.toISOString().split("T")[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* 倒數事件 */}
        <div className="countdown-section">
          <h3>倒數日</h3>
          <div className="countdown-list">
            {countdownEvents.length > 0 ? (
              countdownEvents.map((event) => (
                <div key={event.id} className="countdown-item">
                  <span className="event-name">{event.title}</span>
                  <span className="event-countdown">
                    還有 {calculateDaysLeft(event.date)} 天
                  </span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    刪除
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">尚無倒數事件</div>
            )}
          </div>
        </div>
      </div>

      {/* 支出分析圖表 */}
      <div className="chart-section">
        <h3>支出分析</h3>
        <PieChart data={getPieChartData()} size={200} />
      </div>

      {/* 快速操作按鈕 */}
      <div className="action-buttons">
        <button 
          className="btn-primary"
          onClick={() => {
            setShowAddForm(true);
            setEditingExpense(null);
            setNewExpense({ amount: "", category: "", description: "" });
          }}
        >
          記一筆
        </button>
        <button 
          className="btn-secondary"
          onClick={() => setShowAddEventForm(true)}
        >
          添加倒數日
        </button>
      </div>

      {/* 新增支出表單 */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="modal-overlay"
          >
            <div className="modal-content">
              <h3>{editingExpense ? "編輯支出" : "新增支出"}</h3>
              <form onSubmit={handleAddExpense} className="expense-form">
                <div className="form-row">
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    placeholder="金額"
                    className={errors.amount ? "error" : ""}
                  />
                  {errors.amount && (
                    <span className="error-text">{errors.amount}</span>
                  )}
                </div>
                <div className="form-row">
                  <select
                    value={newExpense.category}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, category: e.target.value })
                    }
                    className={errors.category ? "error" : ""}
                  >
                    <option value="">選擇分類</option>
                    <option value="周邊">周邊</option>
                    <option value="演唱會">演唱會</option>
                    <option value="應援">應援</option>
                    <option value="其他">其他</option>
                  </select>
                  {errors.category && (
                    <span className="error-text">{errors.category}</span>
                  )}
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        description: e.target.value,
                      })
                    }
                    placeholder="描述"
                    className={errors.description ? "error" : ""}
                  />
                  {errors.description && (
                    <span className="error-text">{errors.description}</span>
                  )}
                </div>
                <div className="form-buttons">
                  <button type="submit" className="btn-primary">
                    {editingExpense ? "更新" : "保存"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingExpense(null);
                      setErrors({});
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 新增倒數日表單 */}
      <AnimatePresence>
        {showAddEventForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="modal-overlay"
          >
            <div className="modal-content">
              <h3>添加倒數日</h3>
              <form onSubmit={handleAddEvent} className="event-form">
                <div className="form-row">
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="事件名稱（如：演唱會、回歸）"
                  />
                </div>
                <div className="form-row">
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, date: e.target.value })
                    }
                  />
                </div>
                <div className="form-buttons">
                  <button type="submit" className="btn-primary">保存</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowAddEventForm(false);
                      setNewEvent({ title: "", date: "" });
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 支出記錄列表 */}
      <div className="expenses-section">
        <h3>支出記錄</h3>
        <div className="expenses-list">
          {expenses.length === 0 ? (
            <div className="empty-state">尚無支出記錄</div>
          ) : (
            expenses.map((expense) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="expense-item"
              >
                <div className="expense-main">
                  <div className="expense-info">
                    <span className="expense-amount">${expense.amount}</span>
                    <span className="expense-category">{expense.category}</span>
                  </div>
                  <div className="expense-details">
                    <span className="expense-description">{expense.description}</span>
                    <span className="expense-date">{formatDate(expense.date)}</span>
                  </div>
                </div>
                <div className="expense-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEditExpense(expense)}
                  >
                    編輯
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    刪除
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Journal;