-- =============================================
-- MIGRACIÓN PARA NUEVAS FUNCIONALIDADES
-- =============================================
-- Ejecuta este SQL en Supabase > SQL Editor
-- Solo si ya tienes la base de datos creada

-- 1. Agregar columna description a expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Crear tabla de presupuestos mensuales
CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- 3. Crear tabla de gastos recurrentes
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  necessary BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agregar FK de recurring_expenses a profiles
ALTER TABLE recurring_expenses
ADD CONSTRAINT recurring_expenses_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES profiles(id);

-- 5. Habilitar RLS en nuevas tablas
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- 6. Políticas para budgets
CREATE POLICY "Usuarios pueden ver presupuestos"
  ON budgets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden crear presupuestos"
  ON budgets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar presupuestos"
  ON budgets FOR UPDATE TO authenticated USING (true);

-- 7. Políticas para recurring_expenses
CREATE POLICY "Usuarios pueden ver gastos recurrentes"
  ON recurring_expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden crear gastos recurrentes"
  ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar gastos recurrentes"
  ON recurring_expenses FOR UPDATE TO authenticated USING (true);

-- 8. Política de UPDATE para expenses (para poder editar gastos)
CREATE POLICY "Usuarios pueden actualizar gastos"
  ON expenses FOR UPDATE TO authenticated USING (true);
