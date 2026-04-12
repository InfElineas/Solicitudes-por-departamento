-- ============================================================
-- Queries: Requests
-- Consultas útiles para gestión de solicitudes.
-- ============================================================

-- Todas las solicitudes activas con conteo de comentarios
SELECT
  r.*,
  COUNT(DISTINCT rc.id) AS comment_count,
  COUNT(DISTINCT w.id)  AS worklog_count,
  COALESCE(SUM(w.minutes), 0) AS total_minutes
FROM requests r
LEFT JOIN request_comments rc ON rc.request_id = r.id::TEXT
LEFT JOIN worklogs w           ON w.request_id  = r.id::TEXT
WHERE r.is_deleted = false
GROUP BY r.id
ORDER BY r.created_date DESC;

-- Solicitudes por estado
SELECT status, COUNT(*) AS total
FROM requests
WHERE is_deleted = false
GROUP BY status
ORDER BY total DESC;

-- Solicitudes por técnico asignado
SELECT
  assigned_to_name,
  COUNT(*) FILTER (WHERE status = 'En progreso') AS en_progreso,
  COUNT(*) FILTER (WHERE status = 'En revisión') AS en_revision,
  COUNT(*) FILTER (WHERE status = 'Finalizada')  AS finalizadas,
  COUNT(*) AS total
FROM requests
WHERE is_deleted = false AND assigned_to_id IS NOT NULL
GROUP BY assigned_to_name
ORDER BY total DESC;

-- Solicitudes vencidas (fecha estimada pasada, no finalizadas)
SELECT id, title, status, priority, estimated_due, assigned_to_name
FROM requests
WHERE is_deleted = false
  AND status NOT IN ('Finalizada', 'Rechazada')
  AND estimated_due < now()
ORDER BY estimated_due ASC;

-- Tiempo promedio de resolución por tipo
SELECT
  request_type,
  ROUND(AVG(EXTRACT(EPOCH FROM (completion_date - created_date)) / 3600)::NUMERIC, 1) AS avg_hours
FROM requests
WHERE status = 'Finalizada' AND completion_date IS NOT NULL
GROUP BY request_type
ORDER BY avg_hours DESC;

-- Historial completo de una solicitud (reemplazar {request_id})
SELECT
  rh.created_date,
  rh.from_status,
  rh.to_status,
  rh.note,
  rh.by_user_name
FROM request_histories rh
WHERE rh.request_id = '{request_id}'
ORDER BY rh.created_date ASC;
