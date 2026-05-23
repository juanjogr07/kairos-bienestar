import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function Home() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (useMock || !supabaseUrl || !supabaseKey) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
