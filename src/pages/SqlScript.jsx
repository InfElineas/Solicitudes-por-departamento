import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Check, Database } from 'lucide-react';
import { toast } from 'sonner';

const SQL_SCRIPT = `-- ============================================
-- SUPABASE MIGRATION SCRIPT
-- Solicitudes por Departamento
-- ============================================

-- 1) PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','support','employee')),
  position text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3) USER_DEPARTMENTS
CREATE TABLE IF NOT EXISTS user_departments (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, department_id)
);

-- 4) REQUESTS
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Alta','Media','Baja')),
  type text NOT NULL CHECK (type IN ('Soporte','Mejora','Desarrollo','Capacitación')),
  channel text NOT NULL CHECK (channel IN ('Sistema','Google Sheets','Correo Electrónico','WhatsApp')),
  level int CHECK (level BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente','En progreso','En revisión','Finalizada','Rechazada')),
  requester_id uuid REFERENCES profiles(id) NOT NULL,
  assigned_to_id uuid REFERENCES profiles(id),
  estimated_hours numeric,
  estimated_due timestamptz,
  requested_at timestamptz DEFAULT now(),
  completion_date timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) REQUEST_DEPARTMENTS
CREATE TABLE IF NOT EXISTS request_departments (
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE RESTRICT,
  PRIMARY KEY (request_id, department_id)
);

-- 6) REQUEST_STATE_HISTORY
CREATE TABLE IF NOT EXISTS request_state_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  by_user_id uuid REFERENCES profiles(id),
  at timestamptz DEFAULT now()
);

-- 7) WORKLOGS
CREATE TABLE IF NOT EXISTS worklogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  minutes int NOT NULL CHECK (minutes >= 0),
  note text,
  created_at timestamptz DEFAULT now()
);

-- 8) REQUEST_FEEDBACK
CREATE TABLE IF NOT EXISTS request_feedback (
  request_id uuid PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  comment text,
  by_user_id uuid REFERENCES profiles(id),
  at timestamptz DEFAULT now()
);

-- 9) REQUESTS_TRASH
CREATE TABLE IF NOT EXISTS requests_trash (
  request_id uuid PRIMARY KEY,
  snapshot jsonb NOT NULL,
  deleted_at timestamptz DEFAULT now(),
  deleted_by_user_id uuid REFERENCES profiles(id),
  expire_at timestamptz NOT NULL
);

-- 10) APP_CONFIG
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned ON requests(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_request_depts_dept ON request_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_trash_expire ON requests_trash(expire_at);

-- ============================================
-- HELPER FUNCTION: get user role
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_role(check_role text)
RETURNS boolean AS $$
  SELECT get_user_role(auth.uid()) = check_role;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RPC: transition_request_status
-- ============================================
CREATE OR REPLACE FUNCTION transition_request_status(
  p_request_id uuid,
  p_new_status text,
  p_note text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_current_status text;
  v_valid boolean := false;
BEGIN
  SELECT status INTO v_current_status FROM requests WHERE id = p_request_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Validate transitions
  IF v_current_status = 'Pendiente' AND p_new_status IN ('En progreso', 'Rechazada') THEN v_valid := true;
  ELSIF v_current_status = 'En progreso' AND p_new_status = 'En revisión' THEN v_valid := true;
  ELSIF v_current_status = 'En revisión' AND p_new_status IN ('Finalizada', 'En progreso') THEN v_valid := true;
  END IF;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_current_status, p_new_status;
  END IF;

  -- Update request
  UPDATE requests SET
    status = p_new_status,
    updated_at = now(),
    completion_date = CASE WHEN p_new_status = 'Finalizada' THEN now() ELSE completion_date END,
    rejection_reason = CASE WHEN p_new_status = 'Rechazada' THEN p_note ELSE rejection_reason END
  WHERE id = p_request_id;

  -- Insert history
  INSERT INTO request_state_history (request_id, from_status, to_status, note, by_user_id)
  VALUES (p_request_id, v_current_status, p_new_status, p_note, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests_trash ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_role('admin'));
CREATE POLICY "Support can view all profiles" ON profiles FOR SELECT USING (is_role('support'));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins manage all profiles" ON profiles FOR ALL USING (is_role('admin'));

-- DEPARTMENTS
CREATE POLICY "All users can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Admins manage departments" ON departments FOR ALL USING (is_role('admin'));

-- USER_DEPARTMENTS
CREATE POLICY "All can view user_departments" ON user_departments FOR SELECT USING (true);
CREATE POLICY "Admins manage user_departments" ON user_departments FOR ALL USING (is_role('admin'));

-- REQUESTS
CREATE POLICY "Employee sees own requests" ON requests FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "Support sees all requests" ON requests FOR SELECT USING (is_role('support') OR is_role('admin'));
CREATE POLICY "Users can create requests" ON requests FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Support/Admin can update requests" ON requests FOR UPDATE USING (is_role('support') OR is_role('admin'));
CREATE POLICY "Admin can delete requests" ON requests FOR DELETE USING (is_role('admin'));

-- REQUEST_DEPARTMENTS
CREATE POLICY "All can view request_departments" ON request_departments FOR SELECT USING (true);
CREATE POLICY "Support/Admin manage request_departments" ON request_departments FOR ALL USING (is_role('support') OR is_role('admin'));

-- REQUEST_STATE_HISTORY
CREATE POLICY "All can view history of accessible requests" ON request_state_history FOR SELECT USING (true);
CREATE POLICY "Support/Admin can insert history" ON request_state_history FOR INSERT WITH CHECK (is_role('support') OR is_role('admin'));

-- WORKLOGS
CREATE POLICY "All can view worklogs" ON worklogs FOR SELECT USING (true);
CREATE POLICY "Support/Admin can create worklogs" ON worklogs FOR INSERT WITH CHECK (is_role('support') OR is_role('admin'));

-- REQUEST_FEEDBACK
CREATE POLICY "All can view feedback" ON request_feedback FOR SELECT USING (true);
CREATE POLICY "Requester can give feedback" ON request_feedback FOR INSERT WITH CHECK (by_user_id = auth.uid());

-- REQUESTS_TRASH
CREATE POLICY "Admin can manage trash" ON requests_trash FOR ALL USING (is_role('admin'));

-- APP_CONFIG
CREATE POLICY "All can view config" ON app_config FOR SELECT USING (true);
CREATE POLICY "Admin can manage config" ON app_config FOR ALL USING (is_role('admin'));

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO departments (name) VALUES
  ('Tecnología'),
  ('Recursos Humanos'),
  ('Marketing'),
  ('Ventas'),
  ('Operaciones')
ON CONFLICT DO NOTHING;

INSERT INTO app_config (key, value, description) VALUES
  ('TRASH_TTL_DAYS', '30', 'Días de retención en papelera')
ON CONFLICT DO NOTHING;

-- ============================================
-- NOTE: Create auth users via Supabase Dashboard
-- then insert profiles manually:
--
-- INSERT INTO profiles (id, username, full_name, role)
-- VALUES
--   ('<admin-uuid>', 'admin', 'Admin User', 'admin'),
--   ('<support-uuid>', 'soporte1', 'Soporte User', 'support'),
--   ('<employee-uuid>', 'empleado1', 'Employee User', 'employee');
-- ============================================
`;

export default function SqlScript() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    toast.success('Script copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--secondary))]">
              <Database className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))]">Script SQL para Supabase</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Ejecuta este script en el SQL Editor de tu proyecto Supabase
              </p>
            </div>
          </div>
          <Button onClick={handleCopy} className="bg-[hsl(var(--primary))] text-white">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>

        <div className="bg-[hsl(var(--background))] rounded-lg p-4 max-h-[60vh] overflow-auto">
          <pre className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap font-mono leading-relaxed">
            {SQL_SCRIPT}
          </pre>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold text-[hsl(var(--foreground))]">Variables de Entorno</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Configura estas variables en tu proyecto:</p>
        <div className="bg-[hsl(var(--background))] rounded-lg p-4 font-mono text-xs text-[hsl(var(--muted-foreground))] space-y-1">
          <p><span className="text-[hsl(var(--primary))]">SUPABASE_URL</span>=https://tuproyecto.supabase.co</p>
          <p><span className="text-[hsl(var(--primary))]">SUPABASE_ANON_KEY</span>=eyJ...tu_anon_key</p>
          <p><span className="text-red-400">SUPABASE_SERVICE_ROLE_KEY</span>=eyJ...solo_server_side</p>
        </div>
      </div>
    </div>
  );
}