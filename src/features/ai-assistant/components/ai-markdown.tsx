import { Fragment, type ReactNode } from "react";

// Minimal Markdown for assistant replies: headings, paragraphs, lists, quotes, fenced code, **bold**,
// *italic* and `code`. It only ever creates React elements (no HTML injection, no links), which is
// all the system prompt asks the model to produce.

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\s][^*\n]*\*)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyBase}-${index}`;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={key} dir="ltr">{part.slice(1, -1)}</code>;
    if (part.length > 4 && ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function withBreaks(lines: string[], keyBase: string): ReactNode[] {
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [<br key={`${keyBase}-br-${index}`} />] : []),
    ...inline(line, `${keyBase}-${index}`),
  ]);
}

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*```\s*([\w+-]*)\s*$/;

export function AiMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const key = `b${index}`;
    const fence = line.match(FENCE);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !FENCE.test(lines[index])) code.push(lines[index++]);
      index += 1; // closing fence (or end of a still-streaming reply)
      blocks.push(
        <pre key={key} dir="ltr" data-language={fence[1] || undefined}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      blocks.push(<p key={key} className="md-heading">{inline(heading[2], key)}</p>);
      index += 1;
      continue;
    }
    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const pattern = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].replace(pattern, ""));
      const children = items.map((item, i) => <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>);
      blocks.push(ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>);
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}>{withBreaks(quote, key)}</blockquote>);
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !FENCE.test(lines[index]) &&
      !HEADING.test(lines[index]) &&
      !BULLET.test(lines[index]) &&
      !NUMBERED.test(lines[index]) &&
      !lines[index].startsWith(">")
    )
      paragraph.push(lines[index++]);
    blocks.push(<p key={key}>{withBreaks(paragraph, key)}</p>);
  }
  return <>{blocks}</>;
}
