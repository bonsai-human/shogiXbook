/**
 * shogi-player を React から使うためのラッパ。
 *
 * shogiXbook 側は分岐を持つ木でデータを管理し、shogi-player は直線的な棋譜しか
 * 扱えない。そこで境界をここに引く。
 *   外向き: 現在たどっている経路を 1 本に平坦化した position コマンドを渡す
 *   内向き: 指された手を position の差分として受け取り、木への追加は呼び出し側に任せる
 *
 * このファイルが shogi-player に依存する唯一の React コンポーネントである。
 * 盤を差し替えたくなった場合はここだけを書き換えればよい。
 */

import { useEffect, useRef, useState } from "react";
import { SHOGI_PLAYER_TAG, loadShogiPlayer } from "./shogiPlayerLoader";
import { appendedMoves } from "../shogi/usi";

export type BoardMode = "view" | "play" | "edit";

export type ShogiPlayerBoardProps = {
  /** `position sfen ... moves ...` 形式の局面。 */
  position: string;
  /** 表示する手数。-1 で最終手。 */
  turn?: number;
  /**
   * view  : 再生のみ（盤の左右タップで手数送り）
   * play  : 駒を動かせる
   * edit  : 局面編集（駒箱つき）
   */
  mode?: BoardMode;
  /** 盤と駒台の配置。vertical で上下配置。 */
  layout?: "horizontal" | "vertical";
  /** 座標（筋・段）を表示する。 */
  coordinate?: boolean;
  /** 盤の左右タップで手数を送る。play モードでは駒が動かせなくなるので注意。 */
  overlayNav?: boolean;
  /** 手が指されたときに、追加された指し手（USI）を返す。 */
  onMoves?: (usiMoves: string[]) => void;
  /** 手数が変わったときに呼ばれる。 */
  onTurnChange?: (turn: number) => void;
  className?: string;
};

type ShogiPlayerElement = HTMLElement & Record<string, unknown>;

export function ShogiPlayerBoard({
  position,
  turn = -1,
  mode = "view",
  layout = "vertical",
  coordinate = true,
  overlayNav = false,
  onMoves,
  onTurnChange,
  className,
}: ShogiPlayerBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<ShogiPlayerElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // 最新の値をイベントハンドラから参照するための保持。
  const positionRef = useRef(position);
  positionRef.current = position;
  const onMovesRef = useRef(onMoves);
  onMovesRef.current = onMoves;
  const onTurnChangeRef = useRef(onTurnChange);
  onTurnChangeRef.current = onTurnChange;

  useEffect(() => {
    let cancelled = false;
    loadShogiPlayer().then(
      () => !cancelled && setReady(true),
      (error) => {
        console.error("shogi-player の読み込みに失敗しました", error);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // カスタム要素の生成と破棄。React の再描画で作り直されないよう、
  // ホストとなる div に手で append する。
  useEffect(() => {
    if (!ready || !hostRef.current) return;
    const element = document.createElement(SHOGI_PLAYER_TAG) as ShogiPlayerElement;
    elementRef.current = element;

    function handleMove(event: Event) {
      const detail = (event as CustomEvent).detail;
      const params = Array.isArray(detail) ? detail[0] : detail;
      const nextPosition = params?.sfen;
      if (typeof nextPosition !== "string") return;
      const moves = appendedMoves(positionRef.current, nextPosition);
      if (moves.length > 0) onMovesRef.current?.(moves);
    }

    function handleTurn(event: Event) {
      const detail = (event as CustomEvent).detail;
      const value = Array.isArray(detail) ? detail[0] : detail;
      if (typeof value === "number") onTurnChangeRef.current?.(value);
    }

    element.addEventListener("ev_play_mode_move", handleMove);
    element.addEventListener("ev_turn_offset_change", handleTurn);

    hostRef.current.appendChild(element);
    return () => {
      element.removeEventListener("ev_play_mode_move", handleMove);
      element.removeEventListener("ev_turn_offset_change", handleTurn);
      element.remove();
      elementRef.current = null;
    };
  }, [ready]);

  // プロパティの反映。属性ではなくプロパティとして渡す。
  // 属性経由だと数値・真偽値が文字列になり、値の解釈がラッパ任せになるため。
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    element.sp_body = position;
    element.sp_turn = turn;
    element.sp_mode = mode;
    element.sp_layout = layout;
    element.sp_coordinate = coordinate;
    element.sp_overlay_nav = overlayNav;
  }, [ready, position, turn, mode, layout, coordinate, overlayNav]);

  if (failed) {
    return (
      <div className={`board-fallback ${className ?? ""}`}>
        盤面を読み込めませんでした。通信環境をご確認ください。
      </div>
    );
  }

  return (
    <div className={`board-host ${className ?? ""}`} ref={hostRef}>
      {!ready && <div className="board-loading">盤面を読み込んでいます…</div>}
    </div>
  );
}
