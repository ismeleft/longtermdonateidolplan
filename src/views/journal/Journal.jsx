import React, { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
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
  setDoc,
  getDoc,
} from "firebase/firestore";

const Journal = ({ idolName, user }) => {
  const [expenses, setExpenses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [monthlyBudgets, setMonthlyBudgets] = useState({});
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [countdownEvents, setCountdownEvents] = useState([]);
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

  const loadUserSettings = useCallback(async () => {
    if (!user) return;
    try {
      const settingsDoc = await getDoc(doc(db, "userSettings", user.uid));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        setStartDate(
          settings.startDate ? new Date(settings.startDate) : new Date()
        );
        setMonthlyBudgets(settings.monthlyBudgets || {});
        setCountdownEvents(settings.countdownEvents || []);
      } else {
        // If no settings document, create a default one
        const defaultSettings = {
          startDate: new Date().toISOString(),
          monthlyBudgets: {},
          countdownEvents: [],
          updatedAt: Timestamp.now(),
        };
        await setDoc(doc(db, "userSettings", user.uid), defaultSettings);
      }
    } catch (error) {
      console.error("Failed to load user settings:", error);
    }
  }, [user]);

  const loadExpenses = useCallback(async () => {
    if (!user || !idolName) return;
    try {
      const expensesRef = collection(db, "expenses");
      const q = query(
        expensesRef,
        where("idolName", "==", idolName),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);

      const loadedExpenses = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date || Timestamp.now(),
      }));

      setExpenses(loadedExpenses);
    } catch (error) {
      console.error("Failed to load support records:", error);
      alert("Failed to load support records, please try again later");
    }
  }, [user, idolName]);

  // Load user settings from Firebase (only once on mount)
  useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  // Load data from Firebase (only once on mount)
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // ⚠️ 移除自動保存的 useEffect，改為在需要時手動呼叫 saveUserSettings()
  // 原本的 useEffect 會造成無限循環：userSettings 變化 → 保存 → 更新 state → 再次觸發...
  // useEffect(() => {
  //   if (user && userSettings) {
  //     saveUserSettings();
  //   }
  // }, [user, userSettings, saveUserSettings]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!newExpense.amount || Number(newExpense.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    if (!newExpense.category) {
      newErrors.category = "Please select a category";
    }
    if (!newExpense.description) {
      newErrors.description = "Please enter a description";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate support duration (days)
  const calculateDuration = () => {
    const now = new Date();
    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate total support
  const calculateTotalExpenses = () => {
    return expenses.reduce(
      (total, expense) => total + Number(expense.amount),
      0
    );
  };

  // Calculate yearly support
  const calculateYearlyExpenses = () => {
    const currentYear = new Date().getFullYear();
    return expenses
      .filter((expense) => {
        try {
          const expenseDate = expense.date.toDate();
          return expenseDate.getFullYear() === currentYear;
        } catch (error) {
          console.error(
            "Date conversion failed when calculating yearly support:",
            error
          );
          return false;
        }
      })
      .reduce((total, expense) => total + Number(expense.amount), 0);
  };

  // Get monthly budget
  const getMonthlyBudget = (year, month) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return monthlyBudgets[key] || 0;
  };

  // Set monthly budget
  const setMonthlyBudget = (year, month, amount) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    setMonthlyBudgets((prev) => ({
      ...prev,
      [key]: amount,
    }));
  };

  // Calculate yearly total budget
  const calculateYearlyBudget = () => {
    const currentYear = new Date().getFullYear();
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getMonthlyBudget(currentYear, month);
    }
    return total;
  };

  // Calculate remaining annual budget
  const calculateRemainingBudget = () => {
    const yearlyExpenses = calculateYearlyExpenses();
    const yearlyBudget = calculateYearlyBudget();
    return yearlyBudget - yearlyExpenses;
  };

  // Calculate category support
  const calculateCategoryExpenses = () => {
    return expenses.reduce((acc, expense) => {
      acc[expense.category] =
        (acc[expense.category] || 0) + Number(expense.amount);
      return acc;
    }, {});
  };

  // Prepare data for pie chart
  const getPieChartData = () => {
    const categoryExpenses = calculateCategoryExpenses();
    return Object.entries(categoryExpenses).map(([category, amount]) => ({
      label: category,
      value: amount,
    }));
  };

  // Calculate days remaining
  const calculateDaysLeft = (targetDate) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle add or update support
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
        userId: user.uid, // Add user ID
        date: now,
        createdAt: now,
      };

      if (editingExpense) {
        // Update existing support
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
        // Add new support
        const docRef = await addDoc(collection(db, "expenses"), expenseData);
        const newDoc = { id: docRef.id, ...expenseData };
        setExpenses((prevExpenses) => [...prevExpenses, newDoc]);
      }

      // Reset form
      setNewExpense({
        amount: "",
        category: "",
        description: "",
      });
      setShowAddForm(false);
      setEditingExpense(null);
      setErrors({});

      // Reload data to ensure sync
      await loadExpenses();
    } catch (error) {
      console.error("Failed to save support record:", error);
      alert("Failed to save support record, please try again later");
    }
  };

  // Handle delete support
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      const expenseRef = doc(db, "expenses", expenseId);
      await deleteDoc(expenseRef);
      setExpenses((prevExpenses) =>
        prevExpenses.filter((expense) => expense.id !== expenseId)
      );
    } catch (error) {
      console.error("Failed to delete support record:", error);
      alert("Failed to delete support record, please try again later");
    }
  };

  // Handle edit support
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setNewExpense({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
    });
    setShowAddForm(true);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("Date formatting failed:", error);
      return "Invalid date";
    }
  };

  // Add new countdown event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;

    const newEventObj = {
      id: Date.now(),
      title: newEvent.title,
      date: newEvent.date,
    };

    const updatedEvents = [...countdownEvents, newEventObj];
    setCountdownEvents(updatedEvents);
    setNewEvent({ title: "", date: "" });
    setShowAddEventForm(false);

    // 手動保存到 Firebase
    if (user) {
      try {
        await setDoc(
          doc(db, "userSettings", user.uid),
          {
            startDate: startDate.toISOString(),
            monthlyBudgets,
            countdownEvents: updatedEvents,
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to save countdown event:", error);
      }
    }
  };

  // Delete countdown event
  const handleDeleteEvent = async (eventId) => {
    const updatedEvents = countdownEvents.filter(
      (event) => event.id !== eventId
    );
    setCountdownEvents(updatedEvents);

    // 手動保存到 Firebase
    if (user) {
      try {
        await setDoc(
          doc(db, "userSettings", user.uid),
          {
            startDate: startDate.toISOString(),
            monthlyBudgets,
            countdownEvents: updatedEvents,
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to delete countdown event:", error);
      }
    }
  };

  return (
    <div className="accounting-app">
      {/* Page title */}
      <header className="app-header">
        <h1 className="app-title">{idolName} Patronage Journal</h1>
        <div className="header-stats">
          <span className="days-count">{calculateDuration()} days</span>
        </div>
      </header>

      {/* Main statistics cards */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Total Support</div>
          <div className="stat-value">${calculateTotalExpenses()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">This Year</div>
          <div className="stat-value">${calculateYearlyExpenses()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Annual Budget</div>
          <div className="stat-value">${calculateYearlyBudget()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">${calculateRemainingBudget()}</div>
        </div>
      </div>

      {/* Main content area */}
      <div className="main-content-grid">
        <div className="budget-section">
          <h3>Budget Management</h3>
          <div className="budget-controls">
            <div className="input-group">
              <label>Current Month Budget:</label>
              <input
                type="number"
                value={getMonthlyBudget(
                  new Date().getFullYear(),
                  new Date().getMonth() + 1
                )}
                onChange={(e) => {
                  const now = new Date();
                  setMonthlyBudget(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    Number(e.target.value)
                  );
                }}
                onBlur={async () => {
                  // 當輸入框失焦時保存到 Firebase
                  if (user) {
                    try {
                      await setDoc(
                        doc(db, "userSettings", user.uid),
                        {
                          startDate: startDate.toISOString(),
                          monthlyBudgets,
                          countdownEvents,
                          updatedAt: Timestamp.now(),
                        },
                        { merge: true }
                      );
                    } catch (error) {
                      console.error("Failed to save budget:", error);
                    }
                  }
                }}
                placeholder="0"
              />
            </div>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setShowBudgetManager(true)}
            style={{ marginTop: "1rem", width: "100%" }}
          >
            Manage Monthly Budgets
          </button>
        </div>

        {/* Countdown events */}
        <div className="countdown-section">
          <h3>Countdowns</h3>
          <div className="countdown-list">
            {countdownEvents.length > 0 ? (
              countdownEvents.map((event) => (
                <div key={event.id} className="countdown-item">
                  <span className="event-name">{event.title}</span>
                  <span className="event-countdown">
                    {calculateDaysLeft(event.date)} days left
                  </span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">No countdowns yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Support analysis chart */}
      <div className="chart-section">
        <h3>Support Analysis</h3>
        <PieChart data={getPieChartData()} size={200} />
      </div>

      {/* Quick action buttons */}
      <div className="action-buttons">
        <button
          className="btn-primary"
          onClick={() => {
            setShowAddForm(true);
            setEditingExpense(null);
            setNewExpense({ amount: "", category: "", description: "" });
          }}
        >
          Add Entry
        </button>
        <button
          className="btn-secondary"
          onClick={() => setShowAddEventForm(true)}
        >
          Add Countdown
        </button>
      </div>

      {/* Add support form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="modal-overlay"
          >
            <div className="modal-content">
              <h3>{editingExpense ? "Edit Support" : "Add Support"}</h3>
              <form onSubmit={handleAddExpense} className="expense-form">
                <div className="form-row">
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    placeholder="Amount"
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
                    <option value="">Select category</option>
                    <option value="Merchandise">Merchandise</option>
                    <option value="Concert">Concert</option>
                    <option value="Support Event">Support Event</option>
                    <option value="Other">Other</option>
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
                    placeholder="Description"
                    className={errors.description ? "error" : ""}
                  />
                  {errors.description && (
                    <span className="error-text">{errors.description}</span>
                  )}
                </div>
                <div className="form-buttons">
                  <button type="submit" className="btn-primary">
                    {editingExpense ? "Update" : "Save"}
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
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add countdown form */}
      <AnimatePresence>
        {showAddEventForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="modal-overlay"
          >
            <div className="modal-content">
              <h3>Add Countdown</h3>
              <form onSubmit={handleAddEvent} className="event-form">
                <div className="form-row">
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="Event name (e.g., Concert, Release)"
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
                  <button type="submit" className="btn-primary">
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowAddEventForm(false);
                      setNewEvent({ title: "", date: "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly budget management modal */}
      <AnimatePresence>
        {showBudgetManager && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="modal-overlay"
          >
            <div className="modal-content budget-modal">
              <h3>Monthly Budget Management</h3>
              <div className="budget-grid">
                {Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1;
                  const year = new Date().getFullYear();
                  const monthName = new Date(year, index).toLocaleDateString(
                    "en-US",
                    { month: "long" }
                  );

                  return (
                    <div key={month} className="budget-month-item">
                      <label>{monthName}</label>
                      <input
                        type="number"
                        value={getMonthlyBudget(year, month)}
                        onChange={(e) =>
                          setMonthlyBudget(year, month, Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="budget-summary">
                <div className="summary-item">
                  <span>Annual Total Budget:</span>
                  <span>${calculateYearlyBudget()}</span>
                </div>
              </div>
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    setShowBudgetManager(false);
                    // 保存預算設定到 Firebase
                    if (user) {
                      try {
                        await setDoc(
                          doc(db, "userSettings", user.uid),
                          {
                            startDate: startDate.toISOString(),
                            monthlyBudgets,
                            countdownEvents,
                            updatedAt: Timestamp.now(),
                          },
                          { merge: true }
                        );
                      } catch (error) {
                        console.error("Failed to save budget settings:", error);
                      }
                    }
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support records list */}
      <div className="expenses-section">
        <h3>Support Records</h3>
        <div className="expenses-list">
          {expenses.length === 0 ? (
            <div className="empty-state">No records yet</div>
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
                    <span className="expense-description">
                      {expense.description}
                    </span>
                    <span className="expense-date">
                      {formatDate(expense.date)}
                    </span>
                  </div>
                </div>
                <div className="expense-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEditExpense(expense)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    Delete
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
