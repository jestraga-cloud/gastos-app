'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, TrendingUp, Download, PieChart } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
}

const categories: Category[] = [
  { id: 'comida', name: 'Comida', emoji: '🍔', color: '#f97316' },
  { id: 'transporte', name: 'Transporte', emoji: '🚗', color: '#3b82f6' },
  { id: 'servicios', name: 'Servicios', emoji: '💡', color: '#eab308' },
  { id: 'compras', name: 'Compras', emoji: '🛒', color: '#a855f7' },
  { id: 'salud', name: 'Salud', emoji: '🏥', color: '#ef4444' },
  { id: 'ocio', name: 'Ocio', emoji: '🎮', color: '#ec4899' },
  { id: 'otros', name: 'Otros', emoji: '📦', color: '#6b7280' }
];

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<'add' | 'list' | 'reports'>('add');

  useEffect(() => {
    const stored = localStorage.getItem('expenses');
    if (stored) {
      setExpenses(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const addExpense = () => {
    if (!amount || !selectedCategory) return;
    
    const newExpense: Expense = {
      id: Date.now(),
      amount: parseFloat(amount),
      category: selectedCategory,
      date: new Date().toISOString()
    };
    
    setExpenses([newExpense, ...expenses]);
    setAmount('');
    setSelectedCategory(null);
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const deleteExpense = (id: number) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const getCurrentMonthExpenses = () => {
    const now = new Date();
    return expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    });
  };

  const getMonthExpenses = (monthOffset: number = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === date.getMonth() && 
             expenseDate.getFullYear() === date.getFullYear();
    });
  };

  const monthExpenses = getCurrentMonthExpenses();
  const totalMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryData = (categoryId: string): Category | undefined => {
    return categories.find(c => c.id === categoryId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' +
           date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Categoría', 'Monto'];
    const rows = expenses.map(e => {
      const cat = getCategoryData(e.category);
      const date = new Date(e.date).toLocaleString('es-AR');
      return [date, cat?.name || '', e.amount];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const NavBar = () => (
    <div className="flex justify-around bg-slate-800 rounded-full p-2 mb-6 shadow-lg">
      <button
        onClick={() => setView('add')}
        className={`flex-1 py-3 rounded-full transition-all ${
          view === 'add' ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Plus size={24} className="mx-auto" />
      </button>
      <button
        onClick={() => setView('list')}
        className={`flex-1 py-3 rounded-full transition-all ${
          view === 'list' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Calendar size={24} className="mx-auto" />
      </button>
      <button
        onClick={() => setView('reports')}
        className={`flex-1 py-3 rounded-full transition-all ${
          view === 'reports' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
        }`}
      >
        <TrendingUp size={24} className="mx-auto" />
      </button>
    </div>
  );

  if (view === 'reports') {
    const categoryTotals = categories.map(cat => ({
      ...cat,
      total: monthExpenses
        .filter(e => e.category === cat.id)
        .reduce((sum, e) => sum + e.amount, 0)
    })).filter(cat => cat.total > 0);

    const pieData = categoryTotals.map(cat => ({
      name: cat.name,
      value: cat.total,
      color: cat.color
    }));

    const dailyExpenses: { [key: string]: number } = {};
    monthExpenses.forEach(e => {
      const day = new Date(e.date).getDate();
      dailyExpenses[day] = (dailyExpenses[day] || 0) + e.amount;
    });
    const dailyData = Object.keys(dailyExpenses).map(day => ({
      day: `${day}`,
      total: dailyExpenses[day]
    })).sort((a, b) => parseInt(a.day) - parseInt(b.day));

    const monthlyComparison = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    for (let i = -5; i <= 0; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthExp = getMonthExpenses(i);
      const total = monthExp.reduce((sum, e) => sum + e.amount, 0);
      monthlyComparison.push({
        mes: monthNames[date.getMonth()],
        total: total
      });
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Reportes</h1>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full transition-all"
            >
              <Download size={18} />
              <span className="text-sm">CSV</span>
            </button>
          </div>

          <NavBar />

          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-xl mb-6">
            <div className="text-sm opacity-90 mb-1">Total del mes actual</div>
            <div className="text-4xl font-bold">${totalMonth.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
          </div>

          {pieData.length > 0 && (
            <div className="bg-slate-800 p-6 rounded-2xl mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Distribución por Categoría
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {categoryTotals.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span>{cat.emoji} {cat.name}</span>
                    </div>
                    <span className="font-semibold">${cat.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dailyData.length > 0 && (
            <div className="bg-slate-800 p-6 rounded-2xl mb-6">
              <h2 className="text-lg font-semibold mb-4">Gastos por Día (Mes Actual)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyData}>
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    formatter={(value: any) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {monthlyComparison.some(m => m.total > 0) && (
            <div className="bg-slate-800 p-6 rounded-2xl mb-6">
              <h2 className="text-lg font-semibold mb-4">Últimos 6 Meses</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyComparison}>
                  <XAxis dataKey="mes" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    formatter={(value: any) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {expenses.length === 0 && (
            <div className="text-center text-slate-400 py-12">
              <PieChart size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aún no hay gastos registrados</p>
              <p className="text-sm mt-2">Comienza a agregar gastos para ver reportes</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'list') {
    const categoryTotals = categories.map(cat => ({
      ...cat,
      total: monthExpenses
        .filter(e => e.category === cat.id)
        .reduce((sum, e) => sum + e.amount, 0)
    })).filter(cat => cat.total > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Gastos del Mes</h1>

          <NavBar />

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-xl mb-6">
            <div className="text-sm opacity-90 mb-1">Total del mes</div>
            <div className="text-4xl font-bold">${totalMonth.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
            <div className="text-sm opacity-75 mt-2">
              {monthExpenses.length} {monthExpenses.length === 1 ? 'gasto' : 'gastos'}
            </div>
          </div>

          {categoryTotals.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Por Categoría</h2>
              <div className="space-y-2">
                {categoryTotals.map(cat => (
                  <div key={cat.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <span className="font-bold text-lg">${cat.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold mb-3">Últimos Gastos</h2>
          <div className="space-y-2">
            {monthExpenses.map(expense => {
              const cat = getCategoryData(expense.category);
              if (!cat) return null;
              
              return (
                <div key={expense.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium">{cat.name}</div>
                      <div className="text-sm text-slate-400">{formatDate(expense.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">${expense.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            {monthExpenses.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                No hay gastos este mes
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nuevo Gasto</h1>
          <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-full">
            <span className="text-sm text-slate-400">Mes:</span>
            <span className="text-sm font-medium">${totalMonth.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <NavBar />

        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl mb-6">
          <label className="block text-sm text-slate-400 mb-2">Monto</label>
          <div className="flex items-center gap-2 bg-slate-900 p-4 rounded-xl">
            <DollarSign size={32} className="text-green-400" />
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-3xl font-bold outline-none text-white"
              autoFocus
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-3">Categoría</label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-xl transition-all transform active:scale-95`}
                style={{
                  backgroundColor: selectedCategory === cat.id ? cat.color : '#1e293b',
                  transform: selectedCategory === cat.id ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <div className="text-3xl mb-2">{cat.emoji}</div>
                <div className="text-sm font-medium">{cat.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addExpense}
          disabled={!amount || !selectedCategory}
          className={`w-full p-5 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
            amount && selectedCategory
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          Agregar Gasto
        </button>
      </div>
    </div>
  );
}