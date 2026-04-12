{
  "name": "Worklog",
  "type": "object",
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Request ID"
    },
    "user_id": {
      "type": "string",
      "description": "User who logged work"
    },
    "user_name": {
      "type": "string",
      "description": "Name of user"
    },
    "minutes": {
      "type": "number",
      "description": "Minutes worked"
    },
    "note": {
      "type": "string",
      "description": "Work note"
    }
  },
  "required": [
    "request_id",
    "minutes"
  ]
}