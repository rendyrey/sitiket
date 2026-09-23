import type { ReactNode } from "react";

/** Bare URLs the assistant writes (order pages, event pages). Trailing punctuation is trimmed off separately. */
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
/** WhatsApp-style bold: `*text*`. */
const BOLD_PATTERN = /\*([^*\n]+)\*/g;

/**
 * Splits a URL match into the link and any sentence punctuation glued to it.
 * @param raw - Example: `"https://sitiket.com/orders/7f3c)."`
 * @returns Example: `["https://sitiket.com/orders/7f3c", ")."]`
 */
const splitTrailingPunctuation = (raw: string): [string, string] => {
  const match = raw.match(/[).,!?:;]+$/);
  return match ? [raw.slice(0, -match[0].length), match[0]] : [raw, ""];
};

/**
 * Renders `*bold*` segments of one text run.
 * @param text - Example: `"Total *Rp150.000*"`
 * @param keyPrefix - React key prefix, unique per run
 */
const renderBold = (text: string, keyPrefix: string): ReactNode[] =>
  text.split(BOLD_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={`${keyPrefix}-b${index}`} className="font-black">
        {part}
      </strong>
    ) : (
      part
    ),
  );

/**
 * Renders links and bold inside one line.
 * @param line - Example: `"Upload bukti di https://sitiket.com/orders/7f3c ya"`
 * @param keyPrefix - React key prefix, unique per line
 */
const renderInline = (line: string, keyPrefix: string): ReactNode[] =>
  line.split(URL_PATTERN).flatMap((part, index): ReactNode[] => {
    if (index % 2 === 0) return renderBold(part, `${keyPrefix}-t${index}`);
    const [href, trailing] = splitTrailingPunctuation(part);
    return [
      <a
        key={`${keyPrefix}-a${index}`}
        href={href}
        className="font-bold underline decoration-2 underline-offset-2 [overflow-wrap:anywhere] hover:text-black"
      >
        {href.replace(/^https?:\/\//, "")}
      </a>,
      trailing,
    ];
  });

/**
 * The assistant's WhatsApp-style text as React: paragraphs, `- ` bullet
 * lists, `*bold*` and clickable links. No HTML is ever injected.
 *
 * @param props.text - raw reply. Example: `"Berikut eventnya:\n- *Jazz Night* — Sabtu"`
 */
export default function ChatMessageText({ text }: { text: string }) {
  /** Consecutive lines grouped into paragraphs and bullet lists. */
  const blocks: Array<{ kind: "p" | "ul"; lines: string[] }> = [];
  for (const line of text.split("\n")) {
    const kind = /^\s*[-•]\s+/.test(line) ? "ul" : "p";
    const content = kind === "ul" ? line.replace(/^\s*[-•]\s+/, "") : line;
    const last = blocks.at(-1);
    if (!line.trim()) {
      blocks.push({ kind: "p", lines: [] });
    } else if (last && last.kind === kind && last.lines.length > 0) {
      last.lines.push(content);
    } else {
      blocks.push({ kind, lines: [content] });
    }
  }

  return (
    <div className="space-y-2">
      {blocks
        .filter((block) => block.lines.length > 0)
        .map((block, blockIndex) =>
          block.kind === "ul" ? (
            <ul key={`ul${blockIndex}`} className="list-disc space-y-1 pl-5">
              {block.lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line, `ul${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ul>
          ) : (
            <p key={`p${blockIndex}`}>
              {block.lines.flatMap((line, lineIndex) => [
                ...(lineIndex > 0 ? [<br key={`br${lineIndex}`} />] : []),
                ...renderInline(line, `p${blockIndex}-${lineIndex}`),
              ])}
            </p>
          ),
        )}
    </div>
  );
}
