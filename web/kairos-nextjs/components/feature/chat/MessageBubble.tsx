"use client";

import { Plus } from "lucide-react";
import { Button } from "@heroui/react";

import type { ChatMessage } from "./types";

interface MessageBubbleProps {
  msg: ChatMessage;
  onAddSuggestion?: (id: string) => void;
}

export function MessageBubble({ msg, onAddSuggestion }: MessageBubbleProps) {
  const isMe = msg.from === "me";
  return (
    <div
      className={`flex animate-fade-up ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-base leading-relaxed ${
          isMe
            ? "bg-bg-input text-text-primary"
            : "insight-border-left bg-bg-elevated pl-5 text-text-primary"
        }`}
        style={{
          borderBottomRightRadius: isMe ? 6 : undefined,
          borderBottomLeftRadius: !isMe ? 6 : undefined,
        }}
      >
        {!isMe && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-accent-secondary">
            Kairós
          </p>
        )}
        <p>{msg.text}</p>

        {msg.showSuggestion && (
          <Button
            size="sm"
            radius="md"
            variant="bordered"
            startContent={<Plus size={14} strokeWidth={2.5} />}
            onPress={() => onAddSuggestion?.(msg.id)}
            className="group mt-3 border-accent-primary bg-accent-primary/10 text-xs font-bold text-accent-primary data-[hover=true]:bg-accent-primary/20"
          >
            Agregar hábito sugerido
          </Button>
        )}
      </div>
    </div>
  );
}
