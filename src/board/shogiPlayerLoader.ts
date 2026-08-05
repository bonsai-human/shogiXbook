/**
 * shogi-player（Web Components 版）の遅延読み込み。
 *
 * shogi-player は Vue 2 で作られており、Web Components 版のバンドルは
 * グローバルの `window.Vue` を参照する。React 側からは中身を意識したくないので、
 * ここで Vue 2 をグローバルに置いてからバンドルを読み込む処理を隠しておく。
 *
 * 遅延読み込みにしている理由:
 *   このバンドルは gzip で約 1.8MB あり、アプリ本体（約 80KB）の 20 倍以上ある。
 *   起動時に同期で読むとモバイル回線での初回表示が目に見えて遅くなるため、
 *   盤を実際に表示する段になってから読み込む。読み込みは 1 回だけ行う。
 */

let loading: Promise<void> | null = null;

export const SHOGI_PLAYER_TAG = "shogi-player-wc";

export function loadShogiPlayer(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      // フルビルド（コンパイラ込み）を使う。shogi-player の公式デモも
      // unpkg の vue@2 フルビルドを読ませているため、それに合わせる。
      const vue = await import("vue/dist/vue.esm.js");
      const globalScope = window as unknown as { Vue?: unknown };
      globalScope.Vue = (vue as { default?: unknown }).default ?? vue;

      // 副作用としてカスタム要素 <shogi-player-wc> を登録するだけのバンドル。
      await import("shogi-player/dist/wc/production/shogi-player-wc.min.js");
    })();
  }
  return loading;
}
