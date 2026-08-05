/**
 * 紙面の構造 A: ページめくり型。
 *
 * 画面幅が可変な Web では、紙のようにページを固定できない。内容量と画面サイズに
 * 応じて分割し直す（リフローする）必要がある。電子書籍と同じ問題である。
 *
 * 実装方針:
 *   自前で高さを測って詰めるのではなく、CSS の段組み（multi-column）を使う。
 *   1 段の幅を紙面の幅に合わせ、高さを固定して `column-fill: auto` にすると、
 *   ブラウザが内容を上から順に段へ流し込む。これがそのままページ分割になる。
 *   段落の途中で切れる自然な分割まで含めてブラウザ任せにできるのが利点で、
 *   自前で測るより結果が良く、実装も小さい。
 *
 *   ページ送りは段組み全体を横に平行移動して行う。
 *   縦書きのときは文字の進行方向が右から左になるため、移動の向きも反転する。
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BlockList } from "./BlockList";
import { useBookStore } from "../store/bookStore";

/** 紙面どうしの間隔（px）。 */
const PAGE_GAP = 48;

export function PagedLayout() {
  const chapter = useBookStore((state) => state.chapter)();
  const chapterIndex = useBookStore((state) => state.chapterIndex);
  const book = useBookStore((state) => state.book);
  const setChapter = useBookStore((state) => state.setChapter);
  const writingMode = useBookStore((state) => state.writingMode);
  const revision = useBookStore((state) => state.revision);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  // 段の幅は実測値（px）で渡す。column-width はパーセント指定を受け付けない。
  const [pageWidth, setPageWidth] = useState(0);

  const vertical = writingMode === "vertical";

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const width = viewport.clientWidth;
    if (width <= 0) return;
    // 縦書きは紙面そのものを横スクロールさせるので、はみ出し量から枚数を出す。
    // 横書きは段組みなので、段の総幅を 1 枚ぶんの幅で割る。
    const total = vertical
      ? Math.max(1, Math.round(viewport.scrollWidth / width))
      : Math.max(1, Math.round((content.scrollWidth + PAGE_GAP) / (width + PAGE_GAP)));
    setPageCount(total);
    setPage((current) => Math.min(current, total - 1));
  }, [vertical]);

  // 段の幅を紙面の幅に合わせる。画面幅が変わったら追従する。
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setPageWidth(viewport.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // 幅が確定してから分割数を測る。内容や組方向が変わったときも測り直す。
  useLayoutEffect(() => {
    if (pageWidth > 0) measure();
  }, [measure, pageWidth, chapter, writingMode, revision]);

  /**
   * 縦書きでは内容が右方向へ伸び、先頭（章の始まり）が最大スクロール位置にくる。
   * 何もしないと末尾が表示されてしまうため、先頭へ寄せる。
   * 盤面は遅延読み込みで後から幅が変わるので、少し待ってもう一度寄せ直す。
   */
  useEffect(() => {
    if (!vertical) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const toStart = () => {
      viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    };
    toStart();
    const timer = window.setTimeout(toStart, 900);
    return () => window.clearTimeout(timer);
  }, [vertical, chapter]);

  // 盤面は遅延読み込みで後から高さが変わるため、少し待ってもう一度測る。
  useEffect(() => {
    const timer = window.setTimeout(measure, 800);
    return () => window.clearTimeout(timer);
  }, [measure, chapter, writingMode]);

  useEffect(() => {
    setPage(0);
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = vertical ? viewport.scrollWidth - viewport.clientWidth : 0;
    }
  }, [chapterIndex, vertical]);

  /**
   * 縦書きでは内容が左方向へはみ出すため、平行移動だと座標の向きが環境依存になる。
   * scrollBy なら向きの解釈をブラウザに任せられるので、こちらで送る。
   */
  const scrollByPage = useCallback((direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: "smooth" });
  }, []);

  const goPrev = useCallback(() => {
    if (vertical) {
      if (page > 0) {
        scrollByPage(1);
        setPage(page - 1);
      } else if (chapterIndex > 0) {
        setChapter(chapterIndex - 1);
      }
      return;
    }
    setPage((current) => {
      if (current > 0) return current - 1;
      if (chapterIndex > 0) setChapter(chapterIndex - 1);
      return current;
    });
  }, [vertical, page, scrollByPage, chapterIndex, setChapter]);

  const goNext = useCallback(() => {
    if (vertical) {
      if (page < pageCount - 1) {
        scrollByPage(-1);
        setPage(page + 1);
      } else if (chapterIndex < book.chapters.length - 1) {
        setChapter(chapterIndex + 1);
      }
      return;
    }
    setPage((current) => {
      if (current < pageCount - 1) return current + 1;
      if (chapterIndex < book.chapters.length - 1) setChapter(chapterIndex + 1);
      return current;
    });
  }, [vertical, page, pageCount, scrollByPage, chapterIndex, book.chapters.length, setChapter]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      // 縦書きでは視線が右から左へ進むので、進む向きも入れ替える。
      if (event.key === "ArrowLeft") vertical ? goNext() : goPrev();
      else if (event.key === "ArrowRight") vertical ? goPrev() : goNext();
      else if (event.key === "PageDown" || event.key === " ") goNext();
      else if (event.key === "PageUp") goPrev();
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext, vertical]);

  const offset = `calc(-1 * ${page} * (100% + ${PAGE_GAP}px))`;

  return (
    <div className={`layout layout--paged${vertical ? " layout--vertical" : ""}`}>
      <div className="paged-viewport" ref={viewportRef}>
        <div
          className="paged-content"
          ref={contentRef}
          style={{
            ["--page-gap" as string]: `${PAGE_GAP}px`,
            ["--page-width" as string]: pageWidth > 0 ? `${pageWidth}px` : "auto",
            transform: vertical ? undefined : `translateX(${offset})`,
          }}
        >
          <h2 className="chapter-title">{chapter.title}</h2>
          <BlockList blocks={chapter.blocks} />
        </div>
      </div>

      <nav className="page-nav" aria-label="ページ送り">
        <button type="button" onClick={goPrev} disabled={page === 0 && chapterIndex === 0}>
          ◀ 前
        </button>
        <span className="page-indicator">
          {chapter.title}　{page + 1} / {pageCount}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={page === pageCount - 1 && chapterIndex === book.chapters.length - 1}
        >
          次 ▶
        </button>
      </nav>
    </div>
  );
}
