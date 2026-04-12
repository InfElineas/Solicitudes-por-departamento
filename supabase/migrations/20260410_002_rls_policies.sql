-- ============================================================
-- Migration: 002 — RLS Policies (Producción)
-- Date: 2026-04-10
-- Description: Políticas de seguridad por fila (Row Level Security).
--              Ejecutar SOLO cuando se vaya a producción,
--              después de haber desactivado el modo desarrollo.
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_trash     ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_feedback  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklogs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents         ENABLE ROW LEVEL SECURITY;

-- ── Función helper: obtener email del usuario autenticado ─────
CREATE OR REPLACE FUNCTION auth_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── Función helper: obtener rol del usuario autenticado ───────
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM app_users WHERE email = auth_email();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── app_users ─────────────────────────────────────────────────
-- Cada usuario ve su propio perfil; admin/superadmin ven todos
CREATE POLICY "app_users: ver propio perfil"
  ON app_users FOR SELECT
  USING (email = auth_email() OR auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "app_users: editar propio perfil"
  ON app_users FOR UPDATE
  USING (email = auth_email() OR auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "app_users: admin puede insertar"
  ON app_users FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "app_users: admin puede eliminar"
  ON app_users FOR DELETE
  USING (auth_role() IN ('admin', 'superadmin'));

-- ── requests ──────────────────────────────────────────────────
-- Empleados ven sus propias solicitudes; soporte/admin ven todas
CREATE POLICY "requests: ver"
  ON requests FOR SELECT
  USING (
    requester_id = auth_email()
    OR assigned_to_id = auth_email()
    OR auth_role() IN ('admin', 'superadmin', 'support', 'jefe')
  );

CREATE POLICY "requests: crear"
  ON requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "requests: editar"
  ON requests FOR UPDATE
  USING (
    requester_id = auth_email()
    OR auth_role() IN ('admin', 'superadmin', 'support')
  );

-- ── notifications ─────────────────────────────────────────────
-- Cada usuario solo ve sus propias notificaciones
CREATE POLICY "notifications: ver propias"
  ON notifications FOR SELECT
  USING (user_id = auth_email());

CREATE POLICY "notifications: editar propias"
  ON notifications FOR UPDATE
  USING (user_id = auth_email());

CREATE POLICY "notifications: crear (sistema)"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications: eliminar propias"
  ON notifications FOR DELETE
  USING (user_id = auth_email());

-- ── request_comments ──────────────────────────────────────────
CREATE POLICY "comments: ver"
  ON request_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "comments: crear"
  ON request_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── worklogs ──────────────────────────────────────────────────
CREATE POLICY "worklogs: ver"
  ON worklogs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "worklogs: crear"
  ON worklogs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── departments ───────────────────────────────────────────────
CREATE POLICY "departments: ver todos"
  ON departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "departments: admin gestiona"
  ON departments FOR ALL
  USING (auth_role() IN ('admin', 'superadmin'));

-- ── request_histories ─────────────────────────────────────────
CREATE POLICY "histories: ver"
  ON request_histories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "histories: crear (sistema)"
  ON request_histories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── audit_logs ────────────────────────────────────────────────
CREATE POLICY "audit: solo admin puede ver"
  ON audit_logs FOR SELECT
  USING (auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "audit: sistema puede insertar"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── automation_rules ──────────────────────────────────────────
CREATE POLICY "automation_rules: admin gestiona"
  ON automation_rules FOR ALL
  USING (auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "automation_rules: todos pueden ver activas"
  ON automation_rules FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- ── Resto: acceso autenticado ─────────────────────────────────
CREATE POLICY "chat_logs: acceso autenticado"
  ON chat_logs FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "knowledge_base: acceso autenticado"
  ON knowledge_base FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "guardias: acceso autenticado"
  ON guardias FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "activos: acceso autenticado"
  ON activos FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "incidents: acceso autenticado"
  ON incidents FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "request_feedback: acceso autenticado"
  ON request_feedback FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "request_trash: admin gestiona"
  ON request_trash FOR ALL
  USING (auth_role() IN ('admin', 'superadmin', 'support'));

CREATE POLICY "automation_logs: admin ve"
  ON automation_logs FOR SELECT
  USING (auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "automation_logs: sistema inserta"
  ON automation_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
