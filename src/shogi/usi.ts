/**
 * USI の position コマンド文字列の組み立てと分解。
 *
 * shogi-player の `sp_body` は
 *   position sfen <盤面> <手番> <持駒> <手数> moves <指し手> <指し手> ...
 * という形式を受け付ける。shogiXbook 側は手順を木で持っているので、
 * 「いま辿っている経路」を 1 本の直線に平坦化してこの形式に変換して渡す。
 *
 * 逆に shogi-player から返ってくる指し手イベントも同じ形式の文字列なので、
 * 送ったものとの差分を取れば「新しく指された手」が分かる。
 */

import type { MoveNode } from "../types/book";

/** ルート局面と指し手列から position コマンドを組み立てる。 */
export function buildPosition(rootSfen: string, usiMoves: string[]): string {
  const head = `position sfen ${rootSfen}`;
  return usiMoves.length > 0 ? `${head} moves ${usiMoves.join(" ")}` : head;
}

/** ルートから対象ノードまでの経路（findPath の結果）を position コマンドにする。 */
export function positionFromPath(path: MoveNode[]): string {
  if (path.length === 0) return "position startpos";
  const moves = path
    .slice(1)
    .map((node) => node.usi)
    .filter((usi): usi is string => usi !== null);
  return buildPosition(path[0].sfen, moves);
}

/** position コマンドから moves 部分の指し手列を取り出す。 */
export function movesOf(position: string): string[] {
  const index = position.indexOf(" moves ");
  if (index < 0) return [];
  return position
    .slice(index + 7)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * 送った position と返ってきた position を比べて、新しく追加された指し手を返す。
 *
 * shogi-player の指し手イベントは局面全体を文字列で返してくるため、
 * どの手が指されたのかはこちらで差分を取って求める。
 * 先頭が一致しない場合（別局面に飛んだ場合）は空を返す。
 */
export function appendedMoves(before: string, after: string): string[] {
  const a = movesOf(before);
  const b = movesOf(after);
  if (b.length <= a.length) return [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return [];
  }
  return b.slice(a.length);
}
