import { describe, expect, it } from "vitest";
import { InitialPositionSFEN, Position } from "tsshogi";
import {
  appendUSIMove,
  createRoot,
  findParent,
  findPath,
  formatNodeMove,
  mainLine,
  plyOf,
  removeNode,
  walk,
} from "./tree";
import { createSampleBook } from "../data/sampleBook";

function root() {
  return createRoot(InitialPositionSFEN.STANDARD);
}

describe("手順の木", () => {
  it("合法手を追加できる", () => {
    const tree = root();
    const node = appendUSIMove(tree, "7g7f");
    expect(node).not.toBeNull();
    expect(tree.children).toHaveLength(1);
    expect(node!.usi).toBe("7g7f");
  });

  it("非合法手は拒否する", () => {
    const tree = root();
    // 初手から 5 段目に歩は動かせない。
    expect(appendUSIMove(tree, "7g7e")).toBeNull();
    expect(tree.children).toHaveLength(0);
  });

  it("同じ手を 2 回追加しても分岐は増えない", () => {
    const tree = root();
    const first = appendUSIMove(tree, "7g7f");
    const second = appendUSIMove(tree, "7g7f");
    expect(tree.children).toHaveLength(1);
    expect(second).toBe(first);
  });

  it("異なる手は新しい分岐になる", () => {
    const tree = root();
    appendUSIMove(tree, "7g7f");
    appendUSIMove(tree, "2g2f");
    expect(tree.children).toHaveLength(2);
  });

  it("ノードの SFEN が実際の局面と一致する", () => {
    const tree = root();
    const node = appendUSIMove(tree, "7g7f")!;
    const position = Position.newBySFEN(InitialPositionSFEN.STANDARD)!;
    position.doMove(position.createMoveByUSI("7g7f")!);
    expect(node.sfen).toBe(position.sfen);
  });

  it("経路と手数を取得できる", () => {
    const tree = root();
    const a = appendUSIMove(tree, "7g7f")!;
    const b = appendUSIMove(a, "3c3d")!;
    expect(findPath(tree, b.id)?.map((n) => n.id)).toEqual([tree.id, a.id, b.id]);
    expect(plyOf(tree, b.id)).toBe(2);
    expect(findParent(tree, b.id)?.id).toBe(a.id);
    expect(findParent(tree, tree.id)).toBeNull();
  });

  it("本筋は先頭の子を辿る", () => {
    const tree = root();
    const a = appendUSIMove(tree, "7g7f")!;
    appendUSIMove(tree, "2g2f"); // 変化
    const b = appendUSIMove(a, "3c3d")!;
    expect(mainLine(tree).map((n) => n.id)).toEqual([tree.id, a.id, b.id]);
  });

  it("ノードを削除すると以降の手順も消える", () => {
    const tree = root();
    const a = appendUSIMove(tree, "7g7f")!;
    appendUSIMove(a, "3c3d");
    expect(walk(tree)).toHaveLength(3);
    expect(removeNode(tree, a.id)).toBe(true);
    expect(walk(tree)).toHaveLength(1);
  });

  it("指し手を日本語表記にできる", () => {
    const tree = root();
    const a = appendUSIMove(tree, "7g7f")!;
    expect(formatNodeMove(null, tree)).toBe("開始局面");
    expect(formatNodeMove(tree, a)).toBe("▲７六歩");
  });
});

describe("サンプル本", () => {
  it("すべての手順が合法で組み立てられる", () => {
    expect(() => createSampleBook()).not.toThrow();
  });

  it("本文ブロックの nodeId が実在するノードを指している", () => {
    const book = createSampleBook();
    for (const chapter of book.chapters) {
      const ids = new Set(walk(chapter.tree).map((node) => node.id));
      for (const block of chapter.blocks) {
        if (block.nodeId) {
          expect(ids.has(block.nodeId), `${chapter.title} / ${block.id}`).toBe(true);
        }
        for (const answerId of block.quiz?.answerNodeIds ?? []) {
          expect(ids.has(answerId)).toBe(true);
        }
      }
    }
  });

  it("問題の正解手が出題局面から実際に指せる", () => {
    const book = createSampleBook();
    for (const chapter of book.chapters) {
      for (const block of chapter.blocks) {
        if (!block.quiz || !block.nodeId) continue;
        const anchor = walk(chapter.tree).find((node) => node.id === block.nodeId)!;
        const position = Position.newBySFEN(anchor.sfen)!;
        for (const usi of block.quiz.acceptableFirstMoves) {
          const move = position.createMoveByUSI(usi);
          expect(move, `正解手 ${usi} を生成できない`).not.toBeNull();
          expect(position.isValidMove(move!), `正解手 ${usi} が非合法`).toBe(true);
        }
        // 誤答例も、指せる手でなければ解説が表示される機会がない。
        for (const usi of Object.keys(block.quiz.wrongMoveComments ?? {})) {
          const move = position.createMoveByUSI(usi);
          expect(move, `誤答例 ${usi} を生成できない`).not.toBeNull();
          expect(position.isValidMove(move!), `誤答例 ${usi} が非合法`).toBe(true);
        }
      }
    }
  });
});
