"use client";

import Link from "next/link";
import { Phone, Heart, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function CrisisPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-5 py-10">
      <div className="w-full max-w-md text-center page-enter">
        <div className="mx-auto mb-8 flex justify-center">
          <Logo size={28} />
        </div>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(123,111,240,0.15)]">
          <Heart size={36} className="text-accent-secondary" strokeWidth={2} />
        </div>

        <h1 className="text-xl font-bold text-text-primary">
          Queremos que estés bien.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          Tus respuestas nos indican que estás pasando por un momento difícil.
          Te conectamos con apoyo profesional gratuito, disponible ahora mismo.
        </p>

        <a
          href="tel:106"
          className="mt-8 flex items-center justify-center gap-3 rounded-lg border border-accent-secondary bg-[rgba(123,111,240,0.12)] px-6 py-4 transition-all hover:bg-[rgba(123,111,240,0.2)]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-secondary">
            <Phone size={20} className="text-bg-deep" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Línea Nacional de Salud Mental
            </p>
            <p className="font-mono text-2xl font-bold text-accent-secondary">
              106
            </p>
            <p className="text-xs text-text-secondary">Gratuita · 24/7 · Confidencial</p>
          </div>
        </a>

        <p className="mt-6 text-sm text-text-secondary">
          Hemos guardado tu información para cuando estés listo/a para continuar.
        </p>

        <Link
          href="/dashboard"
          className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Ir al dashboard cuando estés listo/a
          <ArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </main>
  );
}
