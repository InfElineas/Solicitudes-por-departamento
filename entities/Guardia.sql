{
  "name": "Guardia",
  "type": "object",
  "properties": {
    "tecnico_id": {
      "type": "string",
      "description": "Email del t\u00e9cnico de guardia"
    },
    "tecnico_nombre": {
      "type": "string",
      "description": "Nombre del t\u00e9cnico"
    },
    "inicio": {
      "type": "string",
      "format": "date-time",
      "description": "Inicio del turno"
    },
    "fin": {
      "type": "string",
      "format": "date-time",
      "description": "Fin del turno"
    },
    "estado": {
      "type": "string",
      "enum": [
        "programada",
        "activa",
        "finalizada",
        "cancelada",
        "reemplazada"
      ],
      "default": "programada",
      "description": "Estado de la guardia"
    },
    "tipo": {
      "type": "string",
      "enum": [
        "normal",
        "urgencia",
        "fin_de_semana"
      ],
      "default": "normal"
    },
    "observaciones": {
      "type": "string",
      "description": "Notas sobre esta guardia"
    },
    "reemplazado_por_id": {
      "type": "string",
      "description": "Email del t\u00e9cnico que reemplaz\u00f3"
    },
    "reemplazado_por_nombre": {
      "type": "string",
      "description": "Nombre del t\u00e9cnico que reemplaz\u00f3"
    },
    "creada_por": {
      "type": "string",
      "description": "Email de quien cre\u00f3 la guardia"
    },
    "creada_por_nombre": {
      "type": "string",
      "description": "Nombre de quien cre\u00f3 la guardia"
    }
  },
  "required": [
    "tecnico_id",
    "tecnico_nombre",
    "inicio",
    "fin"
  ]
}