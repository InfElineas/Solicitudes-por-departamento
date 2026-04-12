{
  "name": "RequestTrash",
  "type": "object",
  "properties": {
    "original_request_id": {
      "type": "string",
      "description": "Original request ID"
    },
    "snapshot": {
      "type": "string",
      "description": "JSON snapshot of the deleted request"
    },
    "deleted_by_id": {
      "type": "string",
      "description": "User who deleted"
    },
    "deleted_by_name": {
      "type": "string",
      "description": "Name of user who deleted"
    },
    "expire_at": {
      "type": "string",
      "format": "date-time",
      "description": "When to permanently delete"
    }
  },
  "required": [
    "original_request_id",
    "snapshot",
    "expire_at"
  ]
}