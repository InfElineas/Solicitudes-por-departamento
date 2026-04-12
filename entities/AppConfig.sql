{
  "name": "AppConfig",
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Configuration key"
    },
    "value": {
      "type": "string",
      "description": "Configuration value (JSON string)"
    },
    "description": {
      "type": "string",
      "description": "Description of this config"
    }
  },
  "required": [
    "key",
    "value"
  ]
}