-- Migración RLS y Seguridad Multi-tenant para SentinelPro
-- Ejecutar después de init-db.js

-- Habilitar RLS en todas las tablas multi-tenant
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE toner_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tabla users
CREATE POLICY "Users can view their own company users" ON users
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Admins can manage their company users" ON users
  FOR ALL USING (
    company_id = current_setting('app.current_company_id')::varchar
    AND current_setting('app.user_role')::varchar IN ('super-admin', 'admin')
  );

CREATE POLICY "Super-admin can view all users" ON users
  FOR SELECT USING (current_setting('app.user_role')::varchar = 'super-admin');

CREATE POLICY "Super-admin can manage all users except super-admins" ON users
  FOR ALL USING (current_setting('app.user_role')::varchar = 'super-admin');

-- Políticas RLS para tabla companies
CREATE POLICY "Super-admin can manage all companies" ON companies
  FOR ALL USING (current_setting('app.user_role')::varchar = 'super-admin');

-- Políticas RLS para tabla printers
CREATE POLICY "Users can view their company printers" ON printers
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Operators and admins can manage their company printers" ON printers
  FOR ALL USING (
    company_id = current_setting('app.current_company_id')::varchar
    AND current_setting('app.user_role')::varchar IN ('admin', 'operator')
  );

-- Políticas RLS para tabla print_jobs
CREATE POLICY "Users can view print jobs from their company" ON print_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = print_jobs.user_id
      AND u.company_id = current_setting('app.current_company_id')::varchar
    )
  );

CREATE POLICY "Users can create print jobs" ON print_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = print_jobs.user_id
      AND u.company_id = current_setting('app.current_company_id')::varchar
    )
  );

-- Políticas RLS para tabla paper_types
CREATE POLICY "Users can view their company paper types" ON paper_types
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Operators and admins can manage their company paper types" ON paper_types
  FOR ALL USING (
    company_id = current_setting('app.current_company_id')::varchar
    AND current_setting('app.user_role')::varchar IN ('admin', 'operator')
  );

-- Políticas RLS para tabla toner_inventory
CREATE POLICY "Users can view their company toner inventory" ON toner_inventory
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Operators and admins can manage their company toner inventory" ON toner_inventory
  FOR ALL USING (
    company_id = current_setting('app.current_company_id')::varchar
    AND current_setting('app.user_role')::varchar IN ('admin', 'operator')
  );

-- Políticas RLS para tabla maintenance_logs
CREATE POLICY "Users can view their company maintenance logs" ON maintenance_logs
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Operators and admins can manage their company maintenance logs" ON maintenance_logs
  FOR ALL USING (
    company_id = current_setting('app.current_company_id')::varchar
    AND current_setting('app.user_role')::varchar IN ('admin', 'operator')
  );

-- Políticas RLS para tabla consumption_expenses
CREATE POLICY "Users can view their company consumption expenses" ON consumption_expenses
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Users can create consumption expenses for their company" ON consumption_expenses
  FOR ALL USING (company_id = current_setting('app.current_company_id')::varchar);

-- Políticas RLS para tabla alerts
CREATE POLICY "Users can view their company alerts" ON alerts
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "Users can manage their company alerts" ON alerts
  FOR ALL USING (company_id = current_setting('app.current_company_id')::varchar);

-- Políticas RLS para tabla audit_logs
CREATE POLICY "Users can view their company audit logs" ON audit_logs
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Función para establecer contexto de seguridad
CREATE OR REPLACE FUNCTION set_security_context(
  p_company_id varchar,
  p_user_role varchar DEFAULT 'viewer'
) RETURNS void AS $$
BEGIN
  -- Establecer variables de sesión para RLS
  PERFORM set_config('app.current_company_id', p_company_id, false);
  PERFORM set_config('app.user_role', p_user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar contexto de seguridad
CREATE OR REPLACE FUNCTION clear_security_context() RETURNS void AS $$
BEGIN
  -- Limpiar variables de sesión
  PERFORM set_config('app.current_company_id', '', false);
  PERFORM set_config('app.user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices para optimizar consultas RLS
CREATE INDEX IF NOT EXISTS idx_companies_admin_id ON companies(admin_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_printers_company_id ON printers(company_id);
CREATE INDEX IF NOT EXISTS idx_paper_types_company_id ON paper_types(company_id);
CREATE INDEX IF NOT EXISTS idx_toner_inventory_company_id ON toner_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_company_id ON maintenance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_consumption_expenses_company_id ON consumption_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);

-- Función de auditoría automática para cambios críticos
CREATE OR REPLACE FUNCTION audit_critical_changes() RETURNS trigger AS $$
DECLARE
  old_values jsonb;
  new_values jsonb;
  changes jsonb;
  company_id_val varchar;
BEGIN
  -- Solo auditar si hay user_id en la sesión
  IF current_setting('app.current_user_id', true) IS NOT NULL THEN
    -- Obtener valores anteriores y nuevos
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);

    -- Calcular cambios
    changes := jsonb_object_agg(key, jsonb_build_object('old', old_values->key, 'new', new_values->key))
    FROM jsonb_object_keys(COALESCE(old_values, '{}'::jsonb) || COALESCE(new_values, '{}'::jsonb)) AS key
    WHERE old_values->key IS DISTINCT FROM new_values->key;

    -- Obtener company_id según la tabla
    CASE TG_TABLE_NAME
      WHEN 'paper_types' THEN company_id_val := COALESCE(NEW.company_id, OLD.company_id);
      WHEN 'toner_inventory' THEN company_id_val := COALESCE(NEW.company_id, OLD.company_id);
      WHEN 'printers' THEN company_id_val := COALESCE(NEW.company_id, OLD.company_id);
      WHEN 'maintenance_logs' THEN company_id_val := COALESCE(NEW.company_id, OLD.company_id);
      WHEN 'consumption_expenses' THEN company_id_val := COALESCE(NEW.company_id, OLD.company_id);
      ELSE company_id_val := current_setting('app.current_company_id', true);
    END CASE;

    -- Insertar log de auditoría
    INSERT INTO audit_logs (
      company_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    ) VALUES (
      company_id_val,
      current_setting('app.current_user_id'),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' THEN old_values ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN new_values ELSE NULL END,
      current_setting('app.client_ip', true),
      current_setting('app.user_agent', true)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers de auditoría automática para tablas críticas
DROP TRIGGER IF EXISTS audit_paper_types ON paper_types;
CREATE TRIGGER audit_paper_types
  AFTER INSERT OR UPDATE OR DELETE ON paper_types
  FOR EACH ROW EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_toner_inventory ON toner_inventory;
CREATE TRIGGER audit_toner_inventory
  AFTER INSERT OR UPDATE OR DELETE ON toner_inventory
  FOR EACH ROW EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_printers ON printers;
CREATE TRIGGER audit_printers
  AFTER INSERT OR UPDATE OR DELETE ON printers
  FOR EACH ROW EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_maintenance_logs ON maintenance_logs;
CREATE TRIGGER audit_maintenance_logs
  AFTER INSERT OR UPDATE OR DELETE ON maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_consumption_expenses ON consumption_expenses;
CREATE TRIGGER audit_consumption_expenses
  AFTER INSERT OR UPDATE OR DELETE ON consumption_expenses
  FOR EACH ROW EXECUTE FUNCTION audit_critical_changes();