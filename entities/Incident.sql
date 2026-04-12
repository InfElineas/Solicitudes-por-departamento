{
  "name": "Incident",
  "type": "object",
  "properties": {
    "tool_name": {
      "type": "string",
      "title": "Herramienta afectada"
    },
    "activo_id": {
      "type": "string",
      "title": "ID del activo relacionado"
    },
    "activo_nombre": {
      "type": "string",
      "title": "Nombre del activo relacionado"
    },
    "category": {
      "type": "string",
      "title": "Categor\u00eda",
      "enum": [
        "Hardware",
        "Software",
        "Red / Conectividad",
        "Acceso / Permisos",
        "Impresora / Perif\u00e9rico",
        "Correo / Comunicaci\u00f3n",
        "Otro"
      ]
    },
    "description": {
      "type": "string",
      "title": "Descripci\u00f3n del problema"
    },
    "impact": {
      "type": "string",
      "title": "Impacto",
      "enum": [
        "Cr\u00edtico - No puedo trabajar",
        "Alto - Trabajo muy afectado",
        "Medio - Trabajo parcialmente afectado",
        "Bajo - Peque\u00f1a molestia"
      ]
    },
    "reporter_name": {
      "type": "string",
      "title": "Nombre del reportante"
    },
    "reporter_email": {
      "type": "string",
      "title": "Email del reportante"
    },
    "department": {
      "type": "string",
      "title": "Departamento"
    },
    "status": {
      "type": "string",
      "title": "Estado",
      "enum": [
        "Pendiente",
        "En atenci\u00f3n",
        "Resuelto",
        "No reproducible"
      ],
      "default": "Pendiente"
    },
    "assigned_to": {
      "type": "string",
      "title": "Asignado a (email t\u00e9cnico)"
    },
    "assigned_to_name": {
      "type": "string",
      "title": "Nombre t\u00e9cnico asignado"
    },
    "resolution_notes": {
      "type": "string",
      "title": "Notas de resoluci\u00f3n"
    },
    "resolved_at": {
      "type": "string",
      "title": "Fecha de resoluci\u00f3n",
      "format": "date-time"
    },
    "resolution_hours": {
      "type": "number",
      "title": "Horas de resoluci\u00f3n"
    },
    "file_urls": {
      "type": "array",
      "title": "Archivos adjuntos",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "tool_name",
    "category",
    "description",
    "impact"
  ]
}