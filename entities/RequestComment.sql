{
  "name": "RequestComment",
  "type": "object",
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Request ID this comment belongs to"
    },
    "text": {
      "type": "string",
      "description": "Comment text"
    },
    "author_id": {
      "type": "string",
      "description": "Email of the author"
    },
    "author_name": {
      "type": "string",
      "description": "Display name of the author"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Attached file/image URLs"
    }
  },
  "required": [
    "request_id",
    "text",
    "author_id"
  ]
}