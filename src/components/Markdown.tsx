/**
 * 最小限の Markdown レンダラ。
 *
 * 本文は可搬性のため Markdown とする（要件定義書 F-4-7）が、ひな形の段階で
 * フル機能の Markdown ライブラリを入れると、記法の取捨選択を先に固定してしまう。
 * ここでは見出し・段落・強調と、指し手リンクだけを扱う。
 *
 * 指し手リンク（F-2-5）:
 *   `[▲2五歩](node:NODE_ID)` と書くと、その局面へジャンプするリンクになる。
 *   本文中の指し手表記を自動検出してリンク化する案もあるが、同一表記が複数の
 *   ノードに対応しうるため、明示的な参照を持つこの形を採る。
 */

import type { ReactNode } from "react";

const NODE_LINK = /\[([^\]]+)\]\(node:([^)]+)\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;

export type MarkdownProps = {
  markdown: string;
  onNodeLink?: (nodeId: string) => void;
};

export function Markdown({ markdown, onNodeLink }: MarkdownProps) {
  const paragraphs = markdown.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((paragraph, index) => {
        const trimmed = paragraph.trim();
        if (trimmed.startsWith("### ")) {
          return <h3 key={index}>{renderInline(trimmed.slice(4), onNodeLink)}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={index}>{renderInline(trimmed.slice(3), onNodeLink)}</h2>;
        }
        return <p key={index}>{renderInline(trimmed, onNodeLink)}</p>;
      })}
    </>
  );
}

function renderInline(text: string, onNodeLink?: (nodeId: string) => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  NODE_LINK.lastIndex = 0;
  let match = NODE_LINK.exec(text);
  while (match) {
    if (match.index > cursor) {
      nodes.push(...renderBold(text.slice(cursor, match.index), key));
      key += 1;
    }
    const [, label, nodeId] = match;
    nodes.push(
      <button
        key={`link-${key++}`}
        type="button"
        className="move-link"
        onClick={(event) => {
          event.stopPropagation();
          onNodeLink?.(nodeId);
        }}
      >
        {label}
      </button>,
    );
    cursor = match.index + match[0].length;
    match = NODE_LINK.exec(text);
  }

  if (cursor < text.length) {
    nodes.push(...renderBold(text.slice(cursor), key));
  }
  return nodes;
}

function renderBold(text: string, keyBase: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  BOLD.lastIndex = 0;
  let match = BOLD.exec(text);
  while (match) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    nodes.push(<strong key={`b-${keyBase}-${key++}`}>{match[1]}</strong>);
    cursor = match.index + match[0].length;
    match = BOLD.exec(text);
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}
