export type MessageSender = "me" | "kairos";

export interface ChatMessage {
  id: string;
  from: MessageSender;
  text: string;
  showSuggestion?: boolean;
}
