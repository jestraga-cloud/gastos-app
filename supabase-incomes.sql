-- =============================================
-- FUNCIONALIDAD: INGRESOS / FONDOS (compartidos)
-- =============================================
-- Ejecutar en Supabase > SQL Editor > New Query > Run
-- Crea la tabla de ingresos para calcular el saldo (fondos - gastos).

CREATE TABLE IF NOT EXISTS incomes (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- Compartido: todos ven todos los ingresos
CREATE POLICY "Ver ingresos"     ON incomes FOR SELECT TO authenticated USING (true);
-- Solo podés cargar ingresos a tu propio nombre
CREATE POLICY "Agregar ingresos" ON incomes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Cualquiera puede editar/borrar (igual que los gastos compartidos)
CREATE POLICY "Editar ingresos"  ON incomes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Borrar ingresos"  ON incomes FOR DELETE TO authenticated USING (true);

-- Realtime (la app escucha cambios en vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE incomes;
