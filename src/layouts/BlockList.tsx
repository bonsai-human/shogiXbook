/**
 * 本文ブロックの並びを描く共通部分。
 *
 * 紙面の構造（ページめくり / 章＝ページ / スクロール）はレイアウト側の責任で、
 * 個々のブロックをどう描くかはどの構造でも同じなのでここにまとめる。
 */

import { Diagram } from "../components/Diagram";
import { Markdown } from "../components/Markdown";
import { QuizCard } from "../components/QuizCard";
import { useBookStore } from "../store/bookStore";
import type { ContentBlock, Diagram as DiagramData } from "../types/book";

export type BlockListProps = {
  blocks: ContentBlock[];
  /** page-main のとき、主図の差し替え要求を受ける。 */
  onRequestMain?: (diagram: DiagramData) => void;
  /** page-main のとき、いま主図になっている図。 */
  currentMain?: DiagramData | null;
};

export function BlockList({ blocks, onRequestMain, currentMain }: BlockListProps) {
  const diagramBehavior = useBookStore((state) => state.diagramBehavior);
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);

  return (
    <>
      {blocks.map((block) => {
        if (block.type === "diagram" && block.diagram) {
          return (
            <div key={block.id} className="block block--diagram">
              <Diagram
                diagram={block.diagram}
                behaviorOverride={diagramBehavior}
                onRequestMain={onRequestMain}
                isCurrentMain={currentMain?.fromNodeId === block.diagram.fromNodeId}
              />
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

/** ブロック列から最初の図面を取り出す（page-main の初期主図に使う）。 */
export function firstDiagram(blocks: ContentBlock[]): DiagramData | null {
  for (const block of blocks) {
    if (block.type === "diagram" && block.diagram) return block.diagram;
  }
  return null;
}
