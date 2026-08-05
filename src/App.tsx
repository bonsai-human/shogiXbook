/**
 * アプリの外枠。
 *
 * 紙面の構造はページめくり型に決まったので、それを既定にしてある。
 * 残りの切り替え（スクロール / 連動、組方向、分岐ツリーの向き）は
 * 「表示」から開いて変更できる。
 */

import { useState } from "react";
import { PagedLayout } from "./layouts/PagedLayout";
import { ScrollLayout } from "./layouts/ScrollLayout";
import { LinkedLayout } from "./layouts/LinkedLayout";
import { MoveTreeView } from "./components/MoveTreeView";
import { useBookStore } from "./store/bookStore";
import type { LayoutMode } from "./store/bookStore";

const LAYOUTS: { key: LayoutMode; label: string; note: string }[] = [
  { key: "paged", label: "ページめくり", note: "紙の棋書に近い組み方。内容量と画面に応じて分割し直す" },
  { key: "scroll", label: "スクロール", note: "図は本文の流れの中。狭い画面向けの代替" },
  { key: "linked", label: "連動", note: "盤を固定し本文スクロールに追従させる。検討向け" },
];

export function App() {
  const book = useBookStore((state) => state.book);
  const chapterIndex = useBookStore((state) => state.chapterIndex);
  const setChapter = useBookStore((state) => state.setChapter);
  const layoutMode = useBookStore((state) => state.layoutMode);
  const setLayoutMode = useBookStore((state) => state.setLayoutMode);
  const writingMode = useBookStore((state) => state.writingMode);
  const setWritingMode = useBookStore((state) => state.setWritingMode);
  const treeOrientation = useBookStore((state) => state.treeOrientation);
  const setTreeOrientation = useBookStore((state) => state.setTreeOrientation);
  const editing = useBookStore((state) => state.editing);
  const toggleEditing = useBookStore((state) => state.toggleEditing);

  const [panelOpen, setPanelOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

  // 縦組みはページめくりでのみ成立する。ほかの組み方では横書きに戻す。
  const effectiveWriting = layoutMode === "paged" ? writingMode : "horizontal";

  return (
    <div className={`app app--${effectiveWriting}`}>
      <header className="app-header">
        <div className="app-title">
          <h1>{book.meta.title}</h1>
          <select
            value={chapterIndex}
            onChange={(event) => setChapter(Number(event.target.value))}
            aria-label="章の選択"
          >
            {book.chapters.map((chapter, index) => (
              <option key={chapter.id} value={index}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>
        <div className="app-actions">
          <button
            type="button"
            className={panelOpen ? "is-on" : ""}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            表示
          </button>
          <button type="button" onClick={() => setTreeOpen(true)}>
            分岐
          </button>
          {layoutMode === "linked" && (
            <button type="button" className={editing ? "is-on" : ""} onClick={toggleEditing}>
              {editing ? "編集中" : "閲覧中"}
            </button>
          )}
        </div>
      </header>

      {panelOpen && (
        <div className="compare-panel">
          <fieldset className="compare-group">
            <legend>紙面の組み方</legend>
            <div className="compare-options">
              {LAYOUTS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={layoutMode === item.key ? "is-on" : ""}
                  onClick={() => setLayoutMode(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="compare-note">
              {LAYOUTS.find((item) => item.key === layoutMode)?.note}
            </p>
          </fieldset>

          <fieldset className="compare-group">
            <legend>組方向</legend>
            <div className="compare-options">
              <button
                type="button"
                className={writingMode === "horizontal" ? "is-on" : ""}
                onClick={() => setWritingMode("horizontal")}
              >
                横書き
              </button>
              <button
                type="button"
                className={writingMode === "vertical" ? "is-on" : ""}
                onClick={() => setWritingMode("vertical")}
              >
                縦書き
              </button>
            </div>
            <p className="compare-note">
              縦書きはページめくりでのみ組める。ほかの組み方では横書きになる。
            </p>
          </fieldset>

          <fieldset className="compare-group">
            <legend>分岐ツリーの向き</legend>
            <div className="compare-options">
              <button
                type="button"
                className={treeOrientation === "vertical" ? "is-on" : ""}
                onClick={() => setTreeOrientation("vertical")}
              >
                縦に伸ばす
              </button>
              <button
                type="button"
                className={treeOrientation === "horizontal" ? "is-on" : ""}
                onClick={() => setTreeOrientation("horizontal")}
              >
                横に伸ばす
              </button>
            </div>
          </fieldset>
        </div>
      )}

      <main className="app-main">
        {layoutMode === "paged" && <PagedLayout />}
        {layoutMode === "scroll" && <ScrollLayout />}
        {layoutMode === "linked" && <LinkedLayout />}
      </main>

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
