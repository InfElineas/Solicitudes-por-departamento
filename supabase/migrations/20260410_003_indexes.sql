-- ============================================================
-- Migration: 003 — Indexes
-- Date: 2026-04-10
-- Description: Índices para mejorar performance en las
--              consultas más frecuentes del sistema.
-- ============================================================

-- requests
CREATE INDEX IF NOT EXISTS idx_requests_status        ON requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_requester_id  ON requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to   ON requests (assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_requests_is_deleted     ON requests (is_deleted);
CREATE INDEX IF NOT EXISTS idx_requests_created_date  ON requests (created_date DESC);
CREATE INDEX IF NOT EXISTS idx_requests_priority       ON requests (priority);

-- request_histories
CREATE INDEX IF NOT EXISTS idx_req_histories_request_id ON request_histories (request_id);
CREATE INDEX IF NOT EXISTS idx_req_histories_created    ON request_histories (created_date DESC);

-- request_comments
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON request_comments (request_id);
CREATE INDEX IF NOT EXISTS idx_comments_created    ON request_comments (created_date);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications (created_date DESC);

-- worklogs
CREATE INDEX IF NOT EXISTS idx_worklogs_request_id ON worklogs (request_id);

-- chat_logs
CREATE INDEX IF NOT EXISTS idx_chat_entity ON chat_logs (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_logs (created_date);

-- incidents
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_email ON incidents (reporter_email);
CREATE INDEX IF NOT EXISTS idx_incidents_status         ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_created        ON incidents (created_date DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_date DESC);

-- automation_logs
CREATE INDEX IF NOT EXISTS idx_auto_logs_rule_id    ON automation_logs (rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_logs_request_id ON automation_logs (request_id);

-- guardias
CREATE INDEX IF NOT EXISTS idx_guardias_fecha  ON guardias (fecha);
CREATE INDEX IF NOT EXISTS idx_guardias_estado ON guardias (estado);

-- app_users
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);
CREATE INDEX IF NOT EXISTS idx_app_users_role  ON app_users (role);
