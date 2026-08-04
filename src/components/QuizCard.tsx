/**
 * 次の一手（問題）カード（要件定義書 F-5）。
 *
 * 判定の仕組み:
 *   出題局面（block.nodeId）を親に持つノードに現在位置が移ったとき、そのノードの
 *   指し手を解答とみなして判定する。つまり読者は専用の入力欄ではなく、
 *   いつもの盤面でそのまま指せばよい（F-5-3）。
 *
 * 未実装（第二版以降）:
 *   - 複数手順の解答（F-5-5。詰将棋で必要）
 *   - 成績記録と間隔反復（F-5-7 / F-5-8）
 */

import { useState } from "react";
import { useBookStore } from "../store/bookStore";
import { findParent, formatNodeMove } from "../shogi/tree";
import { Markdown } from "./Markdown";
import type { ContentBlock } from "../types/book";

type Judgement =
  | { kind: "waiting" }
  | { kind: "correct"; moveText: string }
  | { kind: "wrong"; moveText: string; comment?: string };

export function QuizCard({ block }: { block: ContentBlock }) {
  const [revealed, setRevealed] = useState(false);
  const tree = useBookStore((state) => state.chapter().tree);
  const currentNodeId = useBookStore((state) => state.currentNodeId);
  const currentNode = useBookStore((state) => state.currentNode)();
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);

  const quiz = block.quiz;
  if (!quiz || !block.nodeId) return null;

  const parent = findParent(tree, currentNodeId);
  const judgement: Judgement =
    parent && parent.id === block.nodeId && currentNode.usi
      ? judge(currentNode.usi, formatNodeMove(parent, currentNode))
      : { kind: "waiting" };

  function judge(usi: string, moveText: string): Judgement {
    if (!quiz) return { kind: "waiting" };
    if (quiz.acceptableFirstMoves.includes(usi)) {
      return { kind: "correct", moveText };
    }
    return { kind: "wrong", moveText, comment: quiz.wrongMoveComments?.[usi] };
  }

  return (
    <div className="quiz" onClick={(event) => event.stopPropagation()}>
      <div className="quiz-header">
        <span className="quiz-badge">次の一手</span>
        <button
          type="button"
          className="quiz-goto"
          onClick={() => block.nodeId && setCurrentNode(block.nodeId, "text")}
        >
          出題局面へ
        </button>
      </div>

      <Markdown markdown={block.markdown} />

      {judgement.kind === "waiting" && (
        <p className="quiz-hint">出題局面から盤面で手を指すと判定します。</p>
      )}

      {judgement.kind === "correct" && (
        <p className="quiz-result quiz-result--correct">
          正解 — {judgement.moveText}
        </p>
      )}

      {judgement.kind === "wrong" && (
        <div className="quiz-result quiz-result--wrong">
          <p>ちがいます — {judgement.moveText}</p>
          {judgement.comment && <p className="quiz-comment">{judgement.comment}</p>}
        </div>
      )}

      <button type="button" className="quiz-reveal" onClick={() => setRevealed(!revealed)}>
        {revealed ? "解説を隠す" : "解説を見る"}
      </button>
      {revealed && (
        <div className="quiz-explanation">
          <Markdown markdown={quiz.explanation} />
        </div>
      )}
    </div>
  );
}
