# Frontend del sistema de solicitudes

Este frontend está construido con React 19, TailwindCSS y la librería de componentes de Radix. Se comunica con la API FastAPI del directorio `../backend` para gestionar las solicitudes por departamento.

## Requisitos previos

- Node.js 20 o superior.
- Yarn 1.22 (el proyecto usa `yarn.lock`).
- Un backend en ejecución (consulta las instrucciones en `../backend`).

## Variables de entorno

Crea un archivo `.env` en el directorio `frontend` (puedes copiar `.env.example` si existe) y define:

```bash
REACT_APP_BACKEND_URL=http://localhost:8000
```

Ajusta la URL según dónde expongas la API.

## Instalación

```bash
cd frontend
yarn install
```

## Scripts disponibles

- `yarn start`: arranca la aplicación en modo desarrollo en [http://localhost:3000](http://localhost:3000). Se recarga automáticamente al guardar cambios.
- `yarn build`: genera los artefactos listos para producción en la carpeta `build`.
- `yarn test`: ejecuta las pruebas unitarias de React en modo watch.

## Integración con el backend

1. Levanta la API de FastAPI (ver `../backend/README.md`).
2. Asegúrate de que `REACT_APP_BACKEND_URL` apunte al backend.
3. Ejecuta `yarn start` y autentícate con el usuario sembrado por el backend (`admin`/`admin123` por defecto).

## Estructura relevante

- `src/App.js`: pantalla principal y rutas.
- `src/hooks/use-toast.js`: gestor de notificaciones.
- `src/components/ui`: componentes reutilizables basados en Radix y Tailwind.

## Buenas prácticas

- Usa `yarn` para instalar dependencias; evita mezclar con `npm`.
- Sigue los patrones existentes para hooks y componentes (`useX`, `ComponentName`).
- Para nuevas peticiones HTTP reutiliza el cliente Axios definido en `src/App.js` o extrae lógica común a un hook dedicado.
