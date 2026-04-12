{
  "name": "Request",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Request title"
    },
    "description": {
      "type": "string",
      "description": "Detailed description"
    },
    "priority": {
      "type": "string",
      "enum": [
        "Alta",
        "Media",
        "Baja"
      ],
      "description": "Priority level"
    },
    "request_type": {
      "type": "string",
      "enum": [
        "Desarrollo",
        "Correcci\u00f3n de errores",
        "Mejora funcional",
        "Mejora visual",
        "Migraci\u00f3n",
        "Automatizaci\u00f3n"
      ],
      "description": "Type of request"
    },
    "level": {
      "type": "string",
      "enum": [
        "F\u00e1cil",
        "Medio",
        "Dif\u00edcil"
      ],
      "description": "Difficulty level"
    },
    "status": {
      "type": "string",
      "enum": [
        "Pendiente aprobaci\u00f3n",
        "Pendiente",
        "En progreso",
        "En revisi\u00f3n",
        "Finalizada",
        "Rechazada"
      ],
      "default": "Pendiente",
      "description": "Current status"
    },
    "requester_id": {
      "type": "string"
    },
    "requester_name": {
      "type": "string"
    },
    "assigned_to_id": {
      "type": "string"
    },
    "assigned_to_name": {
      "type": "string"
    },
    "department_ids": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "department_names": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "estimated_hours": {
      "type": "number"
    },
    "estimated_due": {
      "type": "string",
      "format": "date-time"
    },
    "started_at": {
      "type": "string",
      "format": "date-time",
      "description": "When status changed to En progreso (for real time tracking)"
    },
    "completion_date": {
      "type": "string",
      "format": "date-time"
    },
    "actual_hours": {
      "type": "number",
      "description": "Real hours from started_at to completion_date"
    },
    "rejection_reason": {
      "type": "string"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "is_deleted": {
      "type": "boolean",
      "default": false
    },
    "approved_by": {
      "type": "string"
    },
    "approved_by_name": {
      "type": "string"
    },
    "approved_at": {
      "type": "string",
      "format": "date-time"
    },
    "approval_notes": {
      "type": "string"
    }
  },
  "required": [
    "title",
    "description",
    "priority"
  ]
}