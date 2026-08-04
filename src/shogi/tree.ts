/**
 * 手順の木（MoveNode）を操作するユーティリティ。
 *
 * 将棋のルール・SFEN・棋譜表記は tsshogi に委譲し、ここでは木構造の走査と更新だけを扱う。
 */

import { Move, Position, formatMove } from "tsshogi";
import type { MoveNode } from "../types/book";

let idCounter = 0;

/** ノード id を生成する。1 セッション内で一意であればよい。 */
export function newNodeId(): string {
  idCounter += 1;
  return `n${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** 指定した SFEN をルートとする木を作る。 */
export function createRoot(sfen: string): MoveNode {
  return { id: newNodeId(), usi: null, sfen, children: [] };
}

/**
 * ルートから指定ノードまでの経路を返す（ルートと対象ノードを含む）。
 * 見つからなければ null。
 */
export function findPath(root: MoveNode, nodeId: string): MoveNode[] | null {
  if (root.id === nodeId) return [root];
  for (const child of root.children) {
    const sub = findPath(child, nodeId);
    if (sub) return [root, ...sub];
  }
  return null;
}

/** 指定 id のノードを返す。 */
export function findNode(root: MoveNode, nodeId: string): MoveNode | null {
  const path = findPath(root, nodeId);
  return path ? path[path.length - 1] : null;
}

/** 指定ノードの親を返す。ルートまたは未発見なら null。 */
export function findParent(root: MoveNode, nodeId: string): MoveNode | null {
  const path = findPath(root, nodeId);
  if (!path || path.length < 2) return null;
  return path[path.length - 2];
}

/** ノードの SFEN から Position を復元する。 */
export function positionOf(node: MoveNode): Position {
  const position = Position.newBySFEN(node.sfen);
  if (!position) {
    throw new Error(`不正な SFEN です: ${node.sfen}`);
  }
  return position;
}

/**
 * 指定ノードに指し手を追加する。
 *
 * すでに同じ指し手の子が存在する場合は新規作成せずそれを返す（F-4-1）。
 * 異なる指し手なら新しい分岐として追加する（F-4-2）。
 * 非合法手なら null を返す（F-4-3）。
 *
 * 木を直接書き換える破壊的操作である点に注意。呼び出し側で必要に応じてクローンすること。
 */
export function appendMove(node: MoveNode, move: Move): MoveNode | null {
  const position = positionOf(node);
  if (!position.isValidMove(move)) return null;

  const usi = move.usi;
  const existing = node.children.find((child) => child.usi === usi);
  if (existing) return existing;

  if (!position.doMove(move)) return null;
  const child: MoveNode = {
    id: newNodeId(),
    usi,
    sfen: position.sfen,
    children: [],
  };
  node.children.push(child);
  return child;
}

/**
 * USI 形式の指し手文字列でノードに手を追加する。
 * 棋譜の取り込みなど、Move オブジェクトを持たない経路から使う。
 */
export function appendUSIMove(node: MoveNode, usi: string): MoveNode | null {
  const position = positionOf(node);
  const move = position.createMoveByUSI(usi);
  if (!move) return null;
  return appendMove(node, move);
}

/** 指定ノードを親から取り除く。以降の手順もまとめて消える（F-4-5）。 */
export function removeNode(root: MoveNode, nodeId: string): boolean {
  const parent = findParent(root, nodeId);
  if (!parent) return false;
  const index = parent.children.findIndex((child) => child.id === nodeId);
  if (index < 0) return false;
  parent.children.splice(index, 1);
  return true;
}

/** ルートから常に先頭の子を辿った本筋を返す（ルートを含む）。 */
export function mainLine(root: MoveNode): MoveNode[] {
  const line: MoveNode[] = [root];
  let current = root;
  while (current.children.length > 0) {
    current = current.children[0];
    line.push(current);
  }
  return line;
}

/** 木に含まれる全ノードを深さ優先で列挙する。 */
export function walk(root: MoveNode): MoveNode[] {
  const result: MoveNode[] = [root];
  for (const child of root.children) {
    result.push(...walk(child));
  }
  return result;
}

/**
 * ノードの指し手を日本語表記（▲7六歩 など）で返す。
 *
 * 表記の生成には「指し手の直前の局面」が必要なため、親ノードを渡す。
 * ルートノードには指し手がないので「開始局面」を返す。
 */
export function formatNodeMove(parent: MoveNode | null, node: MoveNode): string {
  if (!parent || !node.usi) return "開始局面";
  const position = positionOf(parent);
  const move = position.createMoveByUSI(node.usi);
  if (!move) return node.usi;
  // compatible: true で先後の記号が ☗☖ ではなく ▲△ になる。
  // ☗☖ (U+2617 / U+2616) は環境によって字形を持たず豆腐になるため、既定は ▲△ とする。
  // 表記の切り替えは F-9-2（第二版）。
  return formatMove(position, move, { compatible: true });
}

/** ルートからの手数を返す。ルートは 0。 */
export function plyOf(root: MoveNode, nodeId: string): number {
  const path = findPath(root, nodeId);
  return path ? path.length - 1 : 0;
}
