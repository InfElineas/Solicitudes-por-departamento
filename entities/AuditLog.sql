{
  "name": "AuditLog",
  "type": "object",
  "properties": {
    "entity_type": {
      "type": "string",
      "enum": [
        "request",
        "incident",
        "activo"
      ],
      "description": "Type of entity changed"
    },
    "entity_id": {
      "type": "string",
      "description": "ID of the changed entity"
    },
    "entity_title": {
      "type": "string",
      "description": "Human-readable title/name of the entity"
    },
    "action": {
      "type": "string",
      "enum": [
        "create",
        "update",
        "delete",
        "status_change"
      ],
      "description": "Action performed"
    },
    "field_changed": {
      "type": "string",
      "description": "Field that was changed"
    },
    "old_value": {
      "type": "string",
      "description": "Previous value (JSON string)"
    },
    "new_value": {
      "type": "string",
      "description": "New value (JSON string)"
    },
    "by_user_id": {
      "type": "string",
      "description": "Email of user who made the change"
    },
    "by_user_name": {
      "type": "string",
      "description": "Display name of user who made the change"
    },
    "snapshot": {
      "type": "string",
      "description": "Full JSON snapshot of the entity after change (for restore)"
    }
  },
  "required": [
    "entity_type",
    "entity_id",
    "action",
    "by_user_id"
  ]
}