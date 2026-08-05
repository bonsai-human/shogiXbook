/**
 * アプリの外枠。
 *
 * いまは「紙面の構造をどれにするか」を決めるための見比べ用の器になっている。
 * 4 つの構造と、図面の 3 つの振る舞い、組方向、分岐ツリーの向きを
 * その場で切り替えられる。決まったら切り替え UI は畳んで既定を固定する。
 */

import { useState } from "react";
import { PagedLayout } from "./layouts/PagedLayout";
import { ChapterPageLayout } from "./layouts/ChapterPageLayout";
import { ScrollLayout } from "./layouts/ScrollLayout";
import { LinkedLayout } from "./layouts/LinkedLayout";
import { MoveTreeView } from "./components/MoveTreeView";
import { useBookStore } from "./store/bookStore";
import type { LayoutMode } from "./store/bookStore";
import type { DiagramBehavior } from "./types/book";

const LAYOUTS: { key: LayoutMode; label: string; note: string }[] = [
  { key: "paged", label: "ページめくり", note: "紙の棋書に一番近い。内容量に応じて再分割する" },
  { key: "chapter-page", label: "章＝ページ", note: "めくる感覚を残しつつ再分割は不要" },
  { key: "scroll", label: "スクロール", note: "図は本文の流れの中。記事に近い" },
  { key: "linked", label: "連動（初版）", note: "盤を固定し本文スクロールに追従させる" },
];

const BEHAVIORS: { key: DiagramBehavior | null; label: string; note: string }[] = [
  { key: null, label: "本の指定どおり", note: "図ごとに設定された振る舞いを使う" },
  { key: "playable", label: "①その場で進む", note: "図の下の送りで手順を追える" },
  { key: "static", label: "②静止図", note: "タップしたときだけ拡大して動かす" },
  { key: "page-main", label: "③主図ひとつ", note: "紙面の主図を本文中の指示で差し替える" },
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
  const diagramBehavior = useBookStore((state) => state.diagramBehavior);
  const setDiagramBehavior = useBookStore((state) => state.setDiagramBehavior);
  const editing = useBookStore((state) => state.editing);
  const toggleEditing = useBookStore((state) => state.toggleEditing);

  const [panelOpen, setPanelOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

  const layoutNote = LAYOUTS.find((item) => item.key === layoutMode)?.note ?? "";

  return (
    <div className={`app app--${writingMode}`}>
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
            見比べ
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
          <p className="compare-lead">
            紙面の構造を決めるための切り替えです。実機で触って、どれが「本らしい」か見てください。
          </p>

          <fieldset className="compare-group">
            <legend>紙面の構造</legend>
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
            <p className="compare-note">{layoutNote}</p>
          </fieldset>

          <fieldset className="compare-group">
            <legend>図面の振る舞い</legend>
            <div className="compare-options">
              {BEHAVIORS.map((item) => (
                <button
                  key={String(item.key)}
                  type="button"
                  className={diagramBehavior === item.key ? "is-on" : ""}
                  onClick={() => setDiagramBehavior(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="compare-note">
              {BEHAVIORS.find((item) => item.key === diagramBehavior)?.note}
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
        {layoutMode === "chapter-page" && <ChapterPageLayout />}
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
