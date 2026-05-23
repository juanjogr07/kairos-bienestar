"use client";

import { Card, CardBody } from "@heroui/react";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  bg: string;
}

export function StatCard({ icon, value, label, color, bg }: StatCardProps) {
  return (
    <Card
      shadow="none"
      radius="lg"
      className="border border-border-subtle bg-bg-surface"
    >
      <CardBody className="flex flex-col items-center p-4 text-center">
        <div
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: bg }}
        >
          <span className={color}>{icon}</span>
        </div>
        <span className={`font-mono text-xl font-bold ${color}`}>{value}</span>
        <span className="mt-0.5 text-xs leading-tight text-text-secondary">
          {label}
        </span>
      </CardBody>
    </Card>
  );
}
