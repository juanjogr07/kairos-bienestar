import { createBrowserClient } from "@supabase/ssr";

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
