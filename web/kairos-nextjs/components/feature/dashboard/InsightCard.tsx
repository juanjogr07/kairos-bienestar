"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Card, CardBody } from "@heroui/react";

interface InsightCardProps {
  playbook: string;
  children: React.ReactNode;
  ctaHref: string;
  ctaLabel?: string;
}

/**
 * Card de insight diario (el "Kairós dice…" del dashboard).
 *
 * - `Card` de HeroUI sustituye al `<div>` manual con borde + gradiente.
 * - `Button as={Link}` sustituye al `<Link>` con estilos de botón hechos a mano.
 */
export function InsightCard({
  playbook,
  children,
  ctaHref,
  ctaLabel = "Habla con Kairós",
}: InsightCardProps) {
  return (
    <section
      className="mt-6 animate-fade-up"
      style={{ animationDelay: "200ms" }}
    >
      <Card
        shadow="none"
        radius="lg"
        className="insight-border-left overflow-hidden bg-gradient-card-alive"
      >
        <CardBody className="p-5 pl-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-secondary" />
            <span className="text-xs font-bold uppercase tracking-wider text-accent-secondary">
              Insight de hoy
            </span>
          </div>

          <div className="mt-3 text-base leading-relaxed text-text-primary">
            {children}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent-secondary" />
            Playbook activado:{" "}
            <span className="font-medium text-text-primary">{playbook}</span>
          </div>

          <Button
            as="a"
            href={ctaHref}
            variant="bordered"
            radius="md"
            size="md"
            endContent={
              <ArrowRight
                size={16}
                strokeWidth={2.5}
                className="transition-transform group-data-[hover=true]:translate-x-0.5"
              />
            }
            className="group mt-5 border-accent-secondary bg-accent-secondary/10 font-bold text-accent-secondary data-[hover=true]:bg-accent-secondary/20"
          >
            {ctaLabel}
          </Button>
        </CardBody>
      </Card>
    </section>
  );
}
