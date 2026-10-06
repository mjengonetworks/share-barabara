import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

export function SafeAIRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; text: string }[] = [];
  const flush = () => {
    if (paragraph.length) { blocks.push(<p key={`p-${blocks.length}`}>{paragraph.join(" ").trim()}</p>); paragraph = []; }
    if (list.length) { const ordered = list[0].ordered; const List = ordered ? "ol" : "ul"; blocks.push(<List key={`l-${blocks.length}`} className="list-inside list-disc space-y-1">{list.map((item, index) => <li key={index}>{inline(item.text)}</li>)}</List>); list = []; }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) { flush(); blocks.push(<h3 key={`h-${blocks.length}`} className="font-bold">{inline(heading[1])}</h3>); continue; }
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const unordered = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ordered || unordered) { const item = ordered?.[1] ?? unordered?.[1] ?? ""; if (list.length && list[0].ordered !== !!ordered) flush(); list.push({ ordered: !!ordered, text: item }); continue; }
    if (trimmed.includes("|") && trimmed.split("|").length >= 3) { flush(); blocks.push(<p key={`t-${blocks.length}`} className="overflow-x-auto font-mono text-xs">{inline(trimmed)}</p>); continue; }
    paragraph.push(trimmed);
  }
  flush();
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
