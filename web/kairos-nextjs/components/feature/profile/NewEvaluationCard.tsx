"use client";

import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardBody } from "@heroui/react";

export function NewEvaluationCard() {
  return (
    <section
      className="mt-6 animate-fade-up"
      style={{ animationDelay: "300ms" }}
    >
      <Card
        as={Link}
        href="/onboarding"
        shadow="none"
        radius="lg"
        isPressable
        className="group w-full border border-border-subtle bg-bg-surface transition-colors data-[hover=true]:border-border-active"
      >
        <CardBody className="flex flex-row items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary">
              <RefreshCw size={20} />
            </div>
            <div className="text-left">
              <p className="text-md font-bold text-text-primary">
                Hacer nueva evaluación
              </p>
              <p className="text-sm text-text-secondary">
                Repite PHQ-9 / GAD-7 cuando quieras
              </p>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-text-secondary transition-transform group-data-[hover=true]:translate-x-1"
          />
        </CardBody>
      </Card>
    </section>
  );
}
