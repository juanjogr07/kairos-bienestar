"""Rate limiter compartido para agent-service.

Se importa tanto en main.py como en routers/chat.py para evitar
dependencias circulares.

El `key_func` resuelve la identidad del solicitante a partir del JWT del
header `Authorization: Bearer <token>` para que el límite (`20/hour`) se
aplique **por usuario**, no por IP — así dos usuarios detrás del mismo
NAT no comparten cubo y rotar IP no evade el límite.
"""

from __future__ import annotations

import base64
import json
from typing import Optional

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _decode_jwt_sub(token: str) -> Optional[str]:
    """Decodifica el payload de un JWT (sin verificar firma) y devuelve `sub`.

    La verificación de firma ya la hace `auth.get_current_user` en el
    endpoint; aquí solo necesitamos identificar al usuario para el bucket
    del rate limit. Si el token está malformado, devolvemos None y el
    caller hace fallback a IP.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # base64url puede venir sin padding — añadirlo
        padding = "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
        sub = payload.get("sub")
        return str(sub) if sub else None
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def get_user_key(request: Request) -> str:
    """Key function para slowapi: user_id del JWT, con fallback a IP."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        sub = _decode_jwt_sub(token)
        if sub:
            return f"user:{sub}"
    # Fallback: peticiones sin JWT válido cuentan por IP
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_user_key)
