-- Corrección de políticas RLS para Super-admin
-- Ejecutar después de 001_rls_security_migration.sql

-- Habilitar RLS en tabla companies (por si no se ejecutó)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tabla companies
DROP POLICY IF EXISTS "Super-admin can manage all companies" ON companies;
CREATE POLICY "Super-admin can manage all companies" ON companies
  FOR ALL USING (current_setting('app.user_role')::varchar = 'super-admin');

-- Corregir políticas para tabla users
DROP POLICY IF EXISTS "Super-admin can manage all users except super-admins" ON users;
CREATE POLICY "Super-admin can manage all users" ON users
  FOR ALL USING (current_setting('app.user_role')::varchar = 'super-admin');

-- Crear índice para companies si no existe
CREATE INDEX IF NOT EXISTS idx_companies_admin_id ON companies(admin_id);