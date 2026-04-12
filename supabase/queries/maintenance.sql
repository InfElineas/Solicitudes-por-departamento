-- ============================================================
-- Queries: Mantenimiento
-- Consultas administrativas y de limpieza.
-- ============================================================

-- Ver tamaño de cada tabla
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Limpiar notificaciones antiguas (más de 60 días)
DELETE FROM notifications
WHERE created_date < now() - INTERVAL '60 days';

-- Limpiar audit_logs antiguos (más de 1 año)
DELETE FROM audit_logs
WHERE created_date < now() - INTERVAL '1 year';

-- Limpiar automation_logs antiguos (más de 90 días)
DELETE FROM automation_logs
WHERE created_date < now() - INTERVAL '90 days';

-- Vaciar papelera (request_trash más de 30 días)
DELETE FROM request_trash
WHERE created_date < now() - INTERVAL '30 days';

-- Resumen de integridad de datos
SELECT
  'requests sin asignar'        AS check_name, COUNT(*) AS total FROM requests WHERE assigned_to_id IS NULL AND status = 'En progreso' AND is_deleted = false
UNION ALL
SELECT 'historiales huérfanos', COUNT(*) FROM request_histories rh
  WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.id::TEXT = rh.request_id)
UNION ALL
SELECT 'comments huérfanos', COUNT(*) FROM request_comments rc
  WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.id::TEXT = rc.request_id)
UNION ALL
SELECT 'worklogs huérfanos', COUNT(*) FROM worklogs w
  WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.id::TEXT = w.request_id);
