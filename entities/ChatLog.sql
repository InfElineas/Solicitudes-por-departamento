{
  "name": "ChatLog",
  "type": "object",
  "properties": {
    "entity_type": {
      "type": "string",
      "enum": [
        "request",
        "incident"
      ],
      "description": "Type of entity this chat belongs to"
    },
    "entity_id": {
      "type": "string",
      "description": "ID of the related request or incident"
    },
    "sender_id": {
      "type": "string",
      "description": "Email of the sender"
    },
    "sender_name": {
      "type": "string",
      "description": "Display name of the sender"
    },
    "message": {
      "type": "string",
      "description": "Message content"
    }
  },
  "required": [
    "entity_type",
    "entity_id",
    "sender_id",
    "message"
  ]
}