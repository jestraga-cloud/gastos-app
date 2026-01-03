'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, DollarSign, TrendingUp, Download, PieChart, LogOut } from 'lucide-react';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { supabase, type ExpenseWithProfile } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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
  necessary: boolean;
  user_id: string;
  user_name: string;
}

type View = 'add' | 'list' | 'reports';

const categories: Category[] = [
  { id: 'comida', name: 'Comida', emoji: '🍔', color: '#f97316' },
  { id: 'transporte', name: 'Transporte', emoji: '🚗', color: '#3b82f6' },
  { id: 'servicios', name: 'Servicios', emoji: '💡', color: '#eab308' },
  { id: 'compras', name: 'Compras', emoji: '🛒', color: '#a855f7' },
  { id: 'salud', name: 'Salud', emoji: '🏥', color: '#ef4444' },
  { id: 'ocio', name: 'Ocio', emoji: '🎮', color: '#ec4899' },
  { id: 'otros', name: 'Otros', emoji: '📦', color: '#6b7280' }
];

function formatMoney(value: number) {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

function getCategoryData(categoryId: string): Category | undefined {
  return categories.find(c => c.id === categoryId);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) return `Hoy ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ayer ${time}`;

  const dmy = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  return `${dmy} ${time}`;
}

function exportExpensesToCSV(expenses: Expense[]) {
  const headers = ['Fecha', 'Categoría', 'Monto', 'Necesario', 'Usuario'];

  const escape = (v: unknown) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };

  const rows = expenses.map(e => {
    const cat = getCategoryData(e.category);
    const date = new Date(e.date).toLocaleString('es-AR');
    return [date, cat?.name || '', e.amount.toFixed(2), e.necessary ? 'Sí' : 'No', e.user_name].map(escape).join(',');
  });

  const csv = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();

  window.URL.revokeObjectURL(url);
}

function NavBar({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
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
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-slate-800 p-4 rounded-2xl shadow-xl active:scale-[0.99] transition"
    >
      <div className="text-left">
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-slate-400">
          {checked ? 'Marcado como necesario' : 'Marcado como innecesario'}
        </div>
      </div>

      <div
        className={`w-14 h-8 rounded-full p-1 transition ${
          checked ? 'bg-green-500' : 'bg-slate-600'
        }`}
      >
        <div
          className={`h-6 w-6 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

export default function ExpenseTracker() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [necessary, setNecessary] = useState(false);
  const [view, setView] = useState<View>('add');

  // Cargar gastos desde Supabase
  const loadExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, profiles(name)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading expenses:', error.message, error.code, error.details);
      return;
    }

    const mapped: Expense[] = (data as ExpenseWithProfile[]).map(e => ({
      id: e.id,
      amount: Number(e.amount),
      category: e.category,
      date: e.date,
      necessary: e.necessary,
      user_id: e.user_id,
      user_name: e.profiles?.name || 'Usuario'
    }));

    setExpenses(mapped);
  }, []);

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Obtener nombre del perfil
      let { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single();

      // Si no existe el perfil, crearlo con el nombre de los metadatos
      if (!profile) {
        const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario';
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: session.user.id, name: userName })
          .select('name')
          .single();
        profile = newProfile;
      }

      setUserName(profile?.name || session.user.email || 'Usuario');

      await loadExpenses();
      setLoading(false);
    };

    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, loadExpenses]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          // Recargar todos los gastos cuando hay un cambio
          loadExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadExpenses]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const addExpense = async () => {
    if (!amount || !selectedCategory || !user) return;

    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const { error } = await supabase.from('expenses').insert({
      amount: parsed,
      category: selectedCategory,
      date: new Date().toISOString(),
      necessary,
      user_id: user.id
    });

    if (error) {
      console.error('Error adding expense:', error);
      return;
    }

    setAmount('');
    setSelectedCategory(null);
    setNecessary(false);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(50);
    }
  };

  const deleteExpense = async (id: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const monthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const totalMonth = useMemo(() => monthExpenses.reduce((sum, e) => sum + e.amount, 0), [monthExpenses]);

  const totalNecessary = useMemo(
    () => monthExpenses.filter(e => e.necessary).reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses]
  );
  const totalUnnecessary = useMemo(() => totalMonth - totalNecessary, [totalMonth, totalNecessary]);

  const getMonthExpenses = (monthOffset: number = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (view === 'reports') {
    const categoryTotals = categories
      .map(cat => ({
        ...cat,
        total: monthExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
      }))
      .filter(cat => cat.total > 0);

    const pieData = categoryTotals.map(cat => ({
      name: cat.name,
      value: cat.total,
      color: cat.color
    }));

    const dailyExpenses: Record<string, number> = {};
    monthExpenses.forEach(e => {
      const day = new Date(e.date).getDate();
      dailyExpenses[String(day)] = (dailyExpenses[String(day)] || 0) + e.amount;
    });

    const dailyData = Object.keys(dailyExpenses)
      .map(day => ({ day, total: dailyExpenses[day] }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    const monthlyComparison: { mes: string; total: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = -5; i <= 0; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthExp = getMonthExpenses(i);
      const total = monthExp.reduce((sum, e) => sum + e.amount, 0);
      monthlyComparison.push({ mes: monthNames[date.getMonth()], total });
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Reportes</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportExpensesToCSV(expenses)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full transition-all"
              >
                <Download size={18} />
                <span className="text-sm">CSV</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <NavBar view={view} setView={setView} />

          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-xl mb-4">
            <div className="text-sm opacity-90 mb-1">Total del mes actual</div>
            <div className="text-4xl font-bold">${formatMoney(totalMonth)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-800 p-4 rounded-2xl">
              <div className="text-sm text-slate-400">Necesario</div>
              <div className="text-xl font-bold">${formatMoney(totalNecessary)}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl">
              <div className="text-sm text-slate-400">Innecesario</div>
              <div className="text-xl font-bold">${formatMoney(totalUnnecessary)}</div>
            </div>
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
                    label={(props: PieLabelRenderProps) => {
                      const name = props.name ?? '';
                      const percent = props.percent ?? 0;
                      if (!name) return '';
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: unknown) =>
                      `$${formatMoney(typeof value === 'number' ? value : Number(value))}`
                    }
                  />
                </RechartsPie>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {categoryTotals.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>
                        {cat.emoji} {cat.name}
                      </span>
                    </div>
                    <span className="font-semibold">${formatMoney(cat.total)}</span>
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
                    formatter={(value: unknown) =>
                      `$${formatMoney(typeof value === 'number' ? value : Number(value))}`
                    }
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
                    formatter={(value: unknown) =>
                      `$${formatMoney(typeof value === 'number' ? value : Number(value))}`
                    }
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
    const categoryTotals = categories
      .map(cat => ({
        ...cat,
        total: monthExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
      }))
      .filter(cat => cat.total > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Gastos del Mes</h1>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>

          <NavBar view={view} setView={setView} />

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-xl mb-6">
            <div className="text-sm opacity-90 mb-1">Total del mes</div>
            <div className="text-4xl font-bold">${formatMoney(totalMonth)}</div>
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
                    <span className="font-bold text-lg">${formatMoney(cat.total)}</span>
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
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        {cat.name}
                        {expense.necessary && (
                          <span className="text-xs bg-green-600/30 text-green-200 px-2 py-1 rounded-full">
                            Necesario
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {formatDate(expense.date)} · {expense.user_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">${formatMoney(expense.amount)}</span>
                    <button onClick={() => deleteExpense(expense.id)} className="text-red-400 hover:text-red-300 text-sm">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {monthExpenses.length === 0 && <div className="text-center text-slate-400 py-8">No hay gastos este mes</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Nuevo Gasto</h1>
            <p className="text-sm text-slate-400">Hola, {userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-700 px-4 py-2 rounded-full">
              <span className="text-sm text-slate-400">Mes: </span>
              <span className="text-sm font-medium">${totalMonth.toLocaleString('es-AR')}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <NavBar view={view} setView={setView} />

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
          <Toggle checked={necessary} onChange={setNecessary} label="Necesario" />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-3">Categoría</label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="p-4 rounded-xl transition-all transform active:scale-95"
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
