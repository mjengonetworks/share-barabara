import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUp, Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { publicAIChat, quickAISummary } from "@/lib/ai/public.functions";
import { aiReturnTo, focusAISurface } from "@/lib/ai/return-to-ai";
import type { PublicContextType, PublicAIResult } from "@/lib/ai/types";

const callQuickAISummary = quickAISummary as unknown as (args: { data: unknown }) => Promise<PublicAIResult>;
const callPublicAIChat = publicAIChat as unknown as (args: { data: unknown }) => Promise<PublicAIResult & { threadId?: string }>;

type Message = { role: "user" | "assistant"; content: string; citations?: PublicAIResult["citations"] };
type Props = {
  contextType: Exclude<PublicContextType, "general">;
  contextId: string;
  title?: string;
  mode?: "summary" | "chat";
  sourceText?: string;
};

function Answer({ message }: { message: Message }) {
  return (
    <div className={message.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-accent/20 p-3 text-sm" : "max-w-[92%] rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 p-4 text-sm"}>
      {message.role === "assistant" ? <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest text-accent">SHARE BARABARA AI</p> : null}
      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
      {message.citations?.length ? (
        <div className="mt-3 border-t border-primary-foreground/20 pt-2 text-xs">
          <p className="font-semibold">External sources</p>
          {message.citations.map((citation) => <a key={citation.id} href={citation.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-accent underline">[{citation.id}] {citation.title}</a>)}
        </div>
      ) : null}
    </div>
  );
}

function Composer({ value, onChange, onSend, busy, placeholder }: { value: string; onChange: (value: string) => void; onSend: () => void; busy: boolean; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function resize() {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 112)}px`;
  }
  return (
    <div className="flex items-end gap-2 rounded-lg border border-primary-foreground/25 bg-primary-foreground/10 p-1.5 focus-within:border-accent/80">
      <Textarea
        ref={ref}
        value={value}
        onChange={(event) => { onChange(event.target.value.slice(0, 2000)); resize(); }}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }}
        placeholder={placeholder}
        rows={1}
        className="min-h-10 max-h-28 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2 text-primary-foreground shadow-none placeholder:text-primary-foreground/55 focus-visible:ring-0"
      />
      <Button type="button" size="icon" onClick={onSend} disabled={busy || !value.trim()} aria-label="Send message" className="size-10 shrink-0 rounded-md border border-accent bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}

function errorText(result: PublicAIResult) {
  if (result.error === "not_configured") return "Share Barabara AI is not configured yet.";
  if (result.error === "external_search_unavailable") return "Share Barabara could not check outside sources right now. Please try again later.";
  if (result.error === "external_search_rate_limited") return "Please wait a moment before asking Share Barabara AI again.";
  return "There is not enough supported information to answer safely.";
}

export function ShareBarabaraAI({ contextType, contextId, title, mode = "summary", sourceText }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PublicAIResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [threadId, setThreadId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => focusAISurface("share-barabara-ai"), []);

  async function summarize() {
    setBusy(true); setError(null);
    try { setSummary(await callQuickAISummary({ data: { message: title ?? "Summarize this content", contextType, contextId, ...(sourceText ? { sourceText } : {}) } })); }
    catch { setError("Share Barabara AI is temporarily unavailable."); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!user || !message.trim() || busy) return;
    const next = message.trim(); setMessage(""); setMessages((items) => [...items, { role: "user", content: next }]); setBusy(true); setError(null);
    try {
      const result = await callPublicAIChat({ data: { message: next, contextType, contextId, threadId, history: messages } });
      if (result.threadId) setThreadId(result.threadId);
      if (result.answer) setMessages((items) => [...items, { role: "assistant", content: result.answer!, citations: result.citations }]);
      else setError(errorText(result));
    } catch { setError("Share Barabara AI is temporarily unavailable."); }
    finally { setBusy(false); }
  }
  const summaryAvailable = mode === "summary" && summary?.ok && summary.answer;
  return (
    <section id="share-barabara-ai" className="mt-8 rounded-xl border border-primary bg-primary p-5 text-primary-foreground shadow-sm" aria-label="Share Barabara AI">
      <div className="flex items-center gap-2"><Bot className="size-5 text-accent" /><p className="text-xs font-bold uppercase tracking-widest text-accent">SHARE BARABARA AI</p></div>
      {mode === "chat" ? <p className="mt-2 text-sm text-primary-foreground/80">Chat with Share Barabara AI about this alert.</p> : null}
      {mode === "summary" && !summary ? <Button className="mt-4 border-accent/70 bg-transparent text-primary-foreground hover:bg-accent hover:text-accent-foreground" variant="outline" onClick={summarize} disabled={busy}><Sparkles className="mr-2 size-4" />{busy ? "Preparing summary…" : "Quick AI Summary"}</Button> : null}
      {mode === "summary" && summary ? (summaryAvailable ? <div className="mt-4 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 p-4"><p className="whitespace-pre-wrap text-sm leading-relaxed">{summary.answer}</p></div> : <p className="mt-4 text-sm text-primary-foreground/75">{errorText(summary)}</p>) : null}
      {mode === "chat" || summaryAvailable ? (
        user ? <div className="mt-5 space-y-3">{messages.map((item, index) => <Answer key={`${item.role}-${index}`} message={item} />)}<Composer value={message} onChange={setMessage} onSend={() => void send()} busy={busy} placeholder="Ask Share Barabara AI…" /></div> : <p className="mt-4 text-sm text-primary-foreground/75"><Link className="font-semibold text-accent underline" to="/auth" search={{ returnTo: aiReturnTo("content") }}>Sign in to Chat</Link>{" "}to continue with Share Barabara AI.</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {busy ? <Loader2 className="mt-3 size-4 animate-spin text-accent" /> : null}
    </section>
  );
}

export function HeaderShareBarabaraAI() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublicAIResult | null>(null);
  useEffect(() => { if (window.location.hash === "#header-share-barabara-ai") setOpen(true); focusAISurface("header-share-barabara-ai"); }, []);
  async function send() {
    if (!user || !message.trim() || busy) return;
    const next = message.trim(); setMessage(""); setMessages((items) => [...items, { role: "user", content: next }]); setBusy(true);
    try {
      const response = await callPublicAIChat({ data: { message: next, contextType: "general", threadId, history: messages } });
      if (response.threadId) setThreadId(response.threadId);
      setResult(response);
      if (response.answer) setMessages((items) => [...items, { role: "assistant", content: response.answer!, citations: response.citations }]);
    } catch { setResult({ ok: false, error: "provider_unavailable", provenance: "none", citations: [], evidence: [] }); }
    finally { setBusy(false); }
  }
  return <div id="header-share-barabara-ai" className="relative">
    <Button variant="outline" size="icon" onClick={() => setOpen((value) => !value)} aria-label="Share Barabara AI" title="Share Barabara AI"><Sparkles className="size-4" /></Button>
    {open ? <div className="absolute right-0 top-11 z-50 w-[min(92vw,26rem)] rounded-xl border border-primary bg-primary p-4 text-primary-foreground shadow-xl">
      <p className="text-xs font-bold uppercase tracking-widest text-accent">SHARE BARABARA AI</p><p className="mt-1 text-sm text-primary-foreground/75">Ask about public Share Barabara content.</p>
      {user ? <><div className="mt-3 space-y-3">{messages.map((item, index) => <Answer key={`${item.role}-${index}`} message={item} />)}</div><div className="mt-3"><Composer value={message} onChange={setMessage} onSend={() => void send()} busy={busy} placeholder="Ask a question…" /></div></> : <p className="mt-4 text-sm text-primary-foreground/80"><Link className="font-semibold text-accent underline" to="/auth" search={{ returnTo: aiReturnTo("header") }}>Sign in to Chat</Link>{" "}to start a conversation.</p>}
      {result && !result.answer ? <p className="mt-3 text-sm text-primary-foreground/75">{errorText(result)}</p> : null}{busy ? <Loader2 className="mt-3 size-4 animate-spin text-accent" /> : null}
    </div> : null}
  </div>;
}
