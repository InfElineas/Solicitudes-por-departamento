-- ============================================================
-- Seed: 002 — Importación directa desde exports Base44
-- Date: 2026-04-12
-- Tablas: departments, automation_rules, guardias, chat_logs
-- NOTA: Ejecutar DESPUÉS de migration 001 y 004.
-- ============================================================


-- ── Departments ───────────────────────────────────────────────────────────────
INSERT INTO departments (name, is_active, created_date, updated_date) VALUES
  ('Soporte',          true, '2026-04-08T14:12:19.856Z', '2026-04-08T14:12:19.856Z'),
  ('Recursos Humanos', true, '2026-04-07T07:30:57.680Z', '2026-04-07T07:30:57.680Z'),
  ('Auditoria',        true, '2026-04-07T07:30:38.697Z', '2026-04-07T07:30:38.697Z'),
  ('Comerciales',      true, '2026-04-07T07:30:28.589Z', '2026-04-07T07:30:28.589Z'),
  ('Facturacion',      true, '2026-04-07T07:30:16.599Z', '2026-04-07T07:30:16.599Z'),
  ('Inventario',       true, '2026-04-07T07:30:09.472Z', '2026-04-07T07:30:09.472Z'),
  ('Administracion',   true, '2026-04-07T07:30:02.705Z', '2026-04-07T07:30:02.705Z')
ON CONFLICT DO NOTHING;


-- ── Automation Rules ──────────────────────────────────────────────────────────
INSERT INTO automation_rules (
  name, description, action, trigger_type, conditions,
  is_active, run_count, last_run_at, created_date, updated_date
) VALUES (
  'Recordatorio de 48h sin cambio',
  'Cuando una solicitud pasa mas de 48 horas en pendiente me manda un aviso',
  'send_email',
  'stale_48h',
  '{"status":"Pendiente","priority":"Alta"}',
  true, 0,
  '2026-04-08T18:17:54.289Z',
  '2026-04-08T05:22:24.484Z',
  '2026-04-08T18:17:54.383Z'
)
ON CONFLICT DO NOTHING;


-- ── Guardias ──────────────────────────────────────────────────────────────────
-- 29 registros completos del export (incluye 2 canceladas)
INSERT INTO guardias (
  tecnico_id, tecnico_nombre, inicio, fin, tipo, estado,
  observaciones, creada_por, creada_por_nombre,
  reemplazado_por_id, reemplazado_por_nombre,
  created_date, updated_date
) VALUES

-- Cancelada: Jasan Badell (informaticoelineas3 como técnico)
('informaticoelineas3@gmail.com', 'Jasan Badell',
 '2026-04-10T05:51:00Z', '2026-04-10T08:51:00Z',
 'normal', 'cancelada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:51:37.536Z', '2026-04-10T05:52:16.037Z'),

-- Jose Manuel — abril 2026
('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-01T12:00:00Z', '2026-04-01T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-03T12:00:00Z', '2026-04-03T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-08T12:00:00Z', '2026-04-08T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-10T12:00:00Z', '2026-04-10T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-15T12:00:00Z', '2026-04-15T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-17T12:00:00Z', '2026-04-17T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-22T12:00:00Z', '2026-04-22T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-24T12:00:00Z', '2026-04-24T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-29T12:00:00Z', '2026-04-29T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:53.692Z', '2026-04-10T05:50:53.692Z'),

-- Jose Manuel cancelada (19:00 UTC)
('informaticoelineas6@gmail.com', 'Jose Manuel',
 '2026-04-09T16:00:00Z', '2026-04-10T00:00:00Z',
 'normal', 'cancelada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-09T01:45:57.331Z', '2026-04-10T05:27:29.076Z'),

-- Dariel — abril 2026
('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-02T12:00:00Z', '2026-04-02T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-07T12:00:00Z', '2026-04-07T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-09T12:00:00Z', '2026-04-09T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-14T12:00:00Z', '2026-04-14T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-16T12:00:00Z', '2026-04-16T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-21T12:00:00Z', '2026-04-21T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-23T12:00:00Z', '2026-04-23T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-28T12:00:00Z', '2026-04-28T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

('informaticoelineas5@gmail.com', 'Dariel',
 '2026-04-30T12:00:00Z', '2026-04-30T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:50:31.338Z', '2026-04-10T05:50:31.338Z'),

-- Lester — abril 2026
('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-04T12:00:00Z', '2026-04-04T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-06T12:00:00Z', '2026-04-06T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-11T12:00:00Z', '2026-04-11T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-13T12:00:00Z', '2026-04-13T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-18T12:00:00Z', '2026-04-18T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-20T12:00:00Z', '2026-04-20T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-25T12:00:00Z', '2026-04-25T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z'),

('informaticoelineas4@gmail.com', 'Lester',
 '2026-04-27T12:00:00Z', '2026-04-27T21:00:00Z',
 'normal', 'programada', '',
 'arangochriss95@gmail.com', 'Chriss Arango', '', '',
 '2026-04-10T05:49:33.010Z', '2026-04-10T05:49:33.010Z');


-- ── Chat Logs ─────────────────────────────────────────────────────────────────
-- NOTA: entity_id referencia IDs del sistema anterior (Base44/MongoDB).
-- Se conservan como TEXT. Los chats de incidentes no tendrán match
-- hasta que se mapeen manualmente a los nuevos UUIDs de incidents.
-- Los chats de requests se asociarán al hacer JOIN por título.
--
-- Para vincular chats con requests nuevas, ejecuta después:
--   UPDATE chat_logs SET entity_id = r.id::TEXT
--   FROM requests r
--   WHERE chat_logs.entity_id = '<old_mongo_id>'
--     AND r.title LIKE '...';

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date) VALUES

-- Chats de la request "Migración de Control de Cajas" (old id: 69d4b01977650c3f3dc54960)
('request', '69d4b01977650c3f3dc54960',
 'Tengo que cambiar de pestaña para que los cargue.',
 'informaticoelineas6@gmail.com', 'Informatico Elineas6',
 '2026-04-08T19:00:38.097Z'),

('request', '69d4b01977650c3f3dc54960',
 'Bueno no veo que mis mensajes se estén mandando.',
 'informaticoelineas6@gmail.com', 'Informatico Elineas6',
 '2026-04-08T19:00:23.193Z'),

('request', '69d4b01977650c3f3dc54960',
 'Funciona lo que no veo que avise de nada.',
 'informaticoelineas6@gmail.com', 'Informatico Elineas6',
 '2026-04-08T19:00:09.684Z'),

('request', '69d4b01977650c3f3dc54960',
 'Cuando lo veas respondeme',
 'informaticoelineas3@gmail.com', 'Informático Elineas',
 '2026-04-08T14:07:57.854Z'),

('request', '69d4b01977650c3f3dc54960',
 'Prueba a ver si funciona el chat',
 'informaticoelineas3@gmail.com', 'Informático Elineas',
 '2026-04-08T14:07:45.907Z'),

-- Chats de la request "Clonar workflow 07" (old id: 69d4b1704f660beae45cad13)
('request', '69d4b1704f660beae45cad13',
 'Aca dejo el enlace del repo a clonar',
 'informaticoelineas3@gmail.com', 'Informático Elineas',
 '2026-04-08T18:16:45.135Z'),

('request', '69d4b1704f660beae45cad13',
 'https://github.com/InfElineas/Reabastecimiento',
 'informaticoelineas3@gmail.com', 'Informático Elineas',
 '2026-04-08T18:16:34.440Z'),

-- Chats del incident "No puedo cambiar nombre de usuario" (old id: 69d5dea972764a1e2f34be22)
('incident', '69d5dea972764a1e2f34be22',
 'Estamos trabajando en ello',
 'informaticoelineas3@gmail.com', 'Informático Elineas',
 '2026-04-08T04:52:46.019Z'),

('incident', '69d5dea972764a1e2f34be22',
 'Ya se soluciono el problema',
 'jasanbadelldev@gmail.com', 'Jasan Badell',
 '2026-04-08T04:52:23.271Z');


-- ── Re-vincular chat_logs de requests con los nuevos UUIDs ────────────────────
-- Actualiza entity_id de los chats de "Migración de Control de Cajas"
UPDATE chat_logs
SET entity_id = (
  SELECT id::TEXT FROM requests
  WHERE title LIKE 'Migración del sistema de Control de Cajas%'
  LIMIT 1
)
WHERE entity_id = '69d4b01977650c3f3dc54960'
  AND entity_type = 'request';

-- Actualiza entity_id de los chats de "Clonar workflow 07"
UPDATE chat_logs
SET entity_id = (
  SELECT id::TEXT FROM requests
  WHERE title LIKE 'Clonar y adaptar el workflow 07%'
  LIMIT 1
)
WHERE entity_id = '69d4b1704f660beae45cad13'
  AND entity_type = 'request';

-- Actualiza entity_id de los chats del incident
UPDATE chat_logs
SET entity_id = (
  SELECT id::TEXT FROM incidents
  WHERE description LIKE 'No puedo cambiar el nombre%'
  LIMIT 1
)
WHERE entity_id = '69d5dea972764a1e2f34be22'
  AND entity_type = 'incident';
