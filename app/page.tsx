'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, DollarSign, TrendingUp, Download, PieChart, LogOut, ChevronLeft, ChevronRight, Users, Target, Edit2, X, Check, RefreshCw, FileSpreadsheet } from 'lucide-react';
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
  is_recurring?: boolean;
  recurring_day?: number;
  description?: string;
}

interface RecurringExpense {
  id: number;
  amount: number;
  category: string;
  day_of_month: number;
  necessary: boolean;
  user_id: string;
  user_name: string;
  description: string;
  active: boolean;
}

interface Budget {
  id: number;
  amount: number;
  month: number;
  year: number;
}

type View = 'add' | 'list' | 'reports' | 'settings';

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

function exportExpensesToCSV(expenses: Expense[], filename?: string) {
  const headers = ['Fecha', 'Categoría', 'Monto', 'Necesario', 'Usuario', 'Descripción'];

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
    return [date, cat?.name || '', e.amount.toFixed(2), e.necessary ? 'Sí' : 'No', e.user_name, e.description || ''].map(escape).join(',');
  });

  const csv = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `gastos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();

  window.URL.revokeObjectURL(url);
}

function exportExpensesToExcel(expenses: Expense[], filename?: string) {
  // Crear tabla HTML para Excel
  const headers = ['Fecha', 'Categoría', 'Monto', 'Necesario', 'Usuario', 'Descripción'];

  let html = '<html><head><meta charset="UTF-8"></head><body>';
  html += '<table border="1">';
  html += '<tr>' + headers.map(h => `<th style="background:#4ade80;font-weight:bold">${h}</th>`).join('') + '</tr>';

  expenses.forEach(e => {
    const cat = getCategoryData(e.category);
    const date = new Date(e.date).toLocaleString('es-AR');
    html += '<tr>';
    html += `<td>${date}</td>`;
    html += `<td>${cat?.emoji || ''} ${cat?.name || ''}</td>`;
    html += `<td style="text-align:right">$${e.amount.toFixed(2)}</td>`;
    html += `<td>${e.necessary ? 'Sí' : 'No'}</td>`;
    html += `<td>${e.user_name}</td>`;
    html += `<td>${e.description || ''}</td>`;
    html += '</tr>';
  });

  html += '</table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `gastos_${new Date().toISOString().split('T')[0]}.xls`;
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
      <button
        onClick={() => setView('settings')}
        className={`flex-1 py-3 rounded-full transition-all ${
          view === 'settings' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Target size={24} className="mx-auto" />
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

// Selector de mes/año
function MonthSelector({
  selectedMonth,
  selectedYear,
  onChange
}: {
  selectedMonth: number;
  selectedYear: number;
  onChange: (month: number, year: number) => void;
}) {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      onChange(11, selectedYear - 1);
    } else {
      onChange(selectedMonth - 1, selectedYear);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      onChange(0, selectedYear + 1);
    } else {
      onChange(selectedMonth + 1, selectedYear);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    onChange(now.getMonth(), now.getFullYear());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  };

  return (
    <div className="flex items-center justify-between bg-slate-800 rounded-xl p-2 mb-4">
      <button onClick={goToPrevMonth} className="p-2 hover:bg-slate-700 rounded-lg transition">
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-2">
        <span className="font-medium">{monthNames[selectedMonth]} {selectedYear}</span>
        {!isCurrentMonth() && (
          <button
            onClick={goToCurrentMonth}
            className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded-full transition"
          >
            Hoy
          </button>
        )}
      </div>
      <button onClick={goToNextMonth} className="p-2 hover:bg-slate-700 rounded-lg transition">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// Selector de usuario
function UserFilter({
  users,
  selectedUserId,
  onChange
}: {
  users: { id: string; name: string }[];
  selectedUserId: string | null;
  onChange: (userId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
          selectedUserId === null ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        <Users size={14} className="inline mr-1" />
        Todos
      </button>
      {users.map(user => (
        <button
          key={user.id}
          onClick={() => onChange(user.id)}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
            selectedUserId === user.id ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {user.name}
        </button>
      ))}
    </div>
  );
}

// Modal de edición
function EditExpenseModal({
  expense,
  onSave,
  onClose
}: {
  expense: Expense;
  onSave: (id: number, data: { amount: number; category: string; necessary: boolean; description?: string }) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category);
  const [necessary, setNecessary] = useState(expense.necessary);
  const [description, setDescription] = useState(expense.description || '');

  const handleSave = () => {
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSave(expense.id, { amount: parsed, category, necessary, description: description.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Editar Gasto</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Monto</label>
            <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-xl">
              <DollarSign size={24} className="text-green-400" />
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-bold outline-none text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Descripción (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Almuerzo en restaurante"
              className="w-full bg-slate-900 p-3 rounded-xl outline-none text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Categoría</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="p-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: category === cat.id ? cat.color : '#1e293b'
                  }}
                >
                  <div className="text-xl">{cat.emoji}</div>
                </button>
              ))}
            </div>
          </div>

          <Toggle checked={necessary} onChange={setNecessary} label="Necesario" />

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 p-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 p-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseTracker() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [necessary, setNecessary] = useState(false);
  const [view, setView] = useState<View>('add');

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Edición
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Presupuesto
  const [newBudgetAmount, setNewBudgetAmount] = useState('');

  // Gastos recurrentes
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringCategory, setRecurringCategory] = useState<string | null>(null);
  const [recurringDay, setRecurringDay] = useState('1');
  const [recurringNecessary, setRecurringNecessary] = useState(false);
  const [recurringDescription, setRecurringDescription] = useState('');

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
      user_name: e.profiles?.name || 'Usuario',
      description: (e as unknown as { description?: string }).description
    }));

    setExpenses(mapped);

    // Extraer usuarios únicos
    const usersMap = new Map<string, string>();
    mapped.forEach(e => usersMap.set(e.user_id, e.user_name));
    setAllUsers(Array.from(usersMap, ([id, name]) => ({ id, name })));
  }, []);

  // Cargar gastos recurrentes
  const loadRecurringExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*, profiles(name)')
      .eq('active', true)
      .order('day_of_month', { ascending: true });

    if (error) {
      // La tabla puede no existir aún
      console.log('Recurring expenses table may not exist yet');
      return;
    }

    const mapped: RecurringExpense[] = (data || []).map((e: Record<string, unknown>) => ({
      id: e.id as number,
      amount: Number(e.amount),
      category: e.category as string,
      day_of_month: e.day_of_month as number,
      necessary: e.necessary as boolean,
      user_id: e.user_id as string,
      user_name: (e.profiles as { name: string } | null)?.name || 'Usuario',
      description: e.description as string,
      active: e.active as boolean
    }));

    setRecurringExpenses(mapped);
  }, []);

  // Cargar presupuesto del mes
  const loadBudget = useCallback(async (month: number, year: number) => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', month + 1) // En DB guardamos 1-12
      .eq('year', year)
      .single();

    if (error) {
      setBudget(null);
      return;
    }

    setBudget(data as Budget);
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
      await loadRecurringExpenses();
      await loadBudget(new Date().getMonth(), new Date().getFullYear());
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
  }, [router, loadExpenses, loadRecurringExpenses, loadBudget]);

  // Cargar presupuesto cuando cambia el mes seleccionado
  const handleMonthChange = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    loadBudget(month, year);
  }, [loadBudget]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
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
      user_id: user.id,
      description: description.trim() || null
    });

    if (error) {
      console.error('Error adding expense:', error);
      return;
    }

    setAmount('');
    setDescription('');
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

  const updateExpense = async (id: number, data: { amount: number; category: string; necessary: boolean; description?: string }) => {
    const { error } = await supabase.from('expenses').update(data).eq('id', id);
    if (error) {
      console.error('Error updating expense:', error);
    }
  };

  const saveBudget = async () => {
    if (!newBudgetAmount) return;

    const parsed = Number.parseFloat(newBudgetAmount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const now = new Date();

    // Verificar si ya existe presupuesto para este mes
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .single();

    if (existing) {
      await supabase.from('budgets').update({ amount: parsed }).eq('id', existing.id);
    } else {
      await supabase.from('budgets').insert({
        amount: parsed,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      });
    }

    setNewBudgetAmount('');
    loadBudget(now.getMonth(), now.getFullYear());
  };

  const addRecurringExpense = async () => {
    if (!recurringAmount || !recurringCategory || !user) return;

    const parsed = Number.parseFloat(recurringAmount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const day = parseInt(recurringDay);
    if (day < 1 || day > 28) return;

    const { error } = await supabase.from('recurring_expenses').insert({
      amount: parsed,
      category: recurringCategory,
      day_of_month: day,
      necessary: recurringNecessary,
      user_id: user.id,
      description: recurringDescription.trim() || `Gasto recurrente - ${getCategoryData(recurringCategory)?.name}`,
      active: true
    });

    if (error) {
      console.error('Error adding recurring expense:', error);
      return;
    }

    setRecurringAmount('');
    setRecurringCategory(null);
    setRecurringDay('1');
    setRecurringNecessary(false);
    setRecurringDescription('');
    setShowRecurringForm(false);
    loadRecurringExpenses();
  };

  const deleteRecurringExpense = async (id: number) => {
    const { error } = await supabase.from('recurring_expenses').update({ active: false }).eq('id', id);
    if (error) {
      console.error('Error deleting recurring expense:', error);
    } else {
      loadRecurringExpenses();
    }
  };

  // Filtrar gastos por mes/año y usuario
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      const matchesMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      const matchesUser = selectedUserId === null || e.user_id === selectedUserId;
      return matchesMonth && matchesUser;
    });
  }, [expenses, selectedMonth, selectedYear, selectedUserId]);

  const totalFiltered = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);

  const totalNecessary = useMemo(
    () => filteredExpenses.filter(e => e.necessary).reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );
  const totalUnnecessary = useMemo(() => totalFiltered - totalNecessary, [totalFiltered, totalNecessary]);

  // Datos para el mes actual (para la vista de agregar)
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const totalCurrentMonth = useMemo(() => currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0), [currentMonthExpenses]);

  const getMonthExpenses = useCallback((monthOffset: number = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  }, [expenses]);

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

  // Vista de configuración (presupuesto y gastos recurrentes)
  if (view === 'settings') {
    const budgetPercentage = budget ? Math.min((totalCurrentMonth / budget.amount) * 100, 100) : 0;
    const budgetRemaining = budget ? budget.amount - totalCurrentMonth : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Configuración</h1>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>

          <NavBar view={view} setView={setView} />

          {/* Presupuesto mensual */}
          <div className="bg-slate-800 p-6 rounded-2xl mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target size={20} className="text-orange-400" />
              Presupuesto Mensual
            </h2>

            {budget ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Presupuesto:</span>
                  <span className="text-2xl font-bold">${formatMoney(budget.amount)}</span>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      budgetPercentage >= 100 ? 'bg-red-500' :
                      budgetPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gastado: ${formatMoney(totalCurrentMonth)}</span>
                  <span className={budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {budgetRemaining >= 0 ? `Restante: $${formatMoney(budgetRemaining)}` : `Excedido: $${formatMoney(Math.abs(budgetRemaining))}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-700">
                  <label className="block text-sm text-slate-400 mb-2">Actualizar presupuesto</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newBudgetAmount}
                      onChange={(e) => setNewBudgetAmount(e.target.value)}
                      placeholder="Nuevo monto"
                      className="flex-1 bg-slate-900 p-3 rounded-xl outline-none"
                    />
                    <button
                      onClick={saveBudget}
                      disabled={!newBudgetAmount}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl transition"
                    >
                      <Check size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">No hay presupuesto definido para este mes</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    placeholder="Monto del presupuesto"
                    className="flex-1 bg-slate-900 p-3 rounded-xl outline-none"
                  />
                  <button
                    onClick={saveBudget}
                    disabled={!newBudgetAmount}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gastos recurrentes */}
          <div className="bg-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw size={20} className="text-blue-400" />
                Gastos Recurrentes
              </h2>
              <button
                onClick={() => setShowRecurringForm(!showRecurringForm)}
                className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition"
              >
                {showRecurringForm ? <X size={18} /> : <Plus size={18} />}
              </button>
            </div>

            {showRecurringForm && (
              <div className="bg-slate-900 p-4 rounded-xl mb-4 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Monto</label>
                    <input
                      type="number"
                      value={recurringAmount}
                      onChange={(e) => setRecurringAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 p-2 rounded-lg outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-slate-400 mb-1">Día</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(e.target.value)}
                      className="w-full bg-slate-800 p-2 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={recurringDescription}
                    onChange={(e) => setRecurringDescription(e.target.value)}
                    placeholder="Ej: Netflix, Spotify, Gimnasio..."
                    className="w-full bg-slate-800 p-2 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                  <div className="flex gap-1 flex-wrap">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setRecurringCategory(cat.id)}
                        className="p-2 rounded-lg transition"
                        style={{ backgroundColor: recurringCategory === cat.id ? cat.color : '#1e293b' }}
                      >
                        {cat.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">¿Es necesario?</label>
                  <button
                    onClick={() => setRecurringNecessary(!recurringNecessary)}
                    className={`w-12 h-6 rounded-full p-0.5 transition ${recurringNecessary ? 'bg-green-500' : 'bg-slate-600'}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${recurringNecessary ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={addRecurringExpense}
                  disabled={!recurringAmount || !recurringCategory}
                  className="w-full p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl transition font-medium"
                >
                  Agregar Gasto Recurrente
                </button>
              </div>
            )}

            {recurringExpenses.length > 0 ? (
              <div className="space-y-2">
                {recurringExpenses.map(re => {
                  const cat = getCategoryData(re.category);
                  return (
                    <div key={re.id} className="bg-slate-900 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat?.emoji}</span>
                        <div>
                          <div className="font-medium text-sm">{re.description}</div>
                          <div className="text-xs text-slate-400">Día {re.day_of_month} de cada mes</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">${formatMoney(re.amount)}</span>
                        <button
                          onClick={() => deleteRecurringExpense(re.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 border-t border-slate-700 flex justify-between text-sm">
                  <span className="text-slate-400">Total mensual recurrente:</span>
                  <span className="font-bold">${formatMoney(recurringExpenses.reduce((sum, re) => sum + re.amount, 0))}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">
                No hay gastos recurrentes configurados
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'reports') {
    const categoryTotals = categories
      .map(cat => ({
        ...cat,
        total: filteredExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
      }))
      .filter(cat => cat.total > 0);

    const pieData = categoryTotals.map(cat => ({
      name: cat.name,
      value: cat.total,
      color: cat.color
    }));

    const dailyExpenses: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const day = new Date(e.date).getDate();
      dailyExpenses[String(day)] = (dailyExpenses[String(day)] || 0) + e.amount;
    });

    const dailyData = Object.keys(dailyExpenses)
      .map(day => ({ day, total: dailyExpenses[day] }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    // Comparación mensual (últimos 6 meses)
    const monthlyComparison: { mes: string; total: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = -5; i <= 0; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthExp = getMonthExpenses(i);
      const total = monthExp.reduce((sum, e) => sum + e.amount, 0);
      monthlyComparison.push({ mes: monthNames[date.getMonth()], total });
    }

    // Gastos por usuario
    const userTotals = allUsers.map(u => ({
      ...u,
      total: filteredExpenses.filter(e => e.user_id === u.id).reduce((sum, e) => sum + e.amount, 0)
    })).filter(u => u.total > 0);

    const userColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Reportes</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportExpensesToCSV(filteredExpenses)}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-full transition-all text-sm"
                title="Exportar CSV"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                onClick={() => exportExpensesToExcel(filteredExpenses)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-full transition-all text-sm"
                title="Exportar Excel"
              >
                <FileSpreadsheet size={16} />
                Excel
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

          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onChange={handleMonthChange}
          />

          <UserFilter
            users={allUsers}
            selectedUserId={selectedUserId}
            onChange={setSelectedUserId}
          />

          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-xl mb-4">
            <div className="text-sm opacity-90 mb-1">Total del período</div>
            <div className="text-4xl font-bold">${formatMoney(totalFiltered)}</div>
            {budget && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() && (
              <div className="mt-2 text-sm opacity-75">
                Presupuesto: ${formatMoney(budget.amount)} ({((totalFiltered / budget.amount) * 100).toFixed(0)}%)
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-800 p-4 rounded-2xl">
              <div className="text-sm text-slate-400">Necesario</div>
              <div className="text-xl font-bold text-green-400">${formatMoney(totalNecessary)}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl">
              <div className="text-sm text-slate-400">Innecesario</div>
              <div className="text-xl font-bold text-red-400">${formatMoney(totalUnnecessary)}</div>
            </div>
          </div>

          {/* Gráfico por usuario */}
          {userTotals.length > 1 && (
            <div className="bg-slate-800 p-6 rounded-2xl mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users size={20} />
                Gastos por Usuario
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={userTotals} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" width={80} />
                  <Tooltip
                    formatter={(value: unknown) =>
                      `$${formatMoney(typeof value === 'number' ? value : Number(value))}`
                    }
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                    {userTotals.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={userColors[index % userColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

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
              <h2 className="text-lg font-semibold mb-4">Gastos por Día</h2>
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
              <h2 className="text-lg font-semibold mb-4">Tendencia Últimos 6 Meses</h2>
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
        total: filteredExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
      }))
      .filter(cat => cat.total > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Historial</h1>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>

          <NavBar view={view} setView={setView} />

          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onChange={handleMonthChange}
          />

          <UserFilter
            users={allUsers}
            selectedUserId={selectedUserId}
            onChange={setSelectedUserId}
          />

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-xl mb-6">
            <div className="text-sm opacity-90 mb-1">Total del período</div>
            <div className="text-4xl font-bold">${formatMoney(totalFiltered)}</div>
            <div className="text-sm opacity-75 mt-2">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'gasto' : 'gastos'}
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

          <h2 className="text-lg font-semibold mb-3">Detalle de Gastos</h2>
          <div className="space-y-2">
            {filteredExpenses.map(expense => {
              const cat = getCategoryData(expense.category);
              if (!cat) return null;

              return (
                <div key={expense.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        {expense.description || cat.name}
                        {expense.necessary && (
                          <span className="text-xs bg-green-600/30 text-green-200 px-2 py-0.5 rounded-full">
                            Necesario
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 truncate">
                        {formatDate(expense.date)} · {expense.user_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">${formatMoney(expense.amount)}</span>
                    <button
                      onClick={() => setEditingExpense(expense)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Eliminar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredExpenses.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                No hay gastos en este período
              </div>
            )}
          </div>
        </div>

        {editingExpense && (
          <EditExpenseModal
            expense={editingExpense}
            onSave={updateExpense}
            onClose={() => setEditingExpense(null)}
          />
        )}
      </div>
    );
  }

  // Vista de agregar gasto
  const budgetPercentage = budget ? Math.min((totalCurrentMonth / budget.amount) * 100, 100) : 0;

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
              <span className="text-sm font-medium">${totalCurrentMonth.toLocaleString('es-AR')}</span>
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

        {/* Barra de progreso del presupuesto */}
        {budget && (
          <div className="bg-slate-800 p-4 rounded-2xl mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Presupuesto del mes</span>
              <span className={budgetPercentage >= 100 ? 'text-red-400' : budgetPercentage >= 80 ? 'text-yellow-400' : 'text-green-400'}>
                ${formatMoney(totalCurrentMonth)} / ${formatMoney(budget.amount)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  budgetPercentage >= 100 ? 'bg-red-500' :
                  budgetPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
          </div>
        )}

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

        <div className="bg-slate-800 p-4 rounded-2xl shadow-xl mb-6">
          <label className="block text-sm text-slate-400 mb-2">Descripción (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Almuerzo, Uber al trabajo..."
            className="w-full bg-slate-900 p-3 rounded-xl outline-none text-white placeholder-slate-500"
          />
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
