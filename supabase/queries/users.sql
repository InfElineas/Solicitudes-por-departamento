-- ============================================================
-- Queries: Users & Departments
-- ============================================================

-- Todos los usuarios con su departamento
SELECT
  u.email,
  u.display_name,
  u.full_name,
  u.role,
  u.department,
  u.avatar_url,
  u.created_date
FROM app_users u
ORDER BY u.role, u.full_name;

-- Usuarios sin solicitudes asignadas actualmente
SELECT u.email, u.display_name, u.role
FROM app_users u
WHERE u.role IN ('support', 'admin')
  AND u.email NOT IN (
    SELECT assigned_to_id FROM requests
    WHERE status IN ('En progreso', 'En revisión')
      AND assigned_to_id IS NOT NULL
  );

-- Crear/actualizar perfil de usuario al registrarse
-- (usar en trigger o después de invitar)
-- INSERT INTO app_users (email, full_name, role)
-- VALUES ('{email}', '{full_name}', 'employee')
-- ON CONFLICT (email) DO UPDATE
--   SET full_name = EXCLUDED.full_name, updated_date = now();

-- Departamentos con cantidad de solicitudes activas
SELECT
  d.name AS departamento,
  COUNT(r.id) AS solicitudes_activas
FROM departments d
LEFT JOIN requests r
  ON r.department_names::TEXT ILIKE '%' || d.name || '%'
  AND r.status NOT IN ('Finalizada', 'Rechazada')
  AND r.is_deleted = false
WHERE d.is_active = true
GROUP BY d.name
ORDER BY solicitudes_activas DESC;
