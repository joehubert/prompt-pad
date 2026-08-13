"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatMessage } from "@/core/types";

export default function ChatHistory({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        Ask something to start a conversation.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
              msg.role === "user" ? "bg-accent text-white" : "border border-border bg-surface"
            }`}
          >
            <div className="prose-chat text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content || (msg.role === "assistant" ? "…" : "")}
              </ReactMarkdown>
            </div>
            {msg.meta && <div className="mt-1.5 text-xs opacity-70">{msg.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
