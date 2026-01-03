-- =============================================
-- SETUP DE SUPABASE PARA GASTOS APP
-- =============================================
-- Ejecuta este SQL en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- 1. Crear tabla de perfiles (para guardar nombres de usuario)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  necessary BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla de presupuestos mensuales
CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- 4. Crear tabla de gastos recurrentes
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

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- 6. Políticas para profiles
-- Todos los usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "Usuarios pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Usuarios solo pueden insertar su propio perfil
CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 7. Políticas para expenses (GASTOS COMPARTIDOS)
-- Todos los usuarios autenticados pueden ver TODOS los gastos
CREATE POLICY "Usuarios pueden ver todos los gastos"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

-- Todos los usuarios autenticados pueden agregar gastos
CREATE POLICY "Usuarios pueden agregar gastos"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Todos los usuarios autenticados pueden actualizar cualquier gasto
CREATE POLICY "Usuarios pueden actualizar gastos"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true);

-- Todos los usuarios autenticados pueden eliminar cualquier gasto
CREATE POLICY "Usuarios pueden eliminar gastos"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);

-- 8. Políticas para budgets (PRESUPUESTO COMPARTIDO)
CREATE POLICY "Usuarios pueden ver presupuestos"
  ON budgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear presupuestos"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar presupuestos"
  ON budgets FOR UPDATE
  TO authenticated
  USING (true);

-- 9. Políticas para recurring_expenses
CREATE POLICY "Usuarios pueden ver gastos recurrentes"
  ON recurring_expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear gastos recurrentes"
  ON recurring_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar gastos recurrentes"
  ON recurring_expenses FOR UPDATE
  TO authenticated
  USING (true);

-- 10. Habilitar Realtime para las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_expenses;

-- =============================================
-- SI YA TIENES LA BASE DE DATOS CREADA
-- Ejecuta solo estas queries para agregar lo nuevo:
-- =============================================

-- Agregar columna description a expenses si no existe
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;

-- Crear tabla budgets
-- CREATE TABLE IF NOT EXISTS budgets (
--   id BIGSERIAL PRIMARY KEY,
--   amount DECIMAL(10,2) NOT NULL,
--   month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
--   year INTEGER NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(month, year)
-- );

-- Crear tabla recurring_expenses
-- CREATE TABLE IF NOT EXISTS recurring_expenses (
--   id BIGSERIAL PRIMARY KEY,
--   amount DECIMAL(10,2) NOT NULL,
--   category TEXT NOT NULL,
--   description TEXT NOT NULL,
--   day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
--   necessary BOOLEAN DEFAULT FALSE,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
--   active BOOLEAN DEFAULT TRUE,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Habilitar RLS
-- ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para budgets
-- CREATE POLICY "Usuarios pueden ver presupuestos" ON budgets FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Usuarios pueden crear presupuestos" ON budgets FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Usuarios pueden actualizar presupuestos" ON budgets FOR UPDATE TO authenticated USING (true);

-- Políticas para recurring_expenses
-- CREATE POLICY "Usuarios pueden ver gastos recurrentes" ON recurring_expenses FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Usuarios pueden crear gastos recurrentes" ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Usuarios pueden actualizar gastos recurrentes" ON recurring_expenses FOR UPDATE TO authenticated USING (true);

-- Política de UPDATE para expenses (si no existe)
-- CREATE POLICY "Usuarios pueden actualizar gastos" ON expenses FOR UPDATE TO authenticated USING (true);
