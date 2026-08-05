/**
 * 本文ブロックの並びを描く共通部分。
 *
 * 紙面の構造（ページめくり / スクロール）はレイアウト側の責任で、
 * 個々のブロックをどう描くかはどちらでも同じなのでここにまとめる。
 */

import { Diagram } from "../components/Diagram";
import { Markdown } from "../components/Markdown";
import { QuizCard } from "../components/QuizCard";
import { useBookStore } from "../store/bookStore";
import type { ContentBlock } from "../types/book";

export function BlockList({ blocks }: { blocks: ContentBlock[] }) {
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);

  return (
    <>
      {blocks.map((block) => {
        if (block.type === "diagram" && block.diagram) {
          return (
            <div key={block.id} className="block block--diagram">
              <Diagram diagram={block.diagram} />
            </div>
          );
        }

        if (block.type === "quiz" && block.quiz) {
          return (
            <div key={block.id} className="block block--quiz">
              <QuizCard block={block} />
            </div>
          );
        }

        return (
          <div key={block.id} className="block">
            <Markdown
              markdown={block.markdown}
              onNodeLink={(nodeId) => setCurrentNode(nodeId, "text")}
            />
          </div>
        );
      })}
    </>
  );
}
