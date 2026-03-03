# Solicitudes por departamento

Sistema web para gestionar solicitudes internas entre departamentos (mesa de ayuda / soporte operativo), con:

- **Frontend** en React.
- **Backend** en FastAPI.
- **Persistencia actual** en MongoDB (Motor/PyMongo).

> Este README está pensado para que una persona nueva pueda entender **qué hace el proyecto**, **cómo está organizado**, **cómo levantarlo localmente**, y **dónde tocar código** según la funcionalidad.

---

## 1. ¿Qué problema resuelve?

La aplicación centraliza solicitudes internas (tickets) para que distintas áreas de la empresa puedan:

1. Crear solicitudes.
2. Asignarlas a soporte / responsables.
3. Moverlas por estados (pendiente, en progreso, en revisión, finalizada, rechazada).
4. Registrar trabajo invertido (worklogs).
5. Obtener métricas operativas y de desempeño.
6. Gestionar usuarios, departamentos y configuración general.
7. Usar papelera lógica (soft delete + restauración).

---

## 2. Arquitectura general

```text
[Frontend React]  --->  [API FastAPI (/api)]  --->  [MongoDB]
        |                     |
        |                     +--> auth, users, requests, metrics, worklogs, config
        |
        +--> consume endpoints con axios (token Bearer)
```

### Componentes

- `frontend/`: SPA en React (UI + consumo de API).
- `backend-dev/`: API y lógica de negocio en FastAPI.
- `docs/`: documentación técnica adicional (incluye análisis de migración a Supabase).

---

## 3. Estructura del repositorio (guía rápida)

```text
/
├── README.md
├── docs/
│   └── supabase_migration_report.md
├── backend-dev/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   ├── router.py
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── requests.py
│   │   │       ├── departments.py
│   │   │       ├── metrics.py
│   │   │       ├── worklogs.py
│   │   │       ├── trash.py
│   │   │       └── config.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── db.py
│   │   │   ├── security.py
│   │   │   ├── indexes.py
│   │   │   └── app_config_*.py
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── utils/
│   ├── server.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── api/client.js
│   │   ├── components/
│   │   ├── utils/
│   │   └── App.js
│   ├── package.json
│   └── README.md
└── tests/
```

---

## 4. Backend: cómo está organizado

## 4.1 Punto de entrada

- **Principal recomendado**: `backend-dev/app/main.py` (crea app, middlewares CORS/GZip, health checks, startup/shutdown).
- Hay un archivo histórico grande `backend-dev/server.py` con lógica adicional/duplicada que todavía expone piezas usadas por `main.py`.

> ⚠️ Nota de mantenimiento: hay deuda técnica por coexistencia de `app/*` y `server.py`; antes de cambios grandes conviene definir una ruta canónica.

## 4.2 Configuración

`backend-dev/app/core/config.py` carga variables de entorno (Mongo, JWT, CORS, paginación, TTL de papelera, etc.) usando Pydantic Settings.

Variables importantes:

- `MONGO_URL`
- `DB_NAME`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `MAX_PAGE_SIZE`
- `TRASH_TTL_DAYS`

## 4.3 Base de datos

`backend-dev/app/core/db.py` crea un `AsyncIOMotorClient` global con TLS/certifi y expone:

- `get_client()`
- `get_db()`
- `close_db()`

El acceso a colecciones hoy se hace mayoritariamente como `db.<collection>` en rutas y servicios.

## 4.4 Capas del backend

### a) API routes (`app/api/routes/*`)
Define endpoints HTTP y validaciones de request/response.

### b) Dependencies (`app/api/deps.py`)
Resuelve usuario autenticado y control de roles (`require_role`).

### c) Services (`app/services/*`)
Lógica de negocio reusable (transiciones de estado, métricas, auth).

### d) Repositories (`app/repositories/*`)
Acceso a datos encapsulado (hoy parcial; no toda la app usa esta capa todavía).

### e) Core (`app/core/*`)
Infraestructura: config, seguridad, DB, índices/migraciones de arranque, app config.

## 4.5 Endpoints principales

Base path backend: `/api`

- `POST /auth/login`, `GET /auth/me`
- `GET/POST/PATCH/DELETE /users`
- `GET /departments`
- `GET/POST /requests` + acciones (`classify`, `assign`, `transition`, `feedback`)
- `GET /reports/*` y `GET /analytics/dashboard`
- `POST/GET /requests/{ticket_id}/worklogs` y `GET /requests/me/worklogs`
- `GET /requests/trash`, `POST restore`, `DELETE purge`
- `GET/PUT /config`

Además:
- `GET /health`
- `GET /ready`

---

## 5. Frontend: cómo está organizado

`frontend/src` contiene la SPA:

- `App.js` / `SecureApp.js`: composición principal de la app.
- `api/client.js`: instancia axios, base URL y manejo global de token/errores.
- `components/requests/*`: flujo principal de tickets.
- `components/users/*`, `components/departaments/*`, `components/analytics/*`.
- `components/ui/*`: librería interna de componentes UI.
- `utils/session.js`: token/session en cliente.

La API base se define con:
- `REACT_APP_BACKEND_URL` (si no está, usa `http://localhost:8000`).

---

## 6. Flujo funcional resumido

1. Usuario inicia sesión (`/auth/login`) y obtiene JWT.
2. Frontend guarda token y lo envía como `Bearer` en cada request.
3. Usuario crea solicitud (`POST /requests`).
4. Admin/support clasifica, asigna y mueve estados.
5. Soporte registra horas en worklogs.
6. Solicitante puede dejar feedback al finalizar.
7. Métricas agregan datos para dashboard/reportes.
8. Si se elimina una solicitud, pasa a `requests_trash` y puede restaurarse.

---

## 7. Primer arranque local (paso a paso)

## 7.1 Requisitos

- Python 3.10+ (ideal 3.11)
- Node.js 18+
- MongoDB accesible (local o remoto)

## 7.2 Backend

```bash
cd backend-dev
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.sample .env   # si existe en tu entorno
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 7.3 Frontend

```bash
cd frontend
npm install
npm start
```

Frontend por defecto en `http://localhost:3000`.

---

## 8. Dónde tocar código según la tarea

- **Login / token / permisos**: `backend-dev/app/api/routes/auth.py`, `backend-dev/app/api/deps.py`, `backend-dev/app/core/security.py`.
- **Tickets (CRUD + estados)**: `backend-dev/app/api/routes/requests.py`, `backend-dev/app/services/request_service.py`.
- **Worklogs**: `backend-dev/app/api/routes/worklogs.py`, `backend-dev/app/repositories/worklogs_repo.py`.
- **Métricas**: `backend-dev/app/api/routes/metrics.py`, `backend-dev/app/services/metrics_service.py`.
- **Usuarios/departamentos**: `backend-dev/app/api/routes/users.py`, `backend-dev/app/api/routes/departments.py`.
- **Configuración global app**: `backend-dev/app/core/app_config_service.py`, `backend-dev/app/core/app_config_schema.py`, `backend-dev/app/api/routes/config.py`.
- **Frontend de solicitudes**: `frontend/src/components/requests/*`.

---

## 9. Modelo de roles (actual)

- `admin`: gestión global (usuarios, asignaciones, etc.).
- `support`: operación técnica (transiciones, worklogs, gestión de tickets según reglas).
- `employee`: crea y consulta sus solicitudes; feedback como solicitante.

Los controles principales están en `require_role(...)` y validaciones por endpoint.

---

## 10. Índices, migraciones y seeds

En startup, el sistema crea índices y aplica migraciones idempotentes de esquema (campos faltantes, normalizaciones de estado, etc.).

- Índices/core: `backend-dev/app/core/indexes.py`.
- Enrutamiento de startup actual: `backend-dev/app/main.py` apoyado en funciones de `backend-dev/server.py`.

---

## 11. Pruebas y calidad

Hay tests en frontend para utilidades/componentes y base de tests Python.

Ejemplos:

```bash
# frontend
cd frontend
npm test

# backend (si se añaden/ajustan tests)
cd backend-dev
pytest
```

---

## 12. Documentación complementaria

- **Análisis de migración a Supabase**: `docs/supabase_migration_report.md`

Si vas a participar en la migración de BD, empieza por ese documento y luego revisa los accesos directos a Mongo en rutas/servicios.

---

## 13. Roadmap técnico sugerido (resumen)

1. Reducir dependencia de `server.py` y consolidar arquitectura en `app/*`.
2. Reforzar repositorios/DAO para aislar persistencia.
3. Añadir más pruebas de regresión en endpoints críticos.
4. Ejecutar migración a Supabase por fases (sin big-bang).

---

## 14. Problemas comunes (onboarding)

- **CORS / 401 en frontend**: revisar `REACT_APP_BACKEND_URL`, token y `CORS_ORIGINS`.
- **Backend no conecta a Mongo**: validar `MONGO_URL`, `DB_NAME` y conectividad.
- **Errores de permisos**: confirmar rol de usuario y reglas de endpoint.
- **Métricas lentas**: revisar tamaño de colección e índices.

---

## 15. Checklist para un nuevo programador

1. Levantar backend y frontend localmente.
2. Probar login y crear un ticket de punta a punta.
3. Ejecutar transición de estados y registrar worklog.
4. Revisar métricas y papelera.
5. Leer `docs/supabase_migration_report.md` si tocará persistencia.

Con este flujo ya tendrás una comprensión práctica del 80-90% del sistema.
