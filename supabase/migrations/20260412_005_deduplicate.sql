-- ============================================================
-- Migration: 005 — Eliminar duplicados
-- Date: 2026-04-12
-- Descripción: Limpia registros duplicados en todas las tablas.
--              Conserva siempre el registro más antiguo (MIN ctid).
-- ============================================================

-- ── Departments (duplicados por name) ────────────────────────────────────────
DELETE FROM departments
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM departments
  GROUP BY name
);

-- ── Automation Rules (duplicados por name) ────────────────────────────────────
DELETE FROM automation_rules
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM automation_rules
  GROUP BY name
);

-- ── Guardias (duplicados por tecnico_id + inicio + fin) ───────────────────────
DELETE FROM guardias
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM guardias
  GROUP BY tecnico_id, inicio, fin
);

-- ── Requests (duplicados por title + requester_id + is_deleted) ───────────────
DELETE FROM requests
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM requests
  GROUP BY title, requester_id, is_deleted
);

-- ── Request Histories (duplicados por request_id + from_status + to_status + created_date) ──
DELETE FROM request_histories
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM request_histories
  GROUP BY request_id, from_status, to_status, by_user_id, created_date
);

-- ── Request Comments (duplicados por request_id + author_id + content) ────────
DELETE FROM request_comments
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM request_comments
  GROUP BY request_id, author_id, content
);

-- ── Chat Logs (duplicados por entity_id + sender_id + message) ───────────────
DELETE FROM chat_logs
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM chat_logs
  GROUP BY entity_id, sender_id, message
);

-- ── Notifications (duplicados por user_id + title + message) ─────────────────
DELETE FROM notifications
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM notifications
  GROUP BY user_id, title, message
);

-- ── App Users (duplicados por email — por si acaso, aunque tiene UNIQUE) ──────
DELETE FROM app_users
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM app_users
  GROUP BY email
);

-- ── Incidents (duplicados por description + reporter_email) ───────────────────
DELETE FROM incidents
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM incidents
  GROUP BY description, reporter_email
);

-- ── Verificación post-limpieza ────────────────────────────────────────────────
SELECT 'departments'      AS tabla, COUNT(*) AS registros FROM departments
UNION ALL
SELECT 'automation_rules',          COUNT(*) FROM automation_rules
UNION ALL
SELECT 'guardias',                  COUNT(*) FROM guardias
UNION ALL
SELECT 'requests',                  COUNT(*) FROM requests
UNION ALL
SELECT 'request_histories',         COUNT(*) FROM request_histories
UNION ALL
SELECT 'request_comments',          COUNT(*) FROM request_comments
UNION ALL
SELECT 'chat_logs',                 COUNT(*) FROM chat_logs
UNION ALL
SELECT 'notifications',             COUNT(*) FROM notifications
UNION ALL
SELECT 'app_users',                 COUNT(*) FROM app_users
UNION ALL
SELECT 'incidents',                 COUNT(*) FROM incidents
ORDER BY tabla;
