import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages のプロジェクトサイトは https://<user>.github.io/<repo>/ に配信されるため、
// base にリポジトリ名を含める必要がある。CI 側で BASE_PATH を渡す（.github/workflows/deploy.yml）。
// ローカル開発では未設定なので "/" になる。
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
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
