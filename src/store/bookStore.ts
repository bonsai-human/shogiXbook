/**
 * アプリケーション状態。
 *
 * 盤面・本文・分岐ツリーの 3 者が同じ「現在ノード」を共有し、どこから操作しても
 * 他が追従する構造なので、状態は 1 か所にまとめる（要件定義書 8. 状態管理）。
 */

import { create } from "zustand";
import type { Move } from "tsshogi";
import type { Book, Chapter, MoveNode } from "../types/book";
import { appendMove, findNode, findParent, findPath } from "../shogi/tree";
import { createSampleBook } from "../data/sampleBook";

/**
 * 現在ノードを変更した主体。本文↔盤面の双方向連動（F-2-2 / F-2-3）が
 * 無限ループしないよう、変更元を記録して追従の要否を判断する。
 */
export type NavSource = "text" | "board" | "tree" | "init";

type BookState = {
  book: Book;
  chapterIndex: number;
  currentNodeId: string;
  lastNavSource: NavSource;
  /** 盤面反転（F-2-9）。 */
  flipped: boolean;
  /** 本文スクロールへの盤面追従（F-2-4）。 */
  autoFollow: boolean;
  /** 閲覧モードと編集モードは同一レイアウトの切り替えとする（要件定義書 V-3）。 */
  editing: boolean;
  /** 木を破壊的に更新したことを React に伝えるためのカウンタ。 */
  revision: number;

  chapter: () => Chapter;
  currentNode: () => MoveNode;
  currentPath: () => MoveNode[];

  setChapter: (index: number) => void;
  setCurrentNode: (nodeId: string, source: NavSource) => void;
  goBack: () => void;
  goForward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  /** 現在ノードに指し手を追加し、その手に進む（F-4-1 / F-4-2）。 */
  playMove: (move: Move) => void;
  toggleFlip: () => void;
  toggleAutoFollow: () => void;
  toggleEditing: () => void;
  loadBook: (book: Book) => void;
};

export function createBookStore(initialBook: Book) {
  return create<BookState>((set, get) => ({
    book: initialBook,
    chapterIndex: 0,
    currentNodeId: initialBook.chapters[0].tree.id,
    lastNavSource: "init",
    flipped: false,
    autoFollow: true,
    editing: false,
    revision: 0,

    chapter: () => get().book.chapters[get().chapterIndex],

    currentNode: () => {
      const chapter = get().chapter();
      return findNode(chapter.tree, get().currentNodeId) ?? chapter.tree;
    },

    currentPath: () => {
      const chapter = get().chapter();
      return findPath(chapter.tree, get().currentNodeId) ?? [chapter.tree];
    },

    setChapter: (index) => {
      const book = get().book;
      if (index < 0 || index >= book.chapters.length) return;
      set({
        chapterIndex: index,
        currentNodeId: book.chapters[index].tree.id,
        lastNavSource: "init",
      });
    },

    setCurrentNode: (nodeId, source) => {
      if (get().currentNodeId === nodeId) return;
      set({ currentNodeId: nodeId, lastNavSource: source });
    },

    goBack: () => {
      const chapter = get().chapter();
      const parent = findParent(chapter.tree, get().currentNodeId);
      if (parent) set({ currentNodeId: parent.id, lastNavSource: "board" });
    },

    goForward: () => {
      const node = get().currentNode();
      // 分岐がある場合は先頭の子（本筋）へ進む。
      if (node.children.length > 0) {
        set({ currentNodeId: node.children[0].id, lastNavSource: "board" });
      }
    },

    goToStart: () => {
      set({ currentNodeId: get().chapter().tree.id, lastNavSource: "board" });
    },

    goToEnd: () => {
      let node = get().currentNode();
      while (node.children.length > 0) node = node.children[0];
      set({ currentNodeId: node.id, lastNavSource: "board" });
    },

    playMove: (move) => {
      const state = get();
      const node = state.currentNode();
      const child = appendMove(node, move);
      if (!child) return;
      // appendMove は木を破壊的に更新するため、book の参照を作り直して再描画させる。
      const book = { ...state.book, chapters: [...state.book.chapters] };
      book.chapters[state.chapterIndex] = { ...state.chapter() };
      set({
        book,
        currentNodeId: child.id,
        lastNavSource: "board",
        revision: state.revision + 1,
      });
    },

    toggleFlip: () => set({ flipped: !get().flipped }),
    toggleAutoFollow: () => set({ autoFollow: !get().autoFollow }),
    toggleEditing: () => set({ editing: !get().editing }),

    loadBook: (book) =>
      set({
        book,
        chapterIndex: 0,
        currentNodeId: book.chapters[0].tree.id,
        lastNavSource: "init",
        revision: get().revision + 1,
      }),
  }));
}

export type BookStore = ReturnType<typeof createBookStore>;

/**
 * アプリ全体で共有するストア。
 * 現状は本を 1 冊だけ開く前提。本棚（V-1）を実装する際に loadBook で差し替える。
 */
export const useBookStore = createBookStore(createSampleBook());
