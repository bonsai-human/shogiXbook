/**
 * アプリの外枠。
 *
 * 画面構成は要件定義書 6.1 のレスポンシブ方針に沿う。
 *   PC       : 3 ペイン（分岐ツリー / 盤面 / 本文）
 *   スマホ縦 : 単一カラム。盤面を上部に固定し、本文をその下にスクロール。
 *              分岐ツリーは常時表示せず、必要なときに開く（F-3-8）。
 * CSS 側のメディアクエリで切り替えており、コンポーネントは共通である。
 */

import { useEffect, useState } from "react";
import { Board } from "./components/Board";
import { Reader } from "./components/Reader";
import { MoveTreeView } from "./components/MoveTreeView";
import { useBookStore } from "./store/bookStore";
import { findParent, formatNodeMove, plyOf } from "./shogi/tree";

export function App() {
  const book = useBookStore((state) => state.book);
  const chapterIndex = useBookStore((state) => state.chapterIndex);
  const setChapter = useBookStore((state) => state.setChapter);
  const chapter = useBookStore((state) => state.chapter)();
  const currentNode = useBookStore((state) => state.currentNode)();
  const currentNodeId = useBookStore((state) => state.currentNodeId);
  const flipped = useBookStore((state) => state.flipped);
  const autoFollow = useBookStore((state) => state.autoFollow);
  const editing = useBookStore((state) => state.editing);
  const playMove = useBookStore((state) => state.playMove);
  const goBack = useBookStore((state) => state.goBack);
  const goForward = useBookStore((state) => state.goForward);
  const goToStart = useBookStore((state) => state.goToStart);
  const goToEnd = useBookStore((state) => state.goToEnd);
  const toggleFlip = useBookStore((state) => state.toggleFlip);
  const toggleAutoFollow = useBookStore((state) => state.toggleAutoFollow);
  const toggleEditing = useBookStore((state) => state.toggleEditing);

  const [treeOpen, setTreeOpen] = useState(false);

  // キーボードによる手順送り（F-2-6 / NF-9）。
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goForward();
      } else if (event.key === "Home") {
        event.preventDefault();
        goToStart();
      } else if (event.key === "End") {
        event.preventDefault();
        goToEnd();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  const parent = findParent(chapter.tree, currentNodeId);
  const ply = plyOf(chapter.tree, currentNodeId);
  const moveText = formatNodeMove(parent, currentNode);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>{book.meta.title}</h1>
          <select
            value={chapterIndex}
            onChange={(event) => setChapter(Number(event.target.value))}
            aria-label="章の選択"
          >
            {book.chapters.map((item, index) => (
              <option key={item.id} value={index}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="app-actions">
          <button
            type="button"
            className={editing ? "is-on" : ""}
            onClick={toggleEditing}
            title="盤面で駒を動かして手順を追加できるようにします"
          >
            {editing ? "編集中" : "閲覧中"}
          </button>
          <button
            type="button"
            className={autoFollow ? "is-on" : ""}
            onClick={toggleAutoFollow}
            title="本文のスクロールに盤面を追従させます"
          >
            連動 {autoFollow ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={toggleFlip} title="盤面を反転します">
            反転
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="pane pane--tree">
          <h2 className="pane-title">分岐</h2>
          <MoveTreeView />
        </aside>

        <section className="pane pane--board">
          <Board
            sfen={currentNode.sfen}
            lastMoveUsi={currentNode.usi}
            flipped={flipped}
            interactive={editing}
            onMove={playMove}
          />
          <div className="board-status">
            <span className="ply">{ply === 0 ? "開始局面" : `${ply}手目`}</span>
            <span className="move-text">{ply === 0 ? "" : moveText}</span>
          </div>
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
            <button
              type="button"
              className="board-nav-tree"
              onClick={() => setTreeOpen(true)}
            >
              分岐
            </button>
          </nav>
          {editing && (
            <p className="board-hint">
              駒をタップして選び、移動先をタップします。既存の手と違う手を指すと
              新しい分岐になります。
            </p>
          )}
        </section>

        <section className="pane pane--reader">
          <Reader />
        </section>
      </main>

      {/* スマホでは分岐ツリーをボトムシートとして開く（F-3-8）。 */}
      {treeOpen && (
        <div className="sheet-backdrop" onClick={() => setTreeOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <h2>分岐</h2>
              <button type="button" onClick={() => setTreeOpen(false)}>
                閉じる
              </button>
            </div>
            <MoveTreeView />
          </div>
        </div>
      )}
    </div>
  );
}
