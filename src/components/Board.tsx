/**
 * 盤面コンポーネント。
 *
 * 操作方式について（要件定義書 F-4-14 / R-7）:
 *   駒の移動は「ドラッグ」ではなく「タップして選択 → タップして移動先を指定」とする。
 *   スマホでのフル編集が必須要件（D-8）であり、指の太さを前提とすると
 *   ドラッグは誤操作が多く、移動先も指で隠れる。タップ方式なら移動可能マスを
 *   明示でき、途中でやり直しもできる。PC でもクリック操作としてそのまま機能する。
 *
 *   この操作感の検証が P0 の目的の一つなので、実機で触って判断すること。
 */

import { useMemo, useState } from "react";
import {
  Color,
  Move,
  Piece,
  PieceType,
  Position,
  Square,
  handPieceTypes,
  pieceTypeToStringForBoard,
  parseUSIMove,
} from "tsshogi";

const CELL = 100;
const MARGIN = 46;
const BOARD_SIZE = CELL * 9;
/** 盤の右側に段のラベル（一〜九）を置くぶんの幅を確保する。 */
const VIEW_W = MARGIN + BOARD_SIZE + 44;
const VIEW_H = MARGIN + BOARD_SIZE + 6;

const FILE_LABELS = ["９", "８", "７", "６", "５", "４", "３", "２", "１"];
const RANK_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

type Selection =
  | { kind: "square"; square: Square }
  | { kind: "hand"; pieceType: PieceType }
  | null;

type PendingPromotion = {
  plain: Move;
  promoted: Move;
};

export type BoardProps = {
  /** 表示する局面（SFEN）。 */
  sfen: string;
  /** 直前の指し手（USI 形式）。移動先をハイライトする（F-2-7）。 */
  lastMoveUsi?: string | null;
  /** 盤面反転（F-2-9）。true で後手視点。 */
  flipped?: boolean;
  /** 操作を受け付けるか。閲覧専用なら false。 */
  interactive?: boolean;
  /** 合法手が指されたときに呼ばれる。 */
  onMove?: (move: Move) => void;
};

export function Board({
  sfen,
  lastMoveUsi,
  flipped = false,
  interactive = false,
  onMove,
}: BoardProps) {
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<PendingPromotion | null>(null);

  const position = useMemo(() => Position.newBySFEN(sfen), [sfen]);

  // 直前の指し手の移動先。ハイライト用。
  const lastMoveTo = useMemo(() => {
    if (!lastMoveUsi) return null;
    return parseUSIMove(lastMoveUsi)?.to ?? null;
  }, [lastMoveUsi]);

  // 選択中の駒が移動できるマスの一覧。全 81 マスを試すが、
  // 1 回の選択につき 81 回の判定なので実用上問題にならない。
  const destinations = useMemo(() => {
    if (!position || !selection || !interactive) return [];
    const from = selection.kind === "square" ? selection.square : selection.pieceType;
    return Square.all.filter((to) => {
      const move = position.createMove(from, to);
      if (!move) return false;
      return position.isValidMove(move) || position.isValidMove(move.withPromote());
    });
  }, [position, selection, interactive]);

  if (!position) {
    return <div className="board-error">局面を読み込めませんでした（SFEN: {sfen}）</div>;
  }

  const turn = position.color;

  function commit(move: Move) {
    setSelection(null);
    setPending(null);
    onMove?.(move);
  }

  function tryMove(to: Square) {
    if (!position || !selection) return;
    const from = selection.kind === "square" ? selection.square : selection.pieceType;
    const plain = position.createMove(from, to);
    if (!plain) return;

    const promoted = plain.withPromote();
    const canPlain = position.isValidMove(plain);
    const canPromote = position.isValidMove(promoted);

    if (canPlain && canPromote) {
      // 成・不成のどちらも選べる場合だけ確認する（F-4-4）。
      setPending({ plain, promoted });
      return;
    }
    if (canPromote) {
      // 行き所のない駒など、成るしかない場合は問い合わせずに成る。
      commit(promoted);
      return;
    }
    if (canPlain) {
      commit(plain);
    }
  }

  function handleSquareTap(square: Square) {
    if (!interactive || !position || pending) return;

    const piece = position.board.at(square);

    if (selection) {
      if (destinations.some((dest) => dest.equals(square))) {
        tryMove(square);
        return;
      }
      // 選択中に自分の別の駒を押したら選択し直す。
      if (piece && piece.color === turn) {
        setSelection({ kind: "square", square });
        return;
      }
      setSelection(null);
      return;
    }

    if (piece && piece.color === turn) {
      setSelection({ kind: "square", square });
    }
  }

  function handleHandTap(color: Color, pieceType: PieceType, count: number) {
    if (!interactive || pending || count <= 0 || color !== turn) return;
    if (selection?.kind === "hand" && selection.pieceType === pieceType) {
      setSelection(null);
      return;
    }
    setSelection({ kind: "hand", pieceType });
  }

  const topColor = flipped ? Color.BLACK : Color.WHITE;
  const bottomColor = flipped ? Color.WHITE : Color.BLACK;

  return (
    <div className="board-area">
      <HandView
        color={topColor}
        position={position}
        selection={selection}
        active={interactive && topColor === turn}
        onTap={handleHandTap}
      />

      <svg
        className="board"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`将棋盤 局面 ${sfen}`}
      >
        <rect
          x={MARGIN}
          y={MARGIN}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          className="board-bg"
        />

        {/* 筋・段のラベル */}
        {FILE_LABELS.map((label, i) => {
          const index = flipped ? 8 - i : i;
          return (
            <text
              key={`file-${i}`}
              className="board-label"
              x={MARGIN + index * CELL + CELL / 2}
              y={MARGIN - 14}
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
        {RANK_LABELS.map((label, i) => {
          const index = flipped ? 8 - i : i;
          return (
            <text
              key={`rank-${i}`}
              className="board-label"
              x={MARGIN + BOARD_SIZE + 22}
              y={MARGIN + index * CELL + CELL / 2 + 10}
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {/* マス */}
        {Square.all.map((square) => {
          const { x, y } = squareToXY(square, flipped);
          const piece = position.board.at(square);
          const isSelected =
            selection?.kind === "square" && selection.square.equals(square);
          const isDestination = destinations.some((dest) => dest.equals(square));
          const isLastMoveTo = lastMoveTo?.equals(square) ?? false;

          return (
            <g key={square.index}>
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                className={[
                  "square",
                  isLastMoveTo ? "square--last" : "",
                  isSelected ? "square--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleSquareTap(square)}
              />
              {piece && <PieceGlyph piece={piece} x={x} y={y} flipped={flipped} />}
              {isDestination && (
                <circle
                  cx={x + CELL / 2}
                  cy={y + CELL / 2}
                  r={piece ? CELL * 0.44 : CELL * 0.16}
                  className={piece ? "destination destination--capture" : "destination"}
                  onClick={() => handleSquareTap(square)}
                />
              )}
            </g>
          );
        })}

        {/* 罫線。マスの上に重ねて描く。 */}
        <g className="board-lines" pointerEvents="none">
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={MARGIN + i * CELL}
              y1={MARGIN}
              x2={MARGIN + i * CELL}
              y2={MARGIN + BOARD_SIZE}
            />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={MARGIN}
              y1={MARGIN + i * CELL}
              x2={MARGIN + BOARD_SIZE}
              y2={MARGIN + i * CELL}
            />
          ))}
          {/* 星 */}
          {[3, 6].flatMap((fx) =>
            [3, 6].map((fy) => (
              <circle
                key={`star-${fx}-${fy}`}
                cx={MARGIN + fx * CELL}
                cy={MARGIN + fy * CELL}
                r={5}
                className="board-star"
              />
            )),
          )}
        </g>
      </svg>

      <HandView
        color={bottomColor}
        position={position}
        selection={selection}
        active={interactive && bottomColor === turn}
        onTap={handleHandTap}
      />

      {pending && (
        <div className="promotion-overlay" role="dialog" aria-label="成りの選択">
          <div className="promotion-dialog">
            <p>成りますか？</p>
            <div className="promotion-buttons">
              <button type="button" onClick={() => commit(pending.promoted)}>
                成る
              </button>
              <button type="button" onClick={() => commit(pending.plain)}>
                不成
              </button>
            </div>
            <button
              type="button"
              className="promotion-cancel"
              onClick={() => setPending(null)}
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function squareToXY(square: Square, flipped: boolean) {
  const col = flipped ? 8 - square.x : square.x;
  const row = flipped ? 8 - square.y : square.y;
  return { x: MARGIN + col * CELL, y: MARGIN + row * CELL };
}

function PieceGlyph({
  piece,
  x,
  y,
  flipped,
}: {
  piece: Piece;
  x: number;
  y: number;
  flipped: boolean;
}) {
  // 後手の駒は 180 度回転して表示する。盤面反転時は先手側が回る。
  const upsideDown = flipped ? piece.color === Color.BLACK : piece.color === Color.WHITE;
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;
  return (
    <text
      className="piece"
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      pointerEvents="none"
      transform={upsideDown ? `rotate(180 ${cx} ${cy})` : undefined}
    >
      {pieceTypeToStringForBoard(piece.type)}
    </text>
  );
}

function HandView({
  color,
  position,
  selection,
  active,
  onTap,
}: {
  color: Color;
  position: Position;
  selection: Selection;
  active: boolean;
  onTap: (color: Color, pieceType: PieceType, count: number) => void;
}) {
  const hand = position.hand(color);
  const label = color === Color.BLACK ? "▲先手" : "△後手";

  return (
    <div className={`hand hand--${color}${active ? " hand--active" : ""}`}>
      <span className="hand-label">{label}</span>
      <div className="hand-pieces">
        {handPieceTypes.map((pieceType) => {
          const count = hand.count(pieceType);
          if (count === 0) return null;
          const selected =
            active && selection?.kind === "hand" && selection.pieceType === pieceType;
          return (
            <button
              key={pieceType}
              type="button"
              className={`hand-piece${selected ? " hand-piece--selected" : ""}`}
              disabled={!active}
              onClick={() => onTap(color, pieceType, count)}
            >
              <span className="hand-piece-name">
                {pieceTypeToStringForBoard(pieceType)}
              </span>
              {count > 1 && <span className="hand-piece-count">{count}</span>}
            </button>
          );
        })}
        {hand.counts.every(({ count }) => count === 0) && (
          <span className="hand-empty">なし</span>
        )}
      </div>
    </div>
  );
}
