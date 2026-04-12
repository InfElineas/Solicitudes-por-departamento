-- ============================================================
-- Seed: 001 — Demo Data
-- Date: 2026-04-10
-- Description: Datos de ejemplo para desarrollo y pruebas.
--              NO ejecutar en producción.
-- ============================================================

-- Departamentos
INSERT INTO departments (id, name, description, is_active) VALUES
  (gen_random_uuid(), 'Tecnología',    'Desarrollo y soporte de sistemas',     true),
  (gen_random_uuid(), 'Operaciones',   'Gestión de operaciones y procesos',    true),
  (gen_random_uuid(), 'Administración','Recursos humanos y administración',    true),
  (gen_random_uuid(), 'Finanzas',      'Contabilidad y finanzas',              true)
ON CONFLICT DO NOTHING;

-- Usuario admin inicial
-- Nota: crear primero el usuario en Authentication → Users de Supabase,
-- luego ejecutar este INSERT con el mismo email.
INSERT INTO app_users (email, full_name, display_name, role) VALUES
  ('admin@tuempresa.com', 'Administrador', 'Admin', 'superadmin')
ON CONFLICT (email) DO UPDATE
  SET role = 'superadmin', updated_date = now();

-- Solicitud de ejemplo
INSERT INTO requests (
  title, description, status, priority, request_type,
  level, requester_id, requester_name, is_deleted
) VALUES (
  'Solicitud de prueba',
  'Esta es una solicitud de ejemplo para verificar que el sistema funciona correctamente.',
  'Pendiente', 'Media', 'Desarrollo',
  'Fácil', 'admin@tuempresa.com', 'Administrador', false
) ON CONFLICT DO NOTHING;
