import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../../firebase";
import PieChart from "../../components/PieChart";
import "../../shared.css";
import "./YearlyReview.css";
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
} from "firebase/firestore";

const YearlyReview = ({ idolName, user }) => {
  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [countdownEvents, setCountdownEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);

  // Data loading - fetch all expenses and user settings once
  const loadData = useCallback(async () => {
    if (!user || !idolName) return;

    try {
      setLoading(true);

      // Load all expenses for this idol and user
      const expensesRef = collection(db, "expenses");
      const q = query(
        expensesRef,
        where("idolName", "==", idolName),
        where("userId", "==", user.uid)
      );
      const expensesSnapshot = await getDocs(q);
      const loadedExpenses = expensesSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Load user settings (for countdown events and start date)
      const settingsDoc = await getDoc(doc(db, "userSettings", user.uid));
      const settings = settingsDoc.exists() ? settingsDoc.data() : {};

      setExpenses(loadedExpenses);
      setCountdownEvents(settings.countdownEvents || []);
      setStartDate(
        settings.startDate ? new Date(settings.startDate) : new Date()
      );
    } catch (error) {
      console.error("Failed to load yearly review data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, idolName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate available years (from start date to current year)
  const availableYears = useMemo(() => {
    if (!startDate) return [new Date().getFullYear()];

    const currentYear = new Date().getFullYear();
    const startYear = new Date(startDate).getFullYear();

    const years = [];
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, [startDate]);

  // Filter expenses by selected year
  const yearExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      try {
        const expenseDate = expense.date.toDate();
        return expenseDate.getFullYear() === selectedYear;
      } catch (error) {
        console.error("Date conversion failed:", error);
        return false;
      }
    });
  }, [expenses, selectedYear]);

  // Filter countdown events by selected year
  const yearEvents = useMemo(() => {
    return countdownEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === selectedYear;
    });
  }, [countdownEvents, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (yearExpenses.length === 0) {
      return {
        total: 0,
        count: 0,
        highest: null,
        average: 0,
        categoryStats: {},
        pieData: [],
        mostFrequent: null,
      };
    }

    // Total yearly expenses
    const total = yearExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    // Highest single expense
    const highest = yearExpenses.reduce((max, expense) =>
      Number(expense.amount) > Number(max.amount) ? expense : max
    );

    // Average expense
    const average = total / yearExpenses.length;

    // Category statistics
    const categoryStats = yearExpenses.reduce((acc, expense) => {
      const cat = expense.category;
      if (!acc[cat]) {
        acc[cat] = { count: 0, total: 0 };
      }
      acc[cat].count++;
      acc[cat].total += Number(expense.amount);
      return acc;
    }, {});

    // Convert to PieChart format
    const pieData = Object.entries(categoryStats).map(([label, stats]) => ({
      label,
      value: stats.total,
    }));

    // Most frequent category
    const mostFrequent = Object.entries(categoryStats).reduce(
      (max, [cat, stats]) => {
        return stats.count > (max.count || 0)
          ? { category: cat, ...stats }
          : max;
      },
      {}
    );

    return {
      total,
      count: yearExpenses.length,
      highest,
      average,
      categoryStats,
      pieData,
      mostFrequent,
    };
  }, [yearExpenses]);

  if (loading) {
    return (
      <div className="accounting-app">
        <div className="loading">Loading yearly review...</div>
      </div>
    );
  }

  // Empty state for new users
  if (expenses.length === 0) {
    return (
      <div className="accounting-app">
        <div className="welcome-state" style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Welcome to Your Yearly Review!</h2>
          <p>Start logging your support activities to see your annual statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="accounting-app">
      {/* Header with Year Selector */}
      <div className="year-selector">
        <h1 style={{ margin: 0 }}>{selectedYear} Yearly Review</h1>
        <select
          className="year-dropdown"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state for year with no expenses */}
      {yearExpenses.length === 0 ? (
        <div className="empty-year-state" style={{ textAlign: "center", padding: "2rem" }}>
          <h3>No support records in {selectedYear}</h3>
          <p>You haven't logged any support activities this year yet.</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: "2rem" }}>
            <div className="stat-item">
              <div className="stat-label">Total Yearly Support</div>
              <div className="stat-value">
                ${stats.total.toLocaleString()}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Transactions</div>
              <div className="stat-value">{stats.count}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Highest Expense</div>
              <div className="stat-value">
                ${stats.highest?.amount || 0}
              </div>
              {stats.highest?.description && (
                <div className="stat-sublabel" style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
                  {stats.highest.description}
                </div>
              )}
            </div>
            <div className="stat-item">
              <div className="stat-label">Average per Transaction</div>
              <div className="stat-value">
                ${stats.average.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Category Analysis Section */}
          <div className="chart-section" style={{ marginBottom: "2rem" }}>
            <h3>{selectedYear} Category Breakdown</h3>
            <PieChart data={stats.pieData} />
          </div>

          {/* Category Details Table */}
          {Object.keys(stats.categoryStats).length > 0 && (
            <div className="category-details" style={{ marginBottom: "2rem" }}>
              <h4>Category Statistics</h4>
              <div className="category-table-wrapper">
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Total</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.categoryStats).map(
                      ([category, data]) => (
                        <tr key={category}>
                          <td>{category}</td>
                          <td>{data.count}</td>
                          <td>${data.total.toLocaleString()}</td>
                          <td>
                            {((data.total / stats.total) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Highlights Section */}
          {stats.mostFrequent && stats.mostFrequent.category && (
            <div className="highlight-card" style={{ marginBottom: "2rem" }}>
              <div className="highlight-title">Most Frequent Category</div>
              <div className="highlight-value">{stats.mostFrequent.category}</div>
              <div className="highlight-subtitle">
                {stats.mostFrequent.count} times
              </div>
            </div>
          )}

          {/* Countdown Events Section */}
          <div className="year-events-section">
            <h3>{selectedYear} Countdown Events</h3>
            {yearEvents.length > 0 ? (
              <div className="events-list">
                {yearEvents.map((event) => {
                  const eventDate = new Date(event.date);
                  const isPast = eventDate < new Date();
                  return (
                    <div
                      key={event.id}
                      className={`event-item ${isPast ? "past" : "upcoming"}`}
                    >
                      <span className="event-title">{event.title}</span>
                      <span className="event-date">
                        {eventDate.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="event-status">
                        {isPast ? "Completed" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                No countdown events in {selectedYear}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default YearlyReview;
