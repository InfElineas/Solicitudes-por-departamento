{
  "name": "RequestHistory",
  "type": "object",
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Request ID"
    },
    "from_status": {
      "type": "string",
      "description": "Previous status"
    },
    "to_status": {
      "type": "string",
      "description": "New status"
    },
    "note": {
      "type": "string",
      "description": "Transition note"
    },
    "by_user_id": {
      "type": "string",
      "description": "User who made the change"
    },
    "by_user_name": {
      "type": "string",
      "description": "Name of user who made the change"
    }
  },
  "required": [
    "request_id",
    "to_status"
  ]
}