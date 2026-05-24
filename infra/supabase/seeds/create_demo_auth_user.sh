#!/usr/bin/env bash
# create_demo_auth_user.sh — alternativa bash a create_demo_auth_user.ps1
# Uso: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... bash create_demo_auth_user.sh
#
# Argumentos opcionales (con defaults):
#   EMAIL       (default: demo@kairos.app)
#   PASSWORD    (default: KairosDemo123!)
#   DISPLAY_NAME (default: Usuario Demo Kairós)

set -euo pipefail

EMAIL="${EMAIL:-demo@kairos.app}"
PASSWORD="${PASSWORD:-KairosDemo123!}"
DISPLAY_NAME="${DISPLAY_NAME:-Usuario Demo Kairós}"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_KEY:-}" ]]; then
  echo "Error: faltan variables SUPABASE_URL y/o SUPABASE_SERVICE_KEY." >&2
  exit 1
fi

BASE_URL="${SUPABASE_URL%/}"
AUTH_HEADER="Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
APIKEY_HEADER="apikey: ${SUPABASE_SERVICE_KEY}"

# Verificar si el usuario ya existe
EXISTING=$(curl -s -X GET \
  "${BASE_URL}/auth/v1/admin/users?email=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "${EMAIL}")" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}")

EXISTING_ID=$(echo "${EXISTING}" | python3 -c "import json,sys; users=json.load(sys.stdin).get('users',[]); print(users[0]['id'] if users else '')" 2>/dev/null || true)

if [[ -n "${EXISTING_ID}" ]]; then
  echo "Usuario demo ya existe."
  echo "UUID: ${EXISTING_ID}"
  echo "Email: ${EMAIL}"
  exit 0
fi

# Crear el usuario
PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({
  'email': sys.argv[1],
  'password': sys.argv[2],
  'email_confirm': True,
  'user_metadata': {'full_name': sys.argv[3], 'role': 'demo'}
}))
" "${EMAIL}" "${PASSWORD}" "${DISPLAY_NAME}")

RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/auth/v1/admin/users" \
  -H "${AUTH_HEADER}" \
  -H "${APIKEY_HEADER}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

NEW_ID=$(echo "${RESPONSE}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id','ERROR'))")

if [[ "${NEW_ID}" == "ERROR" ]]; then
  echo "Error al crear usuario:" >&2
  echo "${RESPONSE}" >&2
  exit 1
fi

echo "Usuario demo creado correctamente."
echo "UUID: ${NEW_ID}"
echo "Email: ${EMAIL}"
echo ""
echo "Siguiente paso:"
echo "1) Reemplaza DEMO_USER_UUID en los seeds 003/004/005 con: ${NEW_ID}"
echo "2) Ejecuta esos SQL en Supabase SQL Editor"
