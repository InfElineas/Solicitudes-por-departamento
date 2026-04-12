-- ============================================================
-- Seed: 001 — Datos reales importados desde Base44
-- Date: 2026-04-12
-- Fuente: exports CSV de la plataforma anterior.
-- NOTA: Ejecutar DESPUÉS de migration 001 y 004.
-- ============================================================

-- ── Limpiar datos de demo anteriores ─────────────────────────────────────────
TRUNCATE TABLE automation_rules, chat_logs, request_comments,
               request_histories, request_trash, notifications,
               incidents, requests, guardias, departments, app_users
CASCADE;


-- ── Departments ───────────────────────────────────────────────────────────────
INSERT INTO departments (name, is_active, created_date) VALUES
  ('Soporte',          true, '2026-04-08T14:12:19.856Z'),
  ('Recursos Humanos', true, '2026-04-07T07:30:57.680Z'),
  ('Auditoria',        true, '2026-04-07T07:30:38.697Z'),
  ('Comerciales',      true, '2026-04-07T07:30:28.589Z'),
  ('Facturacion',      true, '2026-04-07T07:30:16.599Z'),
  ('Inventario',       true, '2026-04-07T07:30:09.472Z'),
  ('Administracion',   true, '2026-04-07T07:30:02.705Z')
ON CONFLICT DO NOTHING;


-- ── App Users ─────────────────────────────────────────────────────────────────
-- Nota: crear primero los usuarios en Authentication → Users de Supabase
-- con los mismos emails. Este seed solo crea los perfiles en app_users.
INSERT INTO app_users (email, full_name, display_name, role, created_date) VALUES
  ('informaticoelineas3@gmail.com', 'Informático Elineas',  'Informático Elineas',  'superadmin', now()),
  ('arangochriss95@gmail.com',      'Chriss Arango',        'Chriss Arango',        'admin',      now()),
  ('jasanbadelldev@gmail.com',      'Jasan Badell',         'Jasan Badell',         'support',    now()),
  ('informaticoelineas4@gmail.com', 'Lester',               'Lester',               'support',    now()),
  ('informaticoelineas5@gmail.com', 'Dariel',               'Dariel',               'support',    now()),
  ('informaticoelineas6@gmail.com', 'Jose Manuel',          'Jose Manuel',          'support',    now())
ON CONFLICT (email) DO UPDATE
  SET full_name    = EXCLUDED.full_name,
      display_name = EXCLUDED.display_name,
      role         = EXCLUDED.role;


-- ── Requests ──────────────────────────────────────────────────────────────────
INSERT INTO requests (
  title, description, status, priority, request_type, level,
  requester_id, requester_name,
  assigned_to_id, assigned_to_name,
  estimated_hours, estimated_due,
  completion_date, department_names, file_urls,
  is_deleted, created_date, updated_date
) VALUES

-- 1. Clonación y evolución de web app (activa)
(
  'Clonación y evolución de web app de inventario a plataforma de reabastecimiento, con flujo comercial y estructura preparada para APK',
  'Se requiere clonar la aplicación web actual en una nueva cuenta de Netlify y continuar su desarrollo para convertirla de una app enfocada en inventario a una plataforma orientada a reabastecimiento.',
  'En progreso', 'Alta', 'Mejora funcional', 'Medio',
  'informaticoelineas3@gmail.com', 'Informático Elineas',
  'informaticoelineas4@gmail.com', 'informatico elineas',
  12, NULL,
  NULL, '[]', '[]',
  false, '2026-04-08T18:33:33.160Z', '2026-04-10T13:47:08.897Z'
),

-- 2. Clonar workflow 07 (activa)
(
  'Clonar y adaptar el workflow 07 - Descarga TKC to Export TKC R todos para generar también los reportes de Lotes y Venta Directa',
  'Actualmente el workflow 07 realiza la descarga del reporte Submayor desde TKC y lo exporta hacia Google Sheets. Se necesita replicar la misma lógica para Lotes y Venta Directa.',
  'En progreso', 'Media', 'Automatización', 'Medio',
  'informaticoelineas3@gmail.com', 'Informático Elineas',
  'informaticoelineas5@gmail.com', 'Informatico Elineas',
  12, '2026-04-14T13:00:00Z',
  NULL, '[]', '[]',
  false, '2026-04-07T07:51:28.518Z', '2026-04-08T18:42:33.614Z'
),

-- 3. Actualización de archivo para scripts (finalizada)
(
  'Actualizacion de archivo para scripts',
  'Necesito que se actualicen los scripts en la nube y los que no se están usando se pasen a una carpeta de historico con control de versiones.',
  'Finalizada', 'Baja', 'Mejora visual', 'Fácil',
  'informaticoelineas3@gmail.com', 'Informático Elineas',
  'informaticoelineas5@gmail.com', 'Informatico Elineas',
  2, '2026-04-09T10:30:00Z',
  '2026-04-07T15:43:03.031Z', '[]', '[]',
  false, '2026-04-07T07:37:07.803Z', '2026-04-07T15:43:04.108Z'
),

-- 4. Migración Control de Cajas (activa)
(
  'Migración del sistema de Control de Cajas de MongoDB a Supabase',
  'Se solicita la migración técnica del sistema Control de Cajas, actualmente soportado sobre MongoDB, hacia Supabase (PostgreSQL + Auth + Storage + políticas de acceso).',
  'En progreso', 'Alta', 'Migración', 'Difícil',
  'informaticoelineas3@gmail.com', 'Informático Elineas',
  'informaticoelineas6@gmail.com', 'Informatico Elineas6',
  96, '2026-04-20T10:00:00Z',
  NULL, '[]', '[]',
  false, '2026-04-07T07:19:53.447Z', '2026-04-08T18:36:18.559Z'
);


-- ── Request Histories ─────────────────────────────────────────────────────────
-- Usamos subconsultas para obtener el id de cada request por título
INSERT INTO request_histories (request_id, from_status, to_status, note, by_user_id, by_user_name, created_date)
SELECT r.id::TEXT, 'En progreso', 'En progreso',
       'Atendida por técnico', 'informaticoelineas5@gmail.com', 'Informatico Elineas',
       '2026-04-08T18:42:33.797Z'
FROM requests r WHERE r.title LIKE 'Clonar y adaptar el workflow 07%' LIMIT 1;

INSERT INTO request_histories (request_id, from_status, to_status, note, by_user_id, by_user_name, created_date)
SELECT r.id::TEXT, 'Pendiente', 'En progreso',
       'Atendida por técnico', 'arangochriss95@gmail.com', 'Chriss Arango',
       '2026-04-08T18:42:12.638Z'
FROM requests r WHERE r.title LIKE 'Clonar y adaptar el workflow 07%' LIMIT 1;

INSERT INTO request_histories (request_id, from_status, to_status, note, by_user_id, by_user_name, created_date)
SELECT r.id::TEXT, 'Pendiente', 'En progreso',
       'Atendida por técnico', 'informaticoelineas5@gmail.com', 'Informatico Elineas',
       '2026-04-08T18:40:50.278Z'
FROM requests r WHERE r.title LIKE 'Clonación y evolución%' AND r.is_deleted = false LIMIT 1;

INSERT INTO request_histories (request_id, from_status, to_status, note, by_user_id, by_user_name, created_date)
SELECT r.id::TEXT, 'Pendiente', 'En progreso',
       'Atendida por técnico', 'informaticoelineas6@gmail.com', 'Informatico Elineas6',
       '2026-04-08T13:35:20.856Z'
FROM requests r WHERE r.title LIKE 'Migración del sistema%' LIMIT 1;

INSERT INTO request_histories (request_id, from_status, to_status, note, by_user_id, by_user_name, created_date)
SELECT r.id::TEXT, 'Pendiente', 'En progreso',
       'Tomada por técnico', 'informaticoelineas5@gmail.com', 'Informatico Elineas',
       '2026-04-07T15:48:09.848Z'
FROM requests r WHERE r.title LIKE 'Clonar y adaptar el workflow 07%' LIMIT 1;

INSERT INTO request_histories (request_id, from_status, to_status, note, by_user_id, by_user_name, created_date)
SELECT r.id::TEXT, 'Pendiente', 'Finalizada',
       '', 'informaticoelineas5@gmail.com', 'Informatico Elineas',
       '2026-04-07T15:43:04.306Z'
FROM requests r WHERE r.title = 'Actualizacion de archivo para scripts' LIMIT 1;


-- ── Request Comments ──────────────────────────────────────────────────────────
INSERT INTO request_comments (request_id, content, author_id, author_name, file_urls, created_date)
SELECT r.id::TEXT,
       'https://github.com/InfElineas/Reabastecimiento' || chr(10) || 'Aca esta el repo a clonar',
       'arangochriss95@gmail.com', 'Chriss Arango', '[]',
       '2026-04-08T18:39:41.588Z'
FROM requests r WHERE r.title LIKE 'Clonación y evolución%' AND r.is_deleted = false LIMIT 1;

INSERT INTO request_comments (request_id, content, author_id, author_name, file_urls, created_date)
SELECT r.id::TEXT,
       'Necesito un reporte sobre esto',
       'informaticoelineas3@gmail.com', 'Informático Elineas', '[]',
       '2026-04-07T07:54:05.319Z'
FROM requests r WHERE r.title = 'Actualizacion de archivo para scripts' LIMIT 1;


-- ── Request Trash ─────────────────────────────────────────────────────────────
INSERT INTO request_trash (
  original_request_id, deleted_by, deleted_by_name,
  title, expire_at, created_date
) VALUES (
  '69d4b1704f660beae45cad13',
  'informaticoelineas3@gmail.com',
  'Informático Elineas',
  'Clonación y evolución de web app de inventario a plataforma de reabastecimiento, con flujo comercial y estructura preparada para APK',
  '2026-05-08T18:34:03.478Z',
  '2026-04-08T18:34:03.481Z'
);


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
  true,
  0,
  '2026-04-08T18:17:54.289Z',
  '2026-04-08T05:22:24.484Z',
  '2026-04-08T18:17:54.383Z'
);


-- ── Chat Logs ─────────────────────────────────────────────────────────────────
INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'Tengo que cambiar de pestaña para que los cargue.',
       'informaticoelineas6@gmail.com', 'Jose Manuel',
       '2026-04-08T19:00:38.097Z'
FROM requests r WHERE r.title LIKE 'Migración del sistema%' LIMIT 1;

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'Bueno no veo que mis mensajes se estén mandando.',
       'informaticoelineas6@gmail.com', 'Jose Manuel',
       '2026-04-08T19:00:23.193Z'
FROM requests r WHERE r.title LIKE 'Migración del sistema%' LIMIT 1;

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'Funciona lo que no veo que avise de nada.',
       'informaticoelineas6@gmail.com', 'Jose Manuel',
       '2026-04-08T19:00:09.684Z'
FROM requests r WHERE r.title LIKE 'Migración del sistema%' LIMIT 1;

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'Aca dejo el enlace del repo a clonar',
       'informaticoelineas3@gmail.com', 'Informático Elineas',
       '2026-04-08T18:16:45.135Z'
FROM requests r WHERE r.title LIKE 'Clonar y adaptar el workflow 07%' LIMIT 1;

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'https://github.com/InfElineas/Reabastecimiento',
       'informaticoelineas3@gmail.com', 'Informático Elineas',
       '2026-04-08T18:16:34.440Z'
FROM requests r WHERE r.title LIKE 'Clonar y adaptar el workflow 07%' LIMIT 1;

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'Cuando lo veas respondeme',
       'informaticoelineas3@gmail.com', 'Informático Elineas',
       '2026-04-08T14:07:57.854Z'
FROM requests r WHERE r.title LIKE 'Migración del sistema%' LIMIT 1;

INSERT INTO chat_logs (entity_type, entity_id, message, sender_id, sender_name, created_date)
SELECT 'request', r.id::TEXT,
       'Prueba a ver si funciona el chat',
       'informaticoelineas3@gmail.com', 'Informático Elineas',
       '2026-04-08T14:07:45.907Z'
FROM requests r WHERE r.title LIKE 'Migración del sistema%' LIMIT 1;


-- ── Incidents ─────────────────────────────────────────────────────────────────
INSERT INTO incidents (
  tool_name, impact, description, reporter_name, reporter_email,
  status, category, assigned_to_id, assigned_to_name,
  resolution_hours, resolved_at, resolution_notes,
  file_urls, created_date, updated_date
) VALUES (
  'App de solicitudes',
  'Bajo - Pequeña molestia',
  'No puedo cambiar el nombre de mi usuario',
  'Jasan Badell',
  'jasanbadelldev@gmail.com',
  'Resuelto',
  'Software',
  'informaticoelineas3@gmail.com',
  'Informático Elineas',
  -4,
  '2026-04-08T04:53:22.153Z',
  'Se implemento un parche de seguridad que permite al usuario cambiar el nombre de usuario',
  '[]',
  '2026-04-08T04:50:49.091Z',
  '2026-04-09T01:32:24.092Z'
);


-- ── Guardias ──────────────────────────────────────────────────────────────────
-- Lester (informaticoelineas4)
INSERT INTO guardias (tecnico_id, tecnico_nombre, inicio, fin, tipo, estado, creada_por, creada_por_nombre, created_date) VALUES
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-04T12:00:00Z', '2026-04-04T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-06T12:00:00Z', '2026-04-06T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-11T12:00:00Z', '2026-04-11T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-13T12:00:00Z', '2026-04-13T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-18T12:00:00Z', '2026-04-18T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-20T12:00:00Z', '2026-04-20T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-25T12:00:00Z', '2026-04-25T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z'),
  ('informaticoelineas4@gmail.com', 'Lester', '2026-04-27T12:00:00Z', '2026-04-27T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:49:33.010Z');

-- Dariel (informaticoelineas5)
INSERT INTO guardias (tecnico_id, tecnico_nombre, inicio, fin, tipo, estado, creada_por, creada_por_nombre, created_date) VALUES
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-02T12:00:00Z', '2026-04-02T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-07T12:00:00Z', '2026-04-07T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-09T12:00:00Z', '2026-04-09T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-14T12:00:00Z', '2026-04-14T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-16T12:00:00Z', '2026-04-16T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-21T12:00:00Z', '2026-04-21T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-23T12:00:00Z', '2026-04-23T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-28T12:00:00Z', '2026-04-28T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z'),
  ('informaticoelineas5@gmail.com', 'Dariel', '2026-04-30T12:00:00Z', '2026-04-30T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:31.338Z');

-- Jose Manuel (informaticoelineas6)
INSERT INTO guardias (tecnico_id, tecnico_nombre, inicio, fin, tipo, estado, creada_por, creada_por_nombre, created_date) VALUES
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-01T12:00:00Z', '2026-04-01T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-03T12:00:00Z', '2026-04-03T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-08T12:00:00Z', '2026-04-08T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-10T12:00:00Z', '2026-04-10T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-15T12:00:00Z', '2026-04-15T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-17T12:00:00Z', '2026-04-17T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-22T12:00:00Z', '2026-04-22T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-24T12:00:00Z', '2026-04-24T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z'),
  ('informaticoelineas6@gmail.com', 'Jose Manuel', '2026-04-29T12:00:00Z', '2026-04-29T21:00:00Z', 'normal', 'programada', 'arangochriss95@gmail.com', 'Chriss Arango', '2026-04-10T05:50:53.692Z');


-- ── Notifications ─────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, type, title, message, is_read, created_date)
SELECT
  'informaticoelineas5@gmail.com', 'assigned',
  'Se te asignó una solicitud',
  'La solicitud "Clonar y adaptar el workflow 07..." ha sido asignada a ti.',
  false, '2026-04-07T13:54:20.002Z';

INSERT INTO notifications (user_id, type, title, message, is_read, created_date)
SELECT
  'informaticoelineas5@gmail.com', 'assigned',
  'Solicitud reasignada a ti',
  'La solicitud "Actualizacion de archivo para scripts" ha sido asignada a ti.',
  true, '2026-04-07T13:54:35.460Z';

INSERT INTO notifications (user_id, type, title, message, is_read, created_date)
SELECT
  'informaticoelineas4@gmail.com', 'assigned',
  '🛡️ Guardias programadas',
  'Se programaron 8 guardia(s) de normal para ti en abril de 2026.',
  true, '2026-04-10T05:49:33.452Z';

INSERT INTO notifications (user_id, type, title, message, is_read, created_date)
SELECT
  'informaticoelineas5@gmail.com', 'assigned',
  '🛡️ Guardias programadas',
  'Se programaron 9 guardia(s) de normal para ti en abril de 2026.',
  false, '2026-04-10T05:50:31.686Z';

INSERT INTO notifications (user_id, type, title, message, is_read, created_date)
SELECT
  'informaticoelineas6@gmail.com', 'assigned',
  '🛡️ Guardias programadas',
  'Se programaron 9 guardia(s) de normal para ti en abril de 2026.',
  false, '2026-04-10T05:50:53.976Z';
