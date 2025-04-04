import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

const Journal = ({ idolName, onBackToWelcome }) => {
  const [expenses, setExpenses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [yearlyBudget, setYearlyBudget] = useState(0);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "",
    description: "",
  });
  const [errors, setErrors] = useState({});

  // 從 Firebase 加載數據
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const q = query(
          collection(db, "expenses"),
          where("idolName", "==", idolName)
        );
        const querySnapshot = await getDocs(q);
        const loadedExpenses = [];
        querySnapshot.forEach((doc) => {
          loadedExpenses.push({ id: doc.id, ...doc.data() });
        });
        setExpenses(loadedExpenses);
      } catch (error) {
        console.error("Error loading expenses:", error);
      }
    };

    if (idolName) {
      loadExpenses();
    }
  }, [idolName]);

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
    return `${diffDays} 天`;
  };

  // 計算總支出
  const calculateTotalExpenses = () => {
    return expenses.reduce(
      (total, expense) => total + Number(expense.amount),
      0
    );
  };

  // 計算各類別支出
  const calculateCategoryExpenses = () => {
    return expenses.reduce((acc, expense) => {
      acc[expense.category] =
        (acc[expense.category] || 0) + Number(expense.amount);
      return acc;
    }, {});
  };

  // 計算年度剩餘預算
  const calculateRemainingBudget = () => {
    const totalExpenses = calculateTotalExpenses();
    return yearlyBudget - totalExpenses;
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const expenseData = {
        ...newExpense,
        date: new Date(),
        idolName,
        amount: Number(newExpense.amount),
      };

      const docRef = await addDoc(collection(db, "expenses"), expenseData);
      setExpenses([...expenses, { id: docRef.id, ...expenseData }]);
      setNewExpense({ amount: "", category: "", description: "" });
      setShowAddForm(false);
      setErrors({});
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="journal-page"
    >
      <div className="journal-header">
        <button className="back-button" onClick={onBackToWelcome}>
          返回主頁
        </button>
        <h2>海外藝術青年 {idolName} 的成長日誌</h2>
      </div>

      {/* 統計概覽 */}
      <div className="stats-overview">
        <div className="stat-card">
          <h3>追星時長</h3>
          <p>{calculateDuration()}</p>
          <div className="date-setter">
            <label>開始日期：</label>
            <input
              type="date"
              value={startDate.toISOString().split("T")[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </div>
        </div>

        <div className="stat-card">
          <h3>支出統計</h3>
          <p>總支出：${calculateTotalExpenses()}</p>
          <div className="category-expenses">
            {Object.entries(calculateCategoryExpenses()).map(
              ([category, amount]) => (
                <div key={category} className="category-item">
                  <span>{category}：</span>
                  <span>${amount}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="stat-card">
          <h3>預算管理</h3>
          <div className="budget-setting">
            <div>
              <label>月定期存款：</label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => {
                  setMonthlyBudget(Number(e.target.value));
                  setYearlyBudget(Number(e.target.value) * 12);
                }}
              />
            </div>
            <div>
              <label>年度預算：</label>
              <p>${yearlyBudget}</p>
            </div>
            <div>
              <label>剩餘預算：</label>
              <p>${calculateRemainingBudget()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 添加支出按鈕 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddForm(true)}
        className="add-expense-button"
      >
        添加支出
      </motion.button>

      {/* 添加支出表單 */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="add-expense-form"
        >
          <form onSubmit={handleAddExpense}>
            <div>
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
                <span className="error-message">{errors.amount}</span>
              )}
            </div>
            <div>
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
                <span className="error-message">{errors.category}</span>
              )}
            </div>
            <div>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                placeholder="描述"
                className={errors.description ? "error" : ""}
              />
              {errors.description && (
                <span className="error-message">{errors.description}</span>
              )}
            </div>
            <button type="submit">保存</button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setErrors({});
              }}
            >
              取消
            </button>
          </form>
        </motion.div>
      )}

      {/* 支出列表 */}
      <div className="expenses-list">
        <h3>支出記錄</h3>
        {expenses.map((expense) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="expense-item"
          >
            <span>
              {new Date(expense.date.toDate()).toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
            <span>{expense.category}</span>
            <span>${expense.amount}</span>
            <span>{expense.description}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Journal;
