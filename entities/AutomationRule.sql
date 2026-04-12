{
  "name": "AutomationRule",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Rule name"
    },
    "description": {
      "type": "string",
      "description": "What this rule does"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether the rule is enabled"
    },
    "trigger": {
      "type": "string",
      "enum": [
        "stale_48h",
        "stale_24h",
        "due_soon_24h",
        "due_soon_48h",
        "status_change",
        "high_priority_unassigned"
      ],
      "description": "Trigger condition"
    },
    "conditions": {
      "type": "object",
      "description": "Extra condition filters (JSON: status, priority, type)"
    },
    "action": {
      "type": "string",
      "enum": [
        "send_email",
        "escalate_priority",
        "send_notification",
        "change_status"
      ],
      "description": "Action to execute"
    },
    "action_config": {
      "type": "object",
      "description": "Action parameters (JSON: email_to, new_priority, new_status, message)"
    },
    "last_run_at": {
      "type": "string",
      "format": "date-time",
      "description": "Last execution timestamp"
    },
    "run_count": {
      "type": "number",
      "default": 0,
      "description": "Total executions"
    }
  },
  "required": [
    "name",
    "trigger",
    "action"
  ]
}