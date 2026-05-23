/**
 * Catálogo centralizado de errores de autenticación.
 *
 * Aquí vive TODA la lógica de:
 *   - Reglas de validación local (longitud de contraseña, formato de email).
 *   - Mensajes user-facing en español por código de error de Supabase Auth.
 *   - Mensajes user-facing por pattern matching cuando no hay código.
 *
 * Si necesitas añadir un nuevo mensaje:
 *   1. Si Supabase devuelve un `code` específico → agrégalo a `AUTH_ERROR_BY_CODE`.
 *   2. Si solo viene en el `message` → agrega un patrón a `AUTH_ERROR_BY_PATTERN`.
 *   3. Si es una validación previa (cliente) → agrégalo en `AUTH_VALIDATION_MESSAGES`.
 *
 * Para cambiar reglas (longitud mínima de contraseña, regex de email, etc.)
 * edita `AUTH_VALIDATION_RULES`.
 */

// ──────────────────────────────────────────────────────────────────────
// Reglas de validación (configurables sin tocar lógica)
// ──────────────────────────────────────────────────────────────────────

export const AUTH_VALIDATION_RULES = {
  password: {
    /** Supabase exige >= 6 por defecto. Subir a 8+ cuando endurezcamos. */
    minLength: 6,
    /** bcrypt corta a 72 bytes; usamos el mismo tope para coherencia. */
    maxLength: 72,
  },
  email: {
    /** Validación pragmática (no RFC-perfecta) — el server hace la final. */
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
  },
} as const;

// ──────────────────────────────────────────────────────────────────────
// Mensajes de validación local
// ──────────────────────────────────────────────────────────────────────

export const AUTH_VALIDATION_MESSAGES = {
  emptyFields: "Email y contraseña son obligatorios.",
  emailRequired: "Ingresa tu email.",
  emailInvalid: "El email ingresado no es válido.",
  emailTooLong: `El email no puede superar los ${AUTH_VALIDATION_RULES.email.maxLength} caracteres.`,
  passwordRequired: "Ingresa tu contraseña.",
  passwordTooShort: `La contraseña debe tener al menos ${AUTH_VALIDATION_RULES.password.minLength} caracteres.`,
  passwordTooLong: `La contraseña no puede superar los ${AUTH_VALIDATION_RULES.password.maxLength} caracteres.`,
} as const;

// ──────────────────────────────────────────────────────────────────────
// Catálogo de errores de Supabase Auth
// ──────────────────────────────────────────────────────────────────────

export interface AuthErrorEntry {
  /** Mensaje user-facing en español. */
  message: string;
  /** Severidad — preparado para que la UI elija color/icono en el futuro. */
  severity?: "error" | "warning" | "info";
  /** Acción sugerida opcional (ej: "Reenviar correo de confirmación"). */
  action?: {
    label: string;
    target?: string;
  };
}

/**
 * Mensajes por código oficial de Supabase Auth (gotrue v2).
 * Referencia: https://supabase.com/docs/reference/javascript/auth-error-codes
 */
export const AUTH_ERROR_BY_CODE: Record<string, AuthErrorEntry> = {
  invalid_credentials: {
    message: "Email o contraseña incorrectos.",
    severity: "error",
  },
  email_not_confirmed: {
    message: "Aún no has confirmado tu email. Revisa tu bandeja de entrada.",
    severity: "warning",
  },
  user_already_exists: {
    message: "Ya existe una cuenta con este email. Intenta iniciar sesión.",
    severity: "warning",
  },
  email_address_already_exists: {
    message: "Ya existe una cuenta con este email. Intenta iniciar sesión.",
    severity: "warning",
  },
  user_not_found: {
    message: "No encontramos una cuenta con este email.",
    severity: "error",
  },
  weak_password: {
    message: `La contraseña es muy débil. Usa al menos ${AUTH_VALIDATION_RULES.password.minLength} caracteres con letras y números.`,
    severity: "error",
  },
  same_password: {
    message: "La nueva contraseña debe ser distinta a la anterior.",
    severity: "error",
  },
  over_email_send_rate_limit: {
    message: "Demasiados intentos. Espera unos minutos antes de reintentar.",
    severity: "warning",
  },
  over_request_rate_limit: {
    message: "Demasiados intentos. Espera unos minutos antes de reintentar.",
    severity: "warning",
  },
  validation_failed: {
    message: "Los datos ingresados no son válidos. Revísalos e intenta de nuevo.",
    severity: "error",
  },
  email_address_invalid: {
    message: "El email ingresado no es válido.",
    severity: "error",
  },
  signup_disabled: {
    message: "El registro está temporalmente deshabilitado. Vuelve más tarde.",
    severity: "warning",
  },
  email_provider_disabled: {
    message: "El registro con email no está habilitado en este momento.",
    severity: "warning",
  },
  otp_expired: {
    message: "El código expiró. Solicita uno nuevo.",
    severity: "warning",
  },
  otp_disabled: {
    message: "El acceso por código no está habilitado.",
    severity: "warning",
  },
  captcha_failed: {
    message: "La verificación de seguridad falló. Recarga la página e intenta de nuevo.",
    severity: "error",
  },
  session_not_found: {
    message: "Tu sesión expiró. Inicia sesión nuevamente.",
    severity: "warning",
  },
  session_expired: {
    message: "Tu sesión expiró. Inicia sesión nuevamente.",
    severity: "warning",
  },
};

/**
 * Patrones (regex) sobre el `message` cuando Supabase no provee `code`.
 * Importante: el orden importa — el primer match gana.
 */
export const AUTH_ERROR_BY_PATTERN: ReadonlyArray<{
  pattern: RegExp;
  entry: AuthErrorEntry;
}> = [
  { pattern: /invalid login credentials/i, entry: AUTH_ERROR_BY_CODE.invalid_credentials },
  { pattern: /email not confirmed/i, entry: AUTH_ERROR_BY_CODE.email_not_confirmed },
  { pattern: /already (registered|exists)/i, entry: AUTH_ERROR_BY_CODE.user_already_exists },
  { pattern: /password should be at least/i, entry: AUTH_ERROR_BY_CODE.weak_password },
  { pattern: /rate limit/i, entry: AUTH_ERROR_BY_CODE.over_request_rate_limit },
  { pattern: /invalid email/i, entry: AUTH_ERROR_BY_CODE.email_address_invalid },
  {
    pattern: /network|fetch failed|failed to fetch|networkerror/i,
    entry: {
      message: "No pudimos conectar con el servidor. Verifica tu conexión.",
      severity: "error",
    },
  },
  {
    pattern: /supabase no está configurado/i,
    entry: {
      message:
        "El backend de autenticación aún no está conectado. Activa el modo mock para continuar.",
      severity: "warning",
    },
  },
];

// ──────────────────────────────────────────────────────────────────────
// Fallback genérico
// ──────────────────────────────────────────────────────────────────────

export const AUTH_ERROR_FALLBACK: AuthErrorEntry = {
  message: "Ocurrió un error de autenticación. Intenta de nuevo.",
  severity: "error",
};

// ──────────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  /** Primer error encontrado. Para errores por campo, ver `fieldErrors`. */
  message?: string;
  /** Errores agrupados por campo para mostrar inline en el form. */
  fieldErrors?: Partial<Record<"email" | "password", string>>;
}

/**
 * Valida email + password antes de llamar a Supabase.
 * Devuelve un único mensaje + map por campo para que la UI pueda decidir
 * dónde renderizarlos.
 */
export function validateLoginInput(
  email: string,
  password: string
): ValidationResult {
  const fieldErrors: Partial<Record<"email" | "password", string>> = {};

  const trimmedEmail = email.trim();

  if (!trimmedEmail && !password) {
    return {
      valid: false,
      message: AUTH_VALIDATION_MESSAGES.emptyFields,
      fieldErrors: {
        email: AUTH_VALIDATION_MESSAGES.emailRequired,
        password: AUTH_VALIDATION_MESSAGES.passwordRequired,
      },
    };
  }

  if (!trimmedEmail) {
    fieldErrors.email = AUTH_VALIDATION_MESSAGES.emailRequired;
  } else if (trimmedEmail.length > AUTH_VALIDATION_RULES.email.maxLength) {
    fieldErrors.email = AUTH_VALIDATION_MESSAGES.emailTooLong;
  } else if (!AUTH_VALIDATION_RULES.email.pattern.test(trimmedEmail)) {
    fieldErrors.email = AUTH_VALIDATION_MESSAGES.emailInvalid;
  }

  if (!password) {
    fieldErrors.password = AUTH_VALIDATION_MESSAGES.passwordRequired;
  } else if (password.length < AUTH_VALIDATION_RULES.password.minLength) {
    fieldErrors.password = AUTH_VALIDATION_MESSAGES.passwordTooShort;
  } else if (password.length > AUTH_VALIDATION_RULES.password.maxLength) {
    fieldErrors.password = AUTH_VALIDATION_MESSAGES.passwordTooLong;
  }

  if (Object.keys(fieldErrors).length === 0) {
    return { valid: true };
  }

  return {
    valid: false,
    message: fieldErrors.email ?? fieldErrors.password,
    fieldErrors,
  };
}

/**
 * Convierte un error de Supabase Auth (o cualquier objeto con `message`)
 * a un mensaje user-facing en español.
 *
 * Estrategia (en orden):
 *   1. Match exacto por `error.code`.
 *   2. Match por patrón regex sobre `error.message`.
 *   3. Fallback genérico.
 */
export function humanizeAuthError(err: unknown): string {
  return resolveAuthError(err).message;
}

/**
 * Variante que devuelve el `AuthErrorEntry` completo, útil cuando la UI
 * quiere también severidad o una acción sugerida.
 */
export function resolveAuthError(err: unknown): AuthErrorEntry {
  if (!err || typeof err !== "object") {
    return AUTH_ERROR_FALLBACK;
  }

  const code =
    "code" in err && typeof (err as { code?: unknown }).code === "string"
      ? ((err as { code: string }).code as string)
      : "";
  const rawMessage =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? ((err as { message: string }).message as string).trim()
      : "";

  if (code && AUTH_ERROR_BY_CODE[code]) {
    return AUTH_ERROR_BY_CODE[code];
  }

  if (rawMessage) {
    const matched = AUTH_ERROR_BY_PATTERN.find(({ pattern }) =>
      pattern.test(rawMessage)
    );
    if (matched) return matched.entry;
  }

  return AUTH_ERROR_FALLBACK;
}
