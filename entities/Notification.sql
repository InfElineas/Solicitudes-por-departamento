{
  "name": "Notification",
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "description": "Email of the recipient"
    },
    "type": {
      "type": "string",
      "enum": [
        "assigned",
        "comment",
        "status_change"
      ],
      "description": "Type of notification"
    },
    "title": {
      "type": "string",
      "description": "Notification title"
    },
    "message": {
      "type": "string",
      "description": "Notification message"
    },
    "request_id": {
      "type": "string",
      "description": "Related request ID"
    },
    "request_title": {
      "type": "string",
      "description": "Related request title for display"
    },
    "is_read": {
      "type": "boolean",
      "default": false,
      "description": "Whether the notification has been read"
    }
  },
  "required": [
    "user_id",
    "type",
    "title",
    "message"
  ]
}