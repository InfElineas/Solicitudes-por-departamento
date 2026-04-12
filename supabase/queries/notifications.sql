-- ============================================================
-- Queries: Notifications
-- ============================================================

-- Notificaciones no leídas por usuario
SELECT *
FROM notifications
WHERE user_id = '{email}'
  AND is_read = false
ORDER BY created_date DESC;

-- Marcar todas como leídas para un usuario
UPDATE notifications
SET is_read = true
WHERE user_id = '{email}' AND is_read = false;

-- Eliminar notificaciones de más de 30 días
DELETE FROM notifications
WHERE created_date < now() - INTERVAL '30 days';

-- Conteo de no leídas por usuario (para badge)
SELECT user_id, COUNT(*) AS unread_count
FROM notifications
WHERE is_read = false
GROUP BY user_id
ORDER BY unread_count DESC;
