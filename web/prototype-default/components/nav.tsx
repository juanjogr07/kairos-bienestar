"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
  { href: "/habits", label: "Hábitos" },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-blue-700">Kairós</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm ${
              pathname === l.href ? "text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
        Salir
      </button>
    </nav>
  )
}
