{
  "name": "RequestFeedback",
  "type": "object",
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Request ID"
    },
    "rating": {
      "type": "string",
      "enum": [
        "up",
        "down"
      ],
      "description": "Thumbs up or down"
    },
    "comment": {
      "type": "string",
      "description": "Feedback comment"
    },
    "by_user_id": {
      "type": "string",
      "description": "User who gave feedback"
    },
    "by_user_name": {
      "type": "string",
      "description": "Name of user"
    }
  },
  "required": [
    "request_id",
    "rating"
  ]
}