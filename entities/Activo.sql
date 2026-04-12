{
  "name": "Activo",
  "type": "object",
  "properties": {
    "nombre": {
      "type": "string",
      "title": "Nombre del activo"
    },
    "tipo": {
      "type": "string",
      "title": "Tipo",
      "enum": [
        "Hardware",
        "Software",
        "Licencia",
        "Perif\u00e9rico",
        "Red",
        "Otro"
      ]
    },
    "marca": {
      "type": "string",
      "title": "Marca"
    },
    "modelo": {
      "type": "string",
      "title": "Modelo"
    },
    "numero_serie": {
      "type": "string",
      "title": "N\u00famero de serie / C\u00f3digo"
    },
    "estado": {
      "type": "string",
      "title": "Estado",
      "enum": [
        "Activo",
        "En reparaci\u00f3n",
        "Dado de baja",
        "En pr\u00e9stamo"
      ],
      "default": "Activo"
    },
    "assigned_to": {
      "type": "string",
      "title": "Asignado a (email)"
    },
    "assigned_to_name": {
      "type": "string",
      "title": "Nombre del usuario asignado"
    },
    "department": {
      "type": "string",
      "title": "Departamento"
    },
    "fecha_adquisicion": {
      "type": "string",
      "format": "date-time",
      "title": "Fecha de adquisici\u00f3n"
    },
    "notas": {
      "type": "string",
      "title": "Notas"
    }
  },
  "required": [
    "nombre",
    "tipo"
  ]
}