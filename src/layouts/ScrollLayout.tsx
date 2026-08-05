/**
 * 紙面の構造 C: 縦スクロール。図は本文の流れの中に置く。
 *
 * ページ分割の難しさがなく、スマホとの相性も良い。ただし「本を読む」というより
 * 記事を読む感覚に近い。将棋MAP の記事レイアウトがこの形にあたる。
 */

import { useState } from "react";
import { BlockList, firstDiagram } from "./BlockList";
import { MainDiagram } from "../components/Diagram";
import { useBookStore } from "../store/bookStore";
import type { Diagram as DiagramData } from "../types/book";

export function ScrollLayout() {
  const chapter = useBookStore((state) => state.chapter)();
  const diagramBehavior = useBookStore((state) => state.diagramBehavior);
  const [main, setMain] = useState<DiagramData | null>(null);

  const pageMain = diagramBehavior === "page-main";
  const currentMain = pageMain ? (main ?? firstDiagram(chapter.blocks)) : null;

  return (
    <div className="layout layout--scroll">
      {currentMain && (
        <div className="layout-main-diagram layout-main-diagram--sticky">
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
  );
}
