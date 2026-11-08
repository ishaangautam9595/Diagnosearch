"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, SendHorizontal } from "lucide-react";
import { sendChatAction } from "@/app/chat-actions";
import { cn } from "@/lib/utils";

export interface Msg { id: string; sender: "PATIENT" | "LAB"; body: string; createdAt: string }

const time = (iso: string) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/**
 * Chat between a patient and one laboratory. Polls every few seconds while the tab is visible
 * (no websocket server needed). `me` decides which side the user's own bubbles are on.
 */
export function ChatPanel({ requestId, laboratoryId, me, title, subtitle, canWriteInitially = true }: {
  requestId: string; laboratoryId: string; me: "PATIENT" | "LAB"; title: string; subtitle?: string; canWriteInitially?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [canWrite, setCanWrite] = useState(canWriteInitially);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const latest = useRef<string | undefined>(undefined);

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !ids.has(m.id));
      if (!add.length) return cur;
      const next = [...cur, ...add].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      latest.current = next[next.length - 1].createdAt;
      return next;
    });
  }, []);

  const poll = useCallback(async () => {
    const q = new URLSearchParams({ requestId, laboratoryId });
    if (latest.current) q.set("after", latest.current);
    try {
      const res = await fetch(`/api/chat?${q}`, { cache: "no-store" });
      if (res.status === 404) { setClosed(true); return; }
      if (!res.ok) return;
      const data = (await res.json()) as { messages: { id: string; sender: "PATIENT" | "LAB"; body: string; createdAt: string }[]; canWrite: boolean };
      merge(data.messages);
      setCanWrite(data.canWrite);
      setLoaded(true);
    } catch { /* offline: try again next tick */ }
  }, [requestId, laboratoryId, merge]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void poll();
    const t = setInterval(() => { if (document.visibilityState === "visible") void poll(); }, 4000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    const res = await sendChatAction(requestId, laboratoryId, body);
    setSending(false);
    if (res.ok) { setText(""); merge([res.message]); } else setError(res.error);
  };

  return (
    <div className="flex h-[32rem] flex-col overflow-hidden rounded-2xl border border-border bg-white" data-testid="chat-panel">
      <div className="border-b border-border bg-mint-soft px-4 py-3">
        <p className="font-semibold">{title}</p>
        {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-background p-4" role="log" aria-live="polite" aria-label="Messages">
        {closed ? <p className="rounded-xl bg-white p-4 text-center text-sm text-muted">This conversation is no longer available.</p> : null}
        {!closed && loaded && messages.length === 0 ? <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello and ask anything about the offer.</p> : null}
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-md bg-primary-dark text-white" : "rounded-bl-md border border-border bg-white")}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-white/75" : "text-muted")}>{time(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {canWrite && !closed ? (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-border p-3">
          {error ? <p role="alert" className="mb-2 text-xs font-medium text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} aria-label="Type a message" placeholder="Type a message…"
              className="h-11 flex-1 rounded-xl border border-border px-3.5 text-sm focus-visible:border-primary-dark" />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Send message"
              className="grid size-11 cursor-pointer place-items-center rounded-xl bg-primary-dark text-white hover:brightness-90 disabled:opacity-50"><SendHorizontal className="size-4" /></button>
          </div>
        </form>
      ) : (
        <p className="flex items-center justify-center gap-1.5 border-t border-border bg-mint-soft p-3 text-xs text-muted"><Lock className="size-3.5" /> This conversation is closed.</p>
      )}
    </div>
  );
}
