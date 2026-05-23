import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local, o activa " +
        "NEXT_PUBLIC_USE_MOCK=\"true\" para desarrollo offline."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // El método `setAll` se llama desde un Server Component sin acceso
          // de escritura a cookies. Esto es esperado y se puede ignorar
          // si hay un middleware que refresca la sesión del usuario.
        }
      },
    },
  });
}
