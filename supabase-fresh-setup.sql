-- =============================================
-- SETUP LIMPIO DE SUPABASE PARA GASTOS APP
-- =============================================
-- Para un PROYECTO NUEVO (empezar de cero).
-- Dashboard > SQL Editor > New Query > pegar todo > Run
--
-- Diferencia clave vs. el setup viejo: expenses.user_id y
-- recurring_expenses.user_id apuntan a profiles(id), para que el
-- join automático .select('*, profiles(name)') del frontend funcione.

-- 1. Perfiles (nombre visible de cada usuario)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  necessary BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Presupuestos mensuales (uno por mes/año, compartido)
CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- 4. Gastos recurrentes
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  necessary BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- 6. Políticas: profiles
CREATE POLICY "Ver perfiles"      ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear mi perfil"   ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Editar mi perfil"  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 7. Políticas: expenses (gastos compartidos entre usuarios)
CREATE POLICY "Ver gastos"      ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agregar gastos"  ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Editar gastos"   ON expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Borrar gastos"   ON expenses FOR DELETE TO authenticated USING (true);

-- 8. Políticas: budgets (presupuesto compartido)
CREATE POLICY "Ver presupuestos"     ON budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear presupuestos"   ON budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Editar presupuestos"  ON budgets FOR UPDATE TO authenticated USING (true);

-- 9. Políticas: recurring_expenses
CREATE POLICY "Ver recurrentes"     ON recurring_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear recurrentes"   ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Editar recurrentes"  ON recurring_expenses FOR UPDATE TO authenticated USING (true);

-- 10. Realtime (la app escucha cambios en expenses en vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_expenses;
