{
  "name": "KnowledgeBase",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Article title"
    },
    "content": {
      "type": "string",
      "description": "Article content / solution steps"
    },
    "category": {
      "type": "string",
      "enum": [
        "Hardware",
        "Software",
        "Red / Conectividad",
        "Acceso / Permisos",
        "Impresora / Perif\u00e9rico",
        "Correo / Comunicaci\u00f3n",
        "Otro"
      ],
      "description": "Category matching incident categories"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Search keywords"
    },
    "related_incident_id": {
      "type": "string",
      "description": "ID of the resolved incident this article is based on"
    },
    "author_id": {
      "type": "string",
      "description": "Email of the author"
    },
    "author_name": {
      "type": "string",
      "description": "Display name of the author"
    },
    "is_published": {
      "type": "boolean",
      "default": true,
      "description": "Whether the article is visible to all users"
    },
    "views": {
      "type": "number",
      "default": 0,
      "description": "View count"
    }
  },
  "required": [
    "title",
    "content",
    "category"
  ]
}