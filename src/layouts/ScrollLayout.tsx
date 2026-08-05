/**
 * 紙面の構造 B: 縦スクロール。図は本文の流れの中に置く。
 *
 * ページ分割の難しさがなく、狭い画面との相性が良い。ただし「本を読む」というより
 * 記事を読む感覚に近いため、既定はページめくり型（PagedLayout）にしてある。
 */

import { BlockList } from "./BlockList";
import { useBookStore } from "../store/bookStore";

export function ScrollLayout() {
  const chapter = useBookStore((state) => state.chapter)();

  return (
    <div className="layout layout--scroll">
      <div className="layout-flow">
        <h2 className="chapter-title">{chapter.title}</h2>
        <BlockList blocks={chapter.blocks} />
      </div>
    </div>
  );
}
