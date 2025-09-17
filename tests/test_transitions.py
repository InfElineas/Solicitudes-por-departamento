import os
import sys
import types

import pytest
from fastapi import HTTPException

# Configura las variables requeridas antes de importar el backend.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("DB_NAME", "test_db")

# Stubs mínimos de slowapi para evitar dependencias pesadas en los tests.
if "slowapi" not in sys.modules:
    slowapi_module = types.ModuleType("slowapi")

    class _DummyLimiter:  # pragma: no cover - solo utilizado para inicialización
        def __init__(self, *args, **kwargs):
            self.key_func = kwargs.get("key_func")
            self.enabled = kwargs.get("enabled", False)

        def limit(self, *args, **kwargs):  # pragma: no cover - decoración simulada
            def decorator(func):
                return func

            return decorator

    slowapi_module.Limiter = _DummyLimiter
    slowapi_module._rate_limit_exceeded_handler = lambda *args, **kwargs: None
    sys.modules["slowapi"] = slowapi_module

if "slowapi.util" not in sys.modules:
    util_module = types.ModuleType("slowapi.util")
    util_module.get_remote_address = lambda request: "test"  # pragma: no cover
    sys.modules["slowapi.util"] = util_module

if "slowapi.errors" not in sys.modules:
    errors_module = types.ModuleType("slowapi.errors")

    class _DummyRateLimitExceeded(Exception):
        pass

    errors_module.RateLimitExceeded = _DummyRateLimitExceeded
    sys.modules["slowapi.errors"] = errors_module

from backend.server import ALLOWED_TRANSITIONS, ensure_transition  # noqa: E402

ALL_STATUSES = set(ALLOWED_TRANSITIONS.keys()) | {
    status for allowed in ALLOWED_TRANSITIONS.values() for status in allowed
}


def test_allow_list_accepts_whitelisted_transitions():
    """Cada transición listada explícitamente debe ser aceptada."""
    for old_status, allowed_destinations in ALLOWED_TRANSITIONS.items():
        for new_status in allowed_destinations:
            ensure_transition(old_status, new_status)


def test_disallow_invalid_transitions():
    """Cualquier transición fuera de la lista blanca debe rechazarse con 400."""
    for old_status, allowed_destinations in ALLOWED_TRANSITIONS.items():
        forbidden = ALL_STATUSES - allowed_destinations
        for new_status in forbidden:
            expected_detail = f"Transición no permitida: {old_status} → {new_status}"
            with pytest.raises(HTTPException) as exc:
                ensure_transition(old_status, new_status)
            assert exc.value.status_code == 400
            assert exc.value.detail == expected_detail


def test_terminal_states_have_no_exits():
    """Los estados sin transiciones configuradas deben rechazar cualquier cambio."""
    terminal_states = [status for status, allowed in ALLOWED_TRANSITIONS.items() if not allowed]
    assert terminal_states, "Debe existir al menos un estado terminal en la configuración."
    for terminal in terminal_states:
        for candidate in ALL_STATUSES:
            expected_detail = f"Transición no permitida: {terminal} → {candidate}"
            with pytest.raises(HTTPException) as exc:
                ensure_transition(terminal, candidate)
            assert exc.value.status_code == 400
            assert exc.value.detail == expected_detail
