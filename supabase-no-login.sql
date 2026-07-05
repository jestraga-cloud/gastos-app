-- =============================================
-- MODO SIN LOGIN (app abierta, un solo espacio compartido)
-- =============================================
-- Ejecutar en Supabase > SQL Editor > New Query > Run
-- La app ahora usa la clave anon SIN sesión, así que:
--   1) user_id deja de ser obligatorio (ya no hay usuarios)
--   2) se desactiva RLS para permitir leer/escribir sin login
--
-- NOTA: sin login, cualquiera con la URL puede ver/editar los datos.
-- Es el trade-off de sacar la autenticación (ok para una app personal).

-- 1. Tabla de ingresos (por si todavía no se creó), sin requerir usuario
CREATE TABLE IF NOT EXISTS incomes (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_id opcional en todas las tablas que lo tenían obligatorio
ALTER TABLE expenses           ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE incomes            ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN user_id DROP NOT NULL;

-- 3. Desactivar RLS (acceso con clave anon, sin sesión)
ALTER TABLE expenses           DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets            DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           DISABLE ROW LEVEL SECURITY;

-- 4. Realtime para incomes (si no estaba agregada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'incomes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE incomes;
  END IF;
END $$;
