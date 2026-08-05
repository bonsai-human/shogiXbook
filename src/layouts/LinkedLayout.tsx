/**
 * 紙面の構造 D: 盤を別ペインに固定し、本文スクロールに追従させる（初版の形）。
 *
 * 「本を読む」というより記事を読む感覚に近く、本命ではないと判断したが、
 * 検討用の局面をひたすら追いたい場面ではこの形が向くので残してある。
 *
 * 連動の作り込み（過敏さの抑制と、双方向連動が無限ループしないための抑制期間）は
 * Reader.tsx 側にある。
 */

import { Reader } from "../components/Reader";
import { ShogiPlayerBoard } from "../board/ShogiPlayerBoard";
import { MoveTreeView } from "../components/MoveTreeView";
import { useBookStore } from "../store/bookStore";
import { positionFromPath } from "../shogi/usi";
import { appendUSIMove } from "../shogi/tree";

export function LinkedLayout() {
  const path = useBookStore((state) => state.currentPath)();
  const editing = useBookStore((state) => state.editing);
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);
  const chapter = useBookStore((state) => state.chapter)();
  const goBack = useBookStore((state) => state.goBack);
  const goForward = useBookStore((state) => state.goForward);
  const goToStart = useBookStore((state) => state.goToStart);
  const goToEnd = useBookStore((state) => state.goToEnd);
  useBookStore((state) => state.revision);

  const position = positionFromPath(path);
  const current = path[path.length - 1];

  /**
   * 盤で指された手を木へ追加する。
   * shogi-player は直線的な棋譜しか持たないため、追加は shogiXbook 側の責任になる。
   */
  function handleMoves(usiMoves: string[]) {
    let node = current;
    for (const usi of usiMoves) {
      const next = appendUSIMove(node, usi);
      if (!next) return;
      node = next;
    }
    setCurrentNode(node.id, "board");
  }

  return (
    <div className="layout layout--linked">
      <aside className="pane pane--tree">
        <h2 className="pane-title">分岐</h2>
        <MoveTreeView />
      </aside>

      <section className="pane pane--board">
        <ShogiPlayerBoard
          position={position}
          turn={path.length - 1}
          mode={editing ? "play" : "view"}
          layout="vertical"
          coordinate
          onMoves={handleMoves}
        />
        <nav className="board-nav" aria-label="手順の移動">
          <button type="button" onClick={goToStart} aria-label="最初へ">
            ⏮
          </button>
          <button type="button" onClick={goBack} aria-label="1手戻る">
            ◀
          </button>
          <button type="button" onClick={goForward} aria-label="1手進む">
            ▶
          </button>
          <button type="button" onClick={goToEnd} aria-label="最後へ">
            ⏭
          </button>
        </nav>
        <p className="board-hint">
          {editing
            ? "駒をタップして選び、移動先をタップします。既存の手と違う手は新しい分岐になります。"
            : `${chapter.title}　${path.length - 1 === 0 ? "開始局面" : `${path.length - 1}手目`}`}
        </p>
      </section>

      <section className="pane pane--reader">
        <Reader />
      </section>
    </div>
  );
}
