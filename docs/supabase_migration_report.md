# Informe de viabilidad: migración de base de datos a Supabase

## 1) Resumen ejecutivo

La migración de este backend desde MongoDB (Motor/PyMongo) a Supabase (PostgreSQL) es **viable** y, en términos prácticos, puede aportar mejoras claras en gobernanza de datos, trazabilidad SQL, seguridad con RLS y capacidades analíticas. Sin embargo, la codebase actual tiene una **dependencia extensa de patrones Mongo** (colecciones flexibles, queries dinámicas, agregaciones y documentos embebidos), por lo que una migración total “big bang” tiene riesgo alto.

**Recomendación**: estrategia por fases con compatibilidad temporal, empezando por tablas maestras (`users`, `departments`, `app_config`) y luego el núcleo transaccional (`requests`, `worklogs`, `ticket_status_events`, `requests_trash`).

- **Viabilidad técnica**: Alta.
- **Practicidad operativa**: Media-Alta si se hace incremental; Baja si se intenta reemplazo total en una sola entrega.
- **Riesgo principal**: migrar sin romper comportamiento de negocio (flujos de estado, métricas, papelera TTL y autenticación).

## 2) Hallazgos del estado actual (as-is)

### 2.1 Acoplamiento actual a MongoDB

El backend está fuertemente acoplado a Motor/Mongo: cliente global `AsyncIOMotorClient`, acceso por `get_db()` y uso de colecciones con operadores específicos (`$set`, `$push`, `$inc`, `$text`, agregaciones).【F:backend-dev/app/core/db.py†L1-L37】【F:backend-dev/app/api/routes/requests.py†L75-L156】

También hay creación explícita de índices Mongo (incluyendo text index y TTL index) y migraciones de esquema “on startup”.【F:backend-dev/app/core/indexes.py†L13-L74】【F:backend-dev/app/core/indexes.py†L76-L127】

### 2.2 Modelo de datos dominante

Colecciones principales identificadas:
- `requests` (entidad principal con historial embebido `state_history`, feedback embebido y campos de clasificación/asignación).【F:backend-dev/app/models/request.py†L21-L50】
- `users`, `departments` (maestros/seguridad).【F:backend-dev/app/api/routes/users.py†L10-L112】【F:backend-dev/app/api/routes/departments.py†L1-L10】
- `worklogs` y `ticket_status_events` para trazabilidad/operación.【F:backend-dev/app/repositories/worklogs_repo.py†L7-L47】【F:backend-dev/app/api/routes/requests.py†L56-L62】
- `requests_trash` con expiración automática por TTL (`expireAt`).【F:backend-dev/app/repositories/requests_repo.py†L17-L26】【F:backend-dev/app/core/indexes.py†L61-L65】
- `app_config` en documento único (`_id = app_config`).【F:backend-dev/app/core/app_config_service.py†L10-L24】

### 2.3 Complejidad de consultas y reportes

El módulo de métricas contiene múltiples agregaciones y cómputos por lotes, varios de ellos en memoria luego de traer datasets completos (`find(...).to_list(None)`).【F:backend-dev/app/services/metrics_service.py†L56-L143】

Esto es portable a PostgreSQL, pero exige rediseño a SQL/CTEs/materialized views para no degradar performance.

### 2.4 Señales de deuda técnica relevante para migración

Se observa coexistencia de dos capas backend (`app/*` y `server.py` monolítico), con duplicidad de lógica e índices. Esto incrementa costo/riesgo de migración porque hay que decidir una fuente canónica antes de mover persistencia.【F:backend-dev/app/main.py†L9-L20】【F:backend-dev/server.py†L33-L52】

## 3) Encaje con Supabase (to-be)

## 3.1 Fortalezas de Supabase para este caso

- PostgreSQL + SQL explícito para reporting y auditoría.
- RLS para seguridad multi-rol (`admin`, `support`, `employee`) alineado con los checks actuales en endpoints/Depends.
- Extensiones/índices (GIN, trigram, JSONB) que pueden reemplazar `$text` y parte de la flexibilidad documental.
- Realtime potencial para paneles de solicitudes.

## 3.2 Puntos de fricción

1. **Historial embebido** (`state_history`) y objetos embebidos (`feedback`, `review_evidence`) deberán normalizarse o moverse a `JSONB`.
2. **TTL nativo** de Mongo para papelera no existe igual en Postgres; requiere `pg_cron` o Edge Function programada.
3. **Migraciones automáticas al startup** deben convertirse a migraciones SQL versionadas.
4. **Auth actual JWT propio** puede mantenerse al inicio, pero idealmente converger con Supabase Auth a mediano plazo.

## 4) Diseño de datos recomendado en Supabase

### 4.1 Mapeo de colecciones → tablas

- `users` → `users`
- `departments` → `departments`
- `requests` → `requests`
- `worklogs` → `worklogs`
- `ticket_status_events` → `ticket_status_events`
- `requests_trash` → `requests_trash`
- `app_config` → `app_config` (tabla singleton o KV)

### 4.2 Decisiones de modelado

- IDs: conservar `uuid` (texto hex actual puede migrarse a UUID real cuando sea posible).
- `state_history`: preferir tabla `request_state_history` (1:N) en vez de JSON embebido, para consultas robustas.
- `feedback`: puede vivir en columnas (`feedback_rating`, `feedback_comment`, `feedback_at`, etc.) o tabla aparte si se prevé múltiples entradas.
- Búsqueda de texto (`title/description`): `tsvector` + GIN.
- Campos flexibles puntuales: `jsonb` (uso controlado).

### 4.3 Índices sugeridos

Replicar intención funcional de Mongo:
- `requests(created_at desc)`, `requests(requested_at desc)`, `requests(status)`, `requests(department)`, `requests(assigned_to)`, `requests(type)`, `requests(level)`, `requests(channel)`, `requests(completion_date desc)`.
- FTS: índice GIN sobre `to_tsvector` de `title` y `description`.
- `ticket_status_events(ticket_id, changed_at)`.
- `worklogs(ticket_id)`, `worklogs(user_id)`, `worklogs(fecha desc)`.
- `requests_trash(expire_at)` para limpieza programada.

## 5) Impacto por componente de aplicación

### 5.1 API y repositorios

Actualmente varias rutas acceden directamente a `db.<collection>`; para migrar con bajo riesgo conviene reforzar una capa de repositorio/DAO y evitar más acceso directo en handlers.【F:backend-dev/app/api/routes/requests.py†L75-L169】【F:backend-dev/app/api/routes/users.py†L10-L112】

### 5.2 Seguridad/autenticación

La autenticación actual depende de `users` y JWT firmado con `SECRET_KEY` propio; es migrable sin Supabase Auth en primera fase. A futuro, converger con Supabase Auth simplifica sesiones y políticas RLS.【F:backend-dev/app/api/routes/auth.py†L1-L45】【F:backend-dev/app/core/security.py†L1-L40】

### 5.3 Métricas

Es la zona más sensible. Varias métricas deberían pasar a SQL agregada o vistas materializadas. Mantenerlas en Python con múltiples queries puede funcionar inicialmente, pero no escala igual.

## 6) Estrategia de migración recomendada (práctica)

### Fase 0 — Preparación (1-2 semanas)
- Congelar nuevas dependencias Mongo.
- Unificar fuente de verdad backend (priorizar `app/*` vs `server.py`).
- Definir contrato de datos y diccionario de campos.

### Fase 1 — Esquema Supabase y migraciones (1-2 semanas)
- Crear esquema SQL inicial + índices.
- Scripts ETL idempotentes Mongo → Postgres.
- Validaciones de conteo e integridad referencial.

### Fase 2 — Dual-write controlado (2-3 semanas)
- Para entidades maestras (`users`, `departments`, `app_config`) escribir en ambos destinos.
- Activar feature flags por endpoint.

### Fase 3 — Núcleo transaccional (3-4 semanas)
- Migrar `requests`, `worklogs`, `ticket_status_events`.
- Implementar limpieza de `requests_trash` por job programado.
- Reescribir búsquedas texto completo.

### Fase 4 — Métricas y optimización (2-3 semanas)
- SQL agregada / materialized views.
- Pruebas de carga y tuning.

### Fase 5 — Cutover y deprecación Mongo (1 semana)
- Modo read-only Mongo (ventana corta).
- Verificación final y apagado.

## 7) Riesgos y mitigaciones

1. **Inconsistencia de datos durante transición**  
   Mitigar con dual-write con reconciliación diaria y auditoría de conteos.

2. **Regresión funcional en flujos de estado**  
   Mitigar con tests de regresión de endpoints críticos (`create`, `transition`, `assign`, `feedback`).

3. **Rendimiento en analíticas**  
   Mitigar migrando temprano métricas costosas a SQL/vistas.

4. **Complejidad por duplicidad de backend**  
   Mitigar eliminando o encapsulando `server.py` antes del cutover.

## 8) Estimación de viabilidad y practicidad

- **Viabilidad técnica global**: **8/10**.
- **Practicidad de ejecución**: **7/10** con enfoque incremental; **4/10** en big bang.
- **Costo relativo**: Medio-Alto (por refactor + ETL + pruebas + ajustes de métricas).
- **Beneficio esperado**: Alto a mediano plazo (consistencia, trazabilidad SQL, seguridad y analítica).

## 9) Recomendación final

Sí, **conviene migrar a Supabase**, pero no como sustitución instantánea. El repositorio actual sugiere una transición escalonada, comenzando por dominio maestro y cerrando con analítica avanzada. Esta ruta maximiza continuidad operativa y minimiza riesgo de interrupciones en producción.
