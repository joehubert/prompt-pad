"use client";

import { useState } from "react";

export default function ChatInput({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-4">
      <input
        type="text"
        className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
        placeholder="Ask something..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  );
}
