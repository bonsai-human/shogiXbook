/**
 * 動作確認用のサンプル本。
 *
 * SFEN を直接書かず、初期局面から USI 形式の指し手を積んで組み立てる。
 * こうすると不正な局面が入り込まないうえ、手順を書き換えたときに
 * 各ノードの SFEN が自動的に整合する。
 */

import { InitialPositionSFEN } from "tsshogi";
import { BOOK_SCHEMA_VERSION } from "../types/book";
import type { Book, Chapter, ContentBlock, MoveNode } from "../types/book";
import { appendUSIMove, createRoot, newNodeId } from "../shogi/tree";

/** 指定ノードから USI 手順を順に積み、通過したノードを返す。 */
function playLine(from: MoveNode, moves: string[]): MoveNode[] {
  const nodes: MoveNode[] = [];
  let current = from;
  for (const usi of moves) {
    const next = appendUSIMove(current, usi);
    if (!next) {
      throw new Error(`サンプル本の手順が不正です: ${usi} (from ${current.sfen})`);
    }
    nodes.push(next);
    current = next;
  }
  return nodes;
}

function text(markdown: string, nodeId?: string): ContentBlock {
  return { id: newNodeId(), type: "text", nodeId, markdown };
}

function buildChapter1(): Chapter {
  const root = createRoot(InitialPositionSFEN.STANDARD);

  // 本筋: ▲7六歩 △3四歩 ▲2六歩 △4四歩 ▲2五歩 △3三角 ▲4八銀 △4二飛 ▲6八玉 △6二玉
  const line = playLine(root, [
    "7g7f",
    "3c3d",
    "2g2f",
    "4c4d",
    "2f2e",
    "2b3c",
    "3i4h",
    "8b4b",
    "5i6h",
    "5a6b",
  ]);

  // 変化: 3 手目 ▲2六歩 のあと △8四歩 と居飛車に構える手順
  const branch = playLine(line[2], ["8c8d", "2f2e", "8d8e", "6i7h"]);
  branch[0].label = "△8四歩（居飛車）";

  const blocks: ContentBlock[] = [
    text(
      "## 四間飛車の出だし\n\n" +
        "この章では四間飛車の駒組みの入り口を確認する。" +
        "本文を下にスクロールすると、盤面がその箇所の局面に自動で追従する。" +
        "紙の本のように「第◯図はどこだったか」と探し直す必要はない。",
    ),
    text(
      "まず ▲7六歩 と角道を開ける。ここは相手の応手を見てから作戦を決めたい局面である。",
      line[0].id,
    ),
    text("△3四歩 と応じるのが最も自然な一手。お互いに角道が通った。", line[1].id),
    text(
      "▲2六歩 と飛車先を伸ばす。ここで後手には大きな分かれ道がある。" +
        "本筋は △4四歩 だが、変化として △8四歩 の順も用意した。" +
        "分岐ツリーから行き来できる。",
      line[2].id,
    ),
    text(
      "△4四歩。角道を止めて振り飛車を明示した。以下、飛車を 4 筋に振る形を目指す。",
      line[3].id,
    ),
    text("▲2五歩 とさらに伸ばす。後手は角の逃げ場を作る必要がある。", line[4].id),
    text("△3三角 が定番の受け。これで 2 筋の突破は防がれている。", line[5].id),
    text("▲4八銀 と自然に上がる。", line[6].id),
    {
      id: newNodeId(),
      type: "quiz",
      nodeId: line[6].id,
      markdown: "後手はどこに飛車を振るのが本筋だろうか。盤面で実際に指してみてほしい。",
      quiz: {
        answerNodeIds: [line[7].id],
        acceptableFirstMoves: ["8b4b"],
        wrongMoveComments: {
          "8b3b": "三間飛車も有力だが、この章で扱う四間飛車ではない。",
          "8b5b": "中飛車も一局。ただしここでは四間飛車を目指したい。",
        },
        explanation:
          "△4二飛。飛車を 4 筋に振るのが四間飛車である。" +
          "角道を止めた形と組み合わせてノーマル四間飛車になる。",
      },
    },
    text("△4二飛。これで四間飛車の形になった。", line[7].id),
    text("▲6八玉 と玉を囲いに向かわせる。", line[8].id),
    text("△6二玉。お互いに玉を固める段階に入った。ここから先は次章で扱う。", line[9].id),
    text(
      "### 変化: △8四歩 の場合\n\n" +
        "3 手目 ▲2六歩 に対して △8四歩 と居飛車に構える順も見ておく。",
      branch[0].id,
    ),
    text("▲2五歩 △8五歩 と、お互いに飛車先を伸ばし合う展開になる。", branch[2].id),
    text("▲7八金 と受けておくのが自然。ここからは相居飛車の戦いになる。", branch[3].id),
  ];

  return {
    id: newNodeId(),
    title: "第1章 四間飛車の出だし",
    rootSfen: root.sfen,
    tree: root,
    blocks,
  };
}

function buildChapter2(): Chapter {
  // 途中局面から始まる章の例（F-4-10）。
  // 実際には任意局面エディタで作るが、ここでは局面の合法性を保証するため
  // 平手から数手進めた結果の SFEN を初期局面として使う。
  const seed = createRoot(InitialPositionSFEN.STANDARD);
  const seeded = playLine(seed, [
    "7g7f",
    "8c8d",
    "2g2f",
    "8d8e",
    "8h7g",
    "3c3d",
    "7i8h",
    "2b7g+",
    "8h7g",
    "3a2b",
  ]);
  const sfen = seeded[seeded.length - 1].sfen;
  const root = createRoot(sfen);

  const blocks: ContentBlock[] = [
    text(
      "## 任意局面から始まる章\n\n" +
        "章の初期局面は平手に限らない。中終盤の手筋や詰将棋のように、" +
        "途中局面から解説を始めたい場合はこちらを使う。\n\n" +
        "この章は角換わりの出だしまで進んだ局面から始まっている。" +
        "先手は角を持ち駒にしているので、駒台の表示と打つ操作も確認できる。",
    ),
    text("盤面で駒を動かすと、その手が新しいノードとして手順の木に追加される。"),
  ];

  return {
    id: newNodeId(),
    title: "第2章 任意局面のサンプル",
    rootSfen: sfen,
    tree: root,
    blocks,
  };
}

export function createSampleBook(): Book {
  const now = Date.now();
  return {
    meta: {
      id: newNodeId(),
      title: "サンプル: 四間飛車のはじめかた",
      author: "shogiXbook",
      kind: "joseki",
      tags: ["振り飛車", "四間飛車"],
      privateOnly: false,
      createdAt: now,
      updatedAt: now,
      schemaVersion: BOOK_SCHEMA_VERSION,
    },
    chapters: [buildChapter1(), buildChapter2()],
  };
}
