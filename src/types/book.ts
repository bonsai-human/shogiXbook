/**
 * shogiXbook のデータモデル。
 *
 * 設計方針（要件定義書 7.1）:
 *   「文章の列」と「手順の木」を別の構造として持ち、文章側から手順側のノードを参照する。
 *
 *   素朴な設計は「手順の各ノードにコメントを付ける」（KIF 等の棋譜フォーマットと同じ構造）だが、
 *   それでは棋書を表現できない。棋書の本文には
 *     - 手順の前に置かれる導入文（まだどの局面でもない）
 *     - 1 つの局面について数段落にわたる長い解説
 *     - 複数の変化をまたいでの総括
 *   が含まれ、「1 ノード = 1 コメント」に収まらないため。
 */

/** データ形式のバージョン。読み込み時のマイグレーション判定に使う（要件定義書 F-7-8）。 */
export const BOOK_SCHEMA_VERSION = 1;

/** 本の種別。既定の編集 UI が変わる（F-1-4）。 */
export type BookKind = "joseki" | "tesuji" | "problems" | "gameNotes";

export type BookMeta = {
  id: string;
  title: string;
  /** 本の著者（この本を書いた人）。 */
  author?: string;
  kind: BookKind;
  /** 戦法名などのタグ。横串検索に使う（F-1-3）。 */
  tags: string[];
  /**
   * 出典。既存の棋書を電子化した場合に書名等を記録する（F-1-5）。
   * 将来 L-4（共有機能）を実装する際、既存棋書由来の本を機械的に共有対象から
   * 除外するための布石。後から足すとデータ移行が必要になるため初版から持つ。
   */
  source?: string;
  /** 私的利用限定フラグ。true の本は将来の共有機能の対象外とする（F-1-5）。 */
  privateOnly: boolean;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
};

/**
 * 手順ノード。手順の木の 1 要素。
 *
 * sfen をノードに持つのは冗長だが意図的である。局面検索（F-6-2）と解析結果の
 * キャッシュ（F-8-12）を、木を辿り直さずに実現するため。容量よりも検索速度と
 * 実装の単純性を優先している（要件定義書 7.3）。
 */
export type MoveNode = {
  id: string;
  /** この局面に至る直前の指し手（USI 形式）。ルートノードは null。 */
  usi: string | null;
  /** この指し手を「指した後」の局面。 */
  sfen: string;
  /** 子ノード。先頭を本筋とする（F-3-6 の並べ替えはこの配列順を変える）。 */
  children: MoveNode[];
  /** 分岐名（F-3-5）。例: 「△4二銀型」 */
  label?: string;
  /** エンジン解析結果のキャッシュ（F-8-12）。第二版で使用。 */
  evaluation?: Evaluation;
};

export type Evaluation = {
  /** 先手から見た評価値（歩 = 100 相当）。 */
  score?: number;
  /** 詰みまでの手数。正なら先手勝ち。 */
  mate?: number;
  /** 読み筋（USI 形式の指し手列）。 */
  pv?: string[];
  depth?: number;
  engineName?: string;
  evaluatedAt?: number;
};

/** 本文ブロックの種別。 */
export type BlockType = "text" | "diagram" | "quiz";

/**
 * 本文中の図面。
 *
 * 図はそれぞれ短い手順を持ち、図の下の送りでその場で進められる。
 * 静止図やページ主図といった案も試したが、採らないことになった。
 */
export type Diagram = {
  /** 図が示す局面のノード。 */
  fromNodeId: string;
  /** ここまで手順を進められる。省略時はこの局面だけを示す。 */
  toNodeId?: string;
  /** 「第1図」などの図番号。 */
  caption?: string;
};

/**
 * 本文ブロック。
 *
 * nodeId が本文と盤面の連動の実体である（F-2-2）。
 * nodeId が undefined のブロックは特定の局面に紐づかない（章の導入文など）。
 */
export type ContentBlock = {
  id: string;
  type: BlockType;
  /** 紐づく手順ノードの id。 */
  nodeId?: string;
  /** 本文。可搬性のため Markdown とする（F-4-7）。 */
  markdown: string;
  /** type === "quiz" のときの出題定義。 */
  quiz?: Quiz;
  /** type === "diagram" のときの図面定義。 */
  diagram?: Diagram;
};

/** 次の一手（問題）の定義（F-5）。 */
export type Quiz = {
  /** 正解手順のノード id 列。複数手の詰将棋にも対応する（F-5-5）。 */
  answerNodeIds: string[];
  /** 正解として認める初手（USI 形式）。複数正解に対応する（F-5-1）。 */
  acceptableFirstMoves: string[];
  /** よくある間違いへの個別解説（F-5-4）。キーは USI 形式の指し手。 */
  wrongMoveComments?: Record<string, string>;
  /** 解説。 */
  explanation: string;
};

export type Chapter = {
  id: string;
  title: string;
  /** 章の初期局面。平手のほか、中終盤の局面や詰将棋の図も置ける（F-4-10）。 */
  rootSfen: string;
  /** 手順の木。ルートノードの usi は null で、sfen は rootSfen と一致する。 */
  tree: MoveNode;
  /** 本文ブロックの列。表示順はこの配列順。 */
  blocks: ContentBlock[];
};

export type Book = {
  meta: BookMeta;
  chapters: Chapter[];
};

/**
 * 読者メモ（F-6-7）。
 *
 * 本文とは別レイヤーとして保持する。本を上書きせずに書き込みができること、
 * および将来 L-4（共有）で「本文は配布し、メモは配布しない」という切り分けが
 * 自然にできることが狙い。
 */
export type Annotation = {
  id: string;
  bookId: string;
  chapterId: string;
  nodeId: string;
  markdown: string;
  createdAt: number;
  updatedAt: number;
};
