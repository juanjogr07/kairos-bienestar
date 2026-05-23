import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso en el navegador (Client Components).
 *
 * Lee las credenciales desde:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Mientras el backend (API & Connections) no haya provisionado el proyecto
 * Supabase, las variables pueden estar vacías. En ese caso, el modo mock
 * (NEXT_PUBLIC_USE_MOCK="true") debe usarse para evitar llamadas reales.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local, o activa " +
        "NEXT_PUBLIC_USE_MOCK=\"true\" para desarrollo offline."
    );
  }

  return createBrowserClient(url, anonKey);
}
