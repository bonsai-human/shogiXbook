import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages のプロジェクトサイトは https://<user>.github.io/<repo>/ に配信されるため、
// base にリポジトリ名を含める必要がある。CI 側で BASE_PATH を渡す（.github/workflows/deploy.yml）。
// ローカル開発では未設定なので "/" になる。
const base = process.env.BASE_PATH || "/";

const MDI_CDN_URL = "https://cdn.jsdelivr.net/npm/@mdi/font/css/materialdesignicons.min.css";

/**
 * shogi-player が Shadow DOM 内から読み込む Material Design Icons の URL を、
 * 自前で配信するものに差し替える。
 *
 * この URL はビルド済みバンドルに直書きされており、コンポーネントの props では
 * 変更できない。放置するとオフラインでアイコンが出ず（NF-6）、利用者の環境から
 * 外部 CDN へ通信が飛ぶ（NF-8）。実ファイルの配置は scripts/vendor-mdi.mjs が行う。
 */
function selfHostMdi(): Plugin {
  let seen = false;
  let replaced = false;
  return {
    name: "shogixbook:self-host-mdi",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("shogi-player")) return null;
      seen = true;
      if (!code.includes(MDI_CDN_URL)) return null;
      replaced = true;
      return { code: code.split(MDI_CDN_URL).join(`${base}vendor/mdi/css/materialdesignicons.min.css`), map: null };
    },
    buildEnd() {
      // 差し替えに失敗すると外部通信が復活してしまうため、黙って通さない。
      // shogi-player を読み込まないビルド（テスト等）では何も言わない。
      if (seen && !replaced) {
        this.warn(
          "shogi-player 内の Material Design Icons の URL を差し替えられませんでした。" +
            "shogi-player を更新した場合は vite.config.ts の MDI_CDN_URL を確認してください。",
        );
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [selfHostMdi(), react()],
  optimizeDeps: {
    // 依存の事前バンドルを通すと上の transform が適用されないため、除外して素のまま扱う。
    exclude: ["shogi-player"],
  },
  build: {
    // shogi-player 単体で 3.5MB あり、既定のしきい値では毎回警告が出る。
    // 遅延読み込みで別チャンクに分かれていることは確認済み。
    chunkSizeWarningLimit: 4000,
  },
  server: {
    // 将来 WASM エンジン（SharedArrayBuffer 使用）を組み込む際、開発サーバでは
    // これらのヘッダを直接付与できる。本番（GitHub Pages）ではヘッダを設定できないため、
    // 要件定義書 9.3 の通り Service Worker 方式 + シングルスレッド版フォールバックで対応する。
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
