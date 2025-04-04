import React, { useState } from "react";

export default function BudgetManager() {
  const [budget, setBudget] = useState({
    total: 0,
    spent: 0,
    items: [],
  });

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    date: "",
  });

  const handleAddBudgetItem = () => {
    if (!newItem.name || !newItem.price || !newItem.date) return;

    const price = parseFloat(newItem.price);
    if (isNaN(price)) return;

    setBudget((prev) => ({
      ...prev,
      spent: prev.spent + price,
      items: [...prev.items, { ...newItem, price }],
    }));

    setNewItem({
      name: "",
      price: "",
      date: "",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-lg bg-white/10 p-8 rounded-2xl shadow-2xl">
            <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200">
              追星預算管理
            </h1>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/20 p-6 rounded-xl">
                <p className="text-sm opacity-80">總預算</p>
                <input
                  type="number"
                  className="w-full bg-transparent border-b border-white/30 focus:border-white/50 outline-none mt-2 text-2xl"
                  value={budget.total}
                  onChange={(e) =>
                    setBudget((prev) => ({
                      ...prev,
                      total: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="bg-white/20 p-6 rounded-xl">
                <p className="text-sm opacity-80">已花費</p>
                <p className="text-2xl mt-2">${budget.spent}</p>
                <p className="text-sm opacity-80 mt-2">
                  剩餘: ${(budget.total - budget.spent).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="項目名稱"
                  className="bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-white/30 focus:border-white/50 outline-none"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="金額"
                  className="bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-white/30 focus:border-white/50 outline-none"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, price: e.target.value }))
                  }
                />
                <input
                  type="date"
                  className="bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-white/30 focus:border-white/50 outline-none"
                  value={newItem.date}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>

              <button
                onClick={handleAddBudgetItem}
                className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                添加支出項目
              </button>
            </div>

            <div className="mt-8 space-y-3 max-h-96 overflow-y-auto">
              {budget.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-white/10 p-4 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-lg">{item.name}</p>
                    <p className="text-sm opacity-80">{item.date}</p>
                  </div>
                  <p className="text-xl font-semibold">${item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
