/**
 * 動作確認用のサンプル本。
 *
 * SFEN を直接書かず、初期局面から USI 形式の指し手を積んで組み立てる。
 * こうすると不正な局面が入り込まないうえ、手順を書き換えたときに
 * 各ノードの SFEN が自動的に整合する。
 *
 * 紙面の構造（ページめくり / 章＝ページ / スクロール）を見比べるための本なので、
 * ページが複数枚になる程度の分量と、3 種類の図面をひと通り入れてある。
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

function diagram(from: MoveNode, to: MoveNode | null, caption: string): ContentBlock {
  return {
    id: newNodeId(),
    type: "diagram",
    nodeId: from.id,
    markdown: "",
    diagram: { fromNodeId: from.id, toNodeId: to?.id, caption },
  };
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
        "四間飛車は、飛車を左から四筋目に振る戦法である。" +
        "角道を止めて自陣を整えてから戦いに入るため、序盤で一気に決着がつくことが少なく、" +
        "駒組みの手順を覚えれば安定して戦える。まずは出だしの数手を確認しておきたい。",
    ),
    text(
      "▲7六歩 と角道を開ける。この一手だけでは居飛車にも振り飛車にも進めるので、" +
        "相手の応手を見てから方針を決めればよい。△3四歩 と応じられるのが最も自然で、" +
        "お互いの角道が通った形になる。",
    ),
    text(
      "続いて ▲2六歩 と飛車先を伸ばす。ここが後手にとって最初の分かれ道になる。" +
        "本書で扱う四間飛車を目指すなら △4四歩 と角道を止める。",
    ),
    diagram(line[2], line[5], "第1図"),
    text(
      "第1図から △4四歩 ▲2五歩 △3三角 と進む。" +
        "△3三角 は 2筋の突破を受ける定番の一手で、これを省くと ▲2四歩 △同歩 ▲同飛 で" +
        "歩を持たれてしまう。**角を上がる前に ▲2五歩 を利かされている**点も大切で、" +
        "後手は角の逃げ場をあらかじめ用意しておく必要がある。",
    ),
    text(
      "▲4八銀 と自然に上がったところで、いよいよ飛車を振る。" +
        "四間飛車という名前のとおり、飛車の移動先は 4筋である。",
    ),
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
          "△4二飛。飛車を 4筋に振るのが四間飛車である。" +
          "角道を止めた形と組み合わせてノーマル四間飛車になる。",
      },
    },
    diagram(line[7], null, "第2図"),
    text(
      "第2図が四間飛車の基本形である。ここから ▲6八玉 △6二玉 と、" +
        "お互いに玉を安全な場所へ移していく。振り飛車は飛車と反対側に玉を囲うのが原則で、" +
        "後手番なら右側、つまり 8筋の方向へ玉を運ぶことになる。",
    ),
    text(
      "駒組みの続きは次章で扱うが、方針だけ先に述べておく。" +
        "美濃囲いに組んで玉を固め、相手の仕掛けを待って慎重に対応する。" +
        "四間飛車が「待ちの戦法」と言われるのはこのためである。",
    ),
    text(
      "### 変化: △8四歩 の場合\n\n" +
        "3手目 ▲2六歩 に対して △8四歩 と居飛車に構える順も見ておきたい。" +
        "この場合はお互いに飛車先を伸ばし合う相居飛車の戦いになり、" +
        "本書の範囲からは外れるが、相手がこう来る可能性は知っておくべきである。",
    ),
    diagram(branch[0], branch[3], "第3図"),
    text(
      "▲2五歩 △8五歩 ▲7八金 と進む。▲7八金 は 8筋の突破を受けた自然な一手で、" +
        "ここから角換わりや矢倉といった相居飛車の戦型へ分かれていく。",
    ),
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
  const line = playLine(root, ["3i3h", "7a6b", "3g3f", "5a5b"]);

  const blocks: ContentBlock[] = [
    text(
      "## 任意局面から始まる章\n\n" +
        "章の初期局面は平手に限らない。中終盤の手筋や詰将棋のように、" +
        "途中局面から解説を始めたい場合はこちらを使う。" +
        "この章は角換わりの出だしまで進んだ局面から始まっている。",
    ),
    diagram(root, line[3], "第4図"),
    text(
      "先手は角を持ち駒にしているので、図の下にある駒台の表示も確認できる。" +
        "▲3八銀 △6二銀 ▲3六歩 △5二玉 と、お互いに駒組みを進めていく形である。",
    ),
    text(
      "盤面で駒を動かすと、その手が新しいノードとして手順の木に追加される。" +
        "既存の手と違う手を指せば、それは新しい分岐として記録される。",
    ),
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
