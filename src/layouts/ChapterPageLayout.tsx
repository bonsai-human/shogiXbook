/**
 * 紙面の構造 B: 章＝ページ。章内はスクロールする。
 *
 * 「ページをめくって次へ進む」感覚を残しつつ、内容量に応じた再分割（リフロー）が
 * 要らないので実装が軽い。ページの区切りは著者が章を切った位置になる。
 */

import { useState } from "react";
import { BlockList, firstDiagram } from "./BlockList";
import { MainDiagram } from "../components/Diagram";
import { useBookStore } from "../store/bookStore";
import type { Diagram as DiagramData } from "../types/book";

export function ChapterPageLayout() {
  const book = useBookStore((state) => state.book);
  const chapterIndex = useBookStore((state) => state.chapterIndex);
  const setChapter = useBookStore((state) => state.setChapter);
  const chapter = useBookStore((state) => state.chapter)();
  const diagramBehavior = useBookStore((state) => state.diagramBehavior);
  const [main, setMain] = useState<DiagramData | null>(null);

  const pageMain = diagramBehavior === "page-main";
  const currentMain = pageMain ? (main ?? firstDiagram(chapter.blocks)) : null;

  const hasPrev = chapterIndex > 0;
  const hasNext = chapterIndex < book.chapters.length - 1;

  function go(delta: number) {
    setMain(null);
    setChapter(chapterIndex + delta);
  }

  return (
    <div className="layout layout--chapter-page">
      <div className="page-sheet">
        {currentMain && (
          <div className="layout-main-diagram">
            <MainDiagram diagram={currentMain} />
          </div>
        )}
        <div className="layout-flow">
          <h2 className="chapter-title">{chapter.title}</h2>
          <BlockList
            blocks={chapter.blocks}
            onRequestMain={setMain}
            currentMain={currentMain}
          />
        </div>
      </div>

      <nav className="page-nav" aria-label="ページ送り">
        <button type="button" onClick={() => go(-1)} disabled={!hasPrev}>
          ◀ 前の章
        </button>
        <span className="page-indicator">
          {chapterIndex + 1} / {book.chapters.length}
        </span>
        <button type="button" onClick={() => go(1)} disabled={!hasNext}>
          次の章 ▶
        </button>
      </nav>
    </div>
  );
}
