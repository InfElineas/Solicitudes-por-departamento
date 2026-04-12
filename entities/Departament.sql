{
  "name": "Department",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Department name"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether the department is active"
    }
  },
  "required": [
    "name"
  ]
}