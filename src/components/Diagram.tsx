/**
 * 本文中の図面。
 *
 * 「棋書らしさ」の要は、盤が別ペインに固定されているのではなく、図が本文の流れの
 * 中に組まれていることにある。このコンポーネントがその図にあたる。
 *
 * 振る舞いは 3 種類あり、どれを既定にするかは実物を見比べて決める段階なので、
 * すべて実装して切り替えられるようにしてある（DiagramBehavior 参照）。
 */

import { useEffect, useState } from "react";
import { ShogiPlayerBoard } from "../board/ShogiPlayerBoard";
import { formatNodeMove, pathBetween } from "../shogi/tree";
import { positionFromPath } from "../shogi/usi";
import { useBookStore } from "../store/bookStore";
import type { Diagram as DiagramData, MoveNode } from "../types/book";

export type DiagramProps = {
  diagram: DiagramData;
  /** 一括切り替え用。指定があればこちらを優先する。 */
  behaviorOverride?: DiagramData["behavior"] | null;
  /** page-main のとき、この図を主図にする要求を親へ伝える。 */
  onRequestMain?: (diagram: DiagramData) => void;
  /** page-main のとき、いまこの図が主図として選ばれているか。 */
  isCurrentMain?: boolean;
};

/** 図が示す手順（開始局面から終了局面まで）を解決する。 */
export function useDiagramPath(diagram: DiagramData): MoveNode[] | null {
  const tree = useBookStore((state) => state.chapter().tree);
  useBookStore((state) => state.revision);
  const toId = diagram.toNodeId ?? diagram.fromNodeId;
  return pathBetween(tree, diagram.fromNodeId, toId);
}

export function Diagram({
  diagram,
  behaviorOverride,
  onRequestMain,
  isCurrentMain,
}: DiagramProps) {
  const path = useDiagramPath(diagram);
  const behavior = behaviorOverride ?? diagram.behavior;

  if (!path) {
    return <div className="diagram diagram--error">図面の局面が見つかりません。</div>;
  }

  if (behavior === "page-main") {
    return (
      <MainDiagramChip
        diagram={diagram}
        active={Boolean(isCurrentMain)}
        onSelect={() => onRequestMain?.(diagram)}
      />
    );
  }

  if (behavior === "static") {
    return <StaticDiagram diagram={diagram} path={path} />;
  }

  return <PlayableDiagram diagram={diagram} path={path} />;
}

/**
 * 振る舞い①: 図ごとに手順を持ち、その場で進められる。
 * 本文を読みながら「この手順を目で追う」ことがページを離れずにできる。
 */
function PlayableDiagram({
  diagram,
  path,
}: {
  diagram: DiagramData;
  path: MoveNode[];
}) {
  const [turn, setTurn] = useState(0);
  const last = path.length - 1;

  // 図の内容が差し替わったら先頭に戻す。
  useEffect(() => setTurn(0), [diagram.fromNodeId, diagram.toNodeId]);

  const position = positionFromPath(path);
  const moveText =
    turn === 0 ? "" : formatNodeMove(path[turn - 1] ?? null, path[turn]);

  return (
    <figure className="diagram diagram--playable">
      <div className="diagram-board">
        <ShogiPlayerBoard position={position} turn={turn} mode="view" layout="vertical" />
      </div>
      {last > 0 && (
        <div className="diagram-controls">
          <button type="button" onClick={() => setTurn(0)} disabled={turn === 0}>
            ⏮
          </button>
          <button
            type="button"
            onClick={() => setTurn((value) => Math.max(0, value - 1))}
            disabled={turn === 0}
          >
            ◀
          </button>
          <span className="diagram-move">
            {turn === 0 ? `${diagram.caption ?? "図"}の局面` : `${turn}／${last}　${moveText}`}
          </span>
          <button
            type="button"
            onClick={() => setTurn((value) => Math.min(last, value + 1))}
            disabled={turn === last}
          >
            ▶
          </button>
          <button type="button" onClick={() => setTurn(last)} disabled={turn === last}>
            ⏭
          </button>
        </div>
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}

/**
 * 振る舞い②: 紙の棋書と同じ静止図。タップしたときだけ拡大して操作できる。
 * 紙面が静かになるぶん、読む速度を落とさずに済む。
 */
function StaticDiagram({
  diagram,
  path,
}: {
  diagram: DiagramData;
  path: MoveNode[];
}) {
  const [open, setOpen] = useState(false);
  const position = positionFromPath(path);

  return (
    <>
      <figure className="diagram diagram--static">
        <button
          type="button"
          className="diagram-open"
          onClick={() => setOpen(true)}
          aria-label={`${diagram.caption ?? "図"}を開いて動かす`}
        >
          <div className="diagram-board">
            <ShogiPlayerBoard position={position} turn={0} mode="view" layout="vertical" />
          </div>
          <span className="diagram-open-hint">タップで動かす</span>
        </button>
        {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
      </figure>

      {open && (
        <div className="diagram-modal" onClick={() => setOpen(false)}>
          <div className="diagram-modal-inner" onClick={(event) => event.stopPropagation()}>
            <div className="diagram-modal-header">
              <span>{diagram.caption ?? "図"}</span>
              <button type="button" onClick={() => setOpen(false)}>
                閉じる
              </button>
            </div>
            <ShogiPlayerBoard
              position={position}
              turn={-1}
              mode="play"
              layout="vertical"
              coordinate
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 振る舞い③: 紙面に主図が 1 つあり、本文中の図はその主図を差し替える指示になる。
 * 盤が 1 つしかないぶん紙面は簡潔だが、視線が主図と本文を往復する。
 */
function MainDiagramChip({
  diagram,
  active,
  onSelect,
}: {
  diagram: DiagramData;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`diagram-chip${active ? " diagram-chip--active" : ""}`}
      onClick={onSelect}
    >
      {diagram.caption ?? "図"} を主図に表示
    </button>
  );
}

/** page-main のときに紙面の先頭へ置く主図。 */
export function MainDiagram({ diagram }: { diagram: DiagramData }) {
  const path = useDiagramPath(diagram);
  const [turn, setTurn] = useState(-1);

  useEffect(() => setTurn(-1), [diagram.fromNodeId, diagram.toNodeId]);

  if (!path) return null;
  const position = positionFromPath(path);
  const last = path.length - 1;
  const current = turn < 0 ? last : turn;

  return (
    <div className="main-diagram">
      <ShogiPlayerBoard
        position={position}
        turn={current}
        mode="view"
        layout="vertical"
        coordinate
      />
      <div className="diagram-controls">
        <button
          type="button"
          onClick={() => setTurn(Math.max(0, current - 1))}
          disabled={current === 0}
        >
          ◀
        </button>
        <span className="diagram-move">{diagram.caption ?? "図"}</span>
        <button
          type="button"
          onClick={() => setTurn(Math.min(last, current + 1))}
          disabled={current === last}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
