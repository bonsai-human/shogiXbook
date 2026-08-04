/**
 * 分岐ツリー表示（要件定義書 F-3-2）。
 *
 * 現状は木をそのまま入れ子で描く単純な実装。定跡書の実データでは分岐が深く多いため、
 * このままでは画面を溢れさせる（R-9）。「全体を俯瞰する図」と「現在地周辺だけを
 * 示す簡易表示」の 2 段構えが必要になる見込みで、そこは UI 設計フェーズで詰める。
 */

import { useBookStore } from "../store/bookStore";
import { formatNodeMove } from "../shogi/tree";
import type { MoveNode } from "../types/book";

export function MoveTreeView() {
  const tree = useBookStore((state) => state.chapter().tree);
  const currentNodeId = useBookStore((state) => state.currentNodeId);
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);
  useBookStore((state) => state.revision); // 木の破壊的更新を検知するため購読する

  return (
    <div className="tree">
      <button
        type="button"
        className={`tree-node tree-node--root${
          currentNodeId === tree.id ? " tree-node--current" : ""
        }`}
        onClick={() => setCurrentNode(tree.id, "tree")}
      >
        開始局面
      </button>
      {tree.children.length > 0 && (
        <Line start={tree.children[0]} parent={tree} ply={1} />
      )}
      <Variations parent={tree} ply={1} />
    </div>
  );
}

/**
 * 一続きの手順（先頭の子を辿った本筋）を横並びで描き、
 * 途中で分かれる変化をその位置に入れ子で差し込む。
 *
 * @param start この手順の先頭ノード
 * @param parent start の親（指し手の日本語表記に直前の局面が要るため）
 * @param ply start の手数
 */
function Line({
  start,
  parent,
  ply,
}: {
  start: MoveNode;
  parent: MoveNode;
  ply: number;
}) {
  const currentNodeId = useBookStore((state) => state.currentNodeId);
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);

  const steps: { node: MoveNode; parent: MoveNode; ply: number }[] = [];
  let stepParent = parent;
  let node: MoveNode | undefined = start;
  let stepPly = ply;
  while (node) {
    steps.push({ node, parent: stepParent, ply: stepPly });
    if (node.children.length === 0) break;
    stepParent = node;
    node = node.children[0];
    stepPly += 1;
  }

  return (
    <>
      <div className="tree-line">
        {steps.map((step) => (
          <button
            key={step.node.id}
            type="button"
            className={`tree-node${
              step.node.id === currentNodeId ? " tree-node--current" : ""
            }`}
            onClick={() => setCurrentNode(step.node.id, "tree")}
            title={`${step.ply}手目`}
          >
            {formatNodeMove(step.parent, step.node)}
          </button>
        ))}
      </div>
      {steps.map((step) => (
        <Variations key={`v-${step.node.id}`} parent={step.node} ply={step.ply + 1} />
      ))}
    </>
  );
}

/** 指定ノードの 2 番目以降の子（＝変化）を描く。 */
function Variations({ parent, ply }: { parent: MoveNode; ply: number }) {
  if (parent.children.length < 2) return null;
  return (
    <>
      {parent.children.slice(1).map((alternative) => (
        <div key={alternative.id} className="tree-variation">
          <span className="tree-variation-label">
            {alternative.label ?? `変化（${ply}手目）`}
          </span>
          <Line start={alternative} parent={parent} ply={ply} />
        </div>
      ))}
    </>
  );
}
