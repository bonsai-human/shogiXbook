/**
 * 本文ペイン。本文と盤面の連動（F-2-2 / F-2-3）を担当する。
 *
 * この 1 機能がプロダクトの中核価値であり、実装の粗さがそのまま体験の劣化になる
 * （要件定義書 F-2-2 の注記 / R-8）。特に次の 3 点に注意している。
 *
 *   1. 追従の過敏さ
 *      スクロール量ごとに反応させると盤面がちらつく。IntersectionObserver で
 *      画面上部の細い帯（rootMargin で指定）を「読んでいる行」とみなし、
 *      その帯に入っているブロックが変わったときだけ盤面を動かす。
 *
 *   2. 双方向連動の無限ループ
 *      本文 → 盤面 → 本文 → … と往復しないよう、盤面側からの変更で本文を
 *      スクロールしている間は本文 → 盤面の追従を一時的に止める（suppressUntil）。
 *
 *   3. 局面に紐づかないブロック
 *      章の導入文など nodeId を持たないブロックでは盤面を動かさず、直前の局面を
 *      保つ。ブロックごとに「有効な nodeId」を前方から引き継いで解決する。
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useBookStore } from "../store/bookStore";
import { Markdown } from "./Markdown";
import { QuizCard } from "./QuizCard";

/** 盤面側の操作で本文をスクロールした直後、本文 → 盤面の追従を止める時間（ms）。 */
const SUPPRESS_MS = 700;

/**
 * 「読んでいる行」とみなす帯の位置。
 * 上から 12% 〜 24% のあたりを判定に使う。数値は体感で調整する前提の暫定値。
 */
const READING_BAND = "-12% 0px -76% 0px";

export function Reader() {
  const blocks = useBookStore((state) => state.chapter().blocks);
  const rootNodeId = useBookStore((state) => state.chapter().tree.id);
  const currentNodeId = useBookStore((state) => state.currentNodeId);
  const lastNavSource = useBookStore((state) => state.lastNavSource);
  const autoFollow = useBookStore((state) => state.autoFollow);
  const setCurrentNode = useBookStore((state) => state.setCurrentNode);

  const containerRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const visible = useRef(new Set<string>());
  const suppressUntil = useRef(0);
  const autoFollowRef = useRef(autoFollow);
  autoFollowRef.current = autoFollow;

  /**
   * 各ブロックが指す局面。nodeId を持たないブロックは直前のブロックの局面を引き継ぐ。
   */
  const effectiveNodeIds = useMemo(() => {
    const result = new Map<string, string | undefined>();
    let inherited: string | undefined;
    for (const block of blocks) {
      if (block.nodeId) inherited = block.nodeId;
      result.set(block.id, inherited);
    }
    return result;
  }, [blocks]);

  const blockOrder = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const blockOrderRef = useRef(blockOrder);
  blockOrderRef.current = blockOrder;
  const effectiveRef = useRef(effectiveNodeIds);
  effectiveRef.current = effectiveNodeIds;

  const registerBlock = useCallback((blockId: string, element: HTMLElement | null) => {
    if (element) elements.current.set(blockId, element);
    else elements.current.delete(blockId);
  }, []);

  // 本文 → 盤面
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const blockId = (entry.target as HTMLElement).dataset.blockId;
          if (!blockId) continue;
          if (entry.isIntersecting) visible.current.add(blockId);
          else visible.current.delete(blockId);
        }

        if (!autoFollowRef.current) return;
        if (performance.now() < suppressUntil.current) return;

        // 帯に入っているブロックのうち、文書順で最初のものを「読んでいる箇所」とする。
        const active = blockOrderRef.current.find((id) => visible.current.has(id));
        if (!active) return;

        const nodeId = effectiveRef.current.get(active);
        if (nodeId) setCurrentNode(nodeId, "text");
      },
      // root は本文ペイン自身。PC でもスマホでも .reader が唯一のスクロール領域に
      // なるようにレイアウトしてあるので、READING_BAND の割合指定がそのまま効く。
      { root: containerRef.current, rootMargin: READING_BAND, threshold: 0 },
    );

    for (const element of elements.current.values()) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [blockOrder, setCurrentNode]);

  // 盤面 → 本文
  useEffect(() => {
    // "text" は本文側が発生源なので追従不要。"init" は本や章を開いた直後で、
    // ここでスクロールを起こすと直後の読者操作を抑制期間で握り潰してしまう。
    if (lastNavSource === "text" || lastNavSource === "init") return;

    const target = blocks.find((block) => block.nodeId === currentNodeId);
    if (target) {
      const element = elements.current.get(target.id);
      if (!element) return;
      suppressUntil.current = performance.now() + SUPPRESS_MS;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 開始局面に戻ったときは、対応するブロックがなくても本文の先頭に戻す。
    // これがないと「最初へ」を押しても本文が置き去りになる。
    if (currentNodeId === rootNodeId) {
      suppressUntil.current = performance.now() + SUPPRESS_MS;
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    // それ以外の、本文が用意されていない局面では本文を動かさない。
    // 勝手にスクロールすると読者の現在位置を見失わせるため。
  }, [currentNodeId, lastNavSource, blocks, rootNodeId]);

  return (
    <div className="reader" ref={containerRef}>
      {blocks.map((block) => {
        const nodeId = effectiveNodeIds.get(block.id);
        const isActive = nodeId === currentNodeId;
        return (
          <section
            key={block.id}
            data-block-id={block.id}
            ref={(element) => registerBlock(block.id, element)}
            className={`block${isActive ? " block--active" : ""}`}
            onClick={() => {
              if (block.nodeId) setCurrentNode(block.nodeId, "text");
            }}
          >
            {block.type === "quiz" && block.quiz ? (
              <QuizCard block={block} />
            ) : (
              <Markdown
                markdown={block.markdown}
                onNodeLink={(id) => setCurrentNode(id, "text")}
              />
            )}
          </section>
        );
      })}
      {/* 最後のブロックも「読んでいる帯」に入れるための余白。 */}
      <div className="reader-tail" aria-hidden="true" />
    </div>
  );
}
