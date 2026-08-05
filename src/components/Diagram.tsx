/**
 * 本文中の図面。
 *
 * 「棋書らしさ」の要は、盤が別ペインに固定されているのではなく、図が本文の流れの
 * 中に組まれていることにある。このコンポーネントがその図にあたる。
 *
 * 図はそれぞれ短い手順を持ち、図の下の送りで進められる。本文を読みながら
 * その場で手順を追えるので、ページを離れる必要がない。
 *
 * 以前は「静止図をタップで拡大」「紙面に主図をひとつ置く」も用意していたが、
 * 見比べた結果どちらも採らないことになったため削除した。
 */

import { useEffect, useState } from "react";
import { ShogiPlayerBoard } from "../board/ShogiPlayerBoard";
import { formatNodeMove, pathBetween } from "../shogi/tree";
import { positionFromPath } from "../shogi/usi";
import { useBookStore } from "../store/bookStore";
import type { Diagram as DiagramData } from "../types/book";

export function Diagram({ diagram }: { diagram: DiagramData }) {
  const tree = useBookStore((state) => state.chapter().tree);
  useBookStore((state) => state.revision);

  const [turn, setTurn] = useState(0);
  // 図の内容が差し替わったら先頭に戻す。
  useEffect(() => setTurn(0), [diagram.fromNodeId, diagram.toNodeId]);

  const path = pathBetween(tree, diagram.fromNodeId, diagram.toNodeId ?? diagram.fromNodeId);
  if (!path) {
    return <div className="diagram diagram--error">図面の局面が見つかりません。</div>;
  }

  const last = path.length - 1;
  const position = positionFromPath(path);
  const moveText = turn === 0 ? "" : formatNodeMove(path[turn - 1] ?? null, path[turn]);

  return (
    <figure className="diagram">
      <div className="diagram-board">
        <ShogiPlayerBoard position={position} turn={turn} mode="view" layout="vertical" />
      </div>

      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}

      {last > 0 && (
        <div className="diagram-controls">
          <button
            type="button"
            onClick={() => setTurn(0)}
            disabled={turn === 0}
            aria-label="図の局面に戻す"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => setTurn((value) => Math.max(0, value - 1))}
            disabled={turn === 0}
            aria-label="1手戻る"
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
            aria-label="1手進む"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => setTurn(last)}
            disabled={turn === last}
            aria-label="最後まで進む"
          >
            ⏭
          </button>
        </div>
      )}
    </figure>
  );
}
