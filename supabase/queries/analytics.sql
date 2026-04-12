-- ============================================================
-- Queries: Analytics / Dashboard
-- Consultas para el módulo de análisis y reportes.
-- ============================================================

-- Resumen general del sistema
SELECT
  COUNT(*) FILTER (WHERE status = 'Pendiente')   AS pendientes,
  COUNT(*) FILTER (WHERE status = 'En progreso') AS en_progreso,
  COUNT(*) FILTER (WHERE status = 'En revisión') AS en_revision,
  COUNT(*) FILTER (WHERE status = 'Finalizada')  AS finalizadas,
  COUNT(*) FILTER (WHERE status = 'Rechazada')   AS rechazadas,
  COUNT(*) AS total
FROM requests
WHERE is_deleted = false;

-- Solicitudes por mes (últimos 12 meses)
SELECT
  TO_CHAR(DATE_TRUNC('month', created_date), 'YYYY-MM') AS mes,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'Finalizada') AS finalizadas
FROM requests
WHERE created_date >= now() - INTERVAL '12 months'
GROUP BY mes
ORDER BY mes ASC;

-- Solicitudes por prioridad y estado
SELECT priority, status, COUNT(*) AS total
FROM requests
WHERE is_deleted = false
GROUP BY priority, status
ORDER BY priority, status;

-- Top 5 solicitantes
SELECT
  requester_name,
  COUNT(*) AS total_solicitudes,
  COUNT(*) FILTER (WHERE status = 'Finalizada') AS finalizadas
FROM requests
WHERE is_deleted = false
GROUP BY requester_name
ORDER BY total_solicitudes DESC
LIMIT 5;

-- Carga de trabajo actual por técnico
SELECT
  assigned_to_name AS tecnico,
  COUNT(*) FILTER (WHERE status IN ('Pendiente', 'En progreso', 'En revisión')) AS activas,
  COUNT(*) FILTER (WHERE status = 'Finalizada') AS completadas_total,
  ROUND(AVG(actual_hours) FILTER (WHERE actual_hours IS NOT NULL)::NUMERIC, 1) AS avg_horas_reales
FROM requests
WHERE assigned_to_id IS NOT NULL AND is_deleted = false
GROUP BY assigned_to_name
ORDER BY activas DESC;

-- Eficiencia: horas estimadas vs reales
SELECT
  request_type,
  ROUND(AVG(estimated_hours)::NUMERIC, 1) AS avg_estimadas,
  ROUND(AVG(actual_hours)::NUMERIC, 1)    AS avg_reales,
  ROUND((AVG(actual_hours) / NULLIF(AVG(estimated_hours), 0) * 100)::NUMERIC, 0) AS pct_desviacion
FROM requests
WHERE status = 'Finalizada'
  AND estimated_hours IS NOT NULL
  AND actual_hours IS NOT NULL
GROUP BY request_type
ORDER BY pct_desviacion DESC;
