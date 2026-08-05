/**
 * Material Design Icons を public/ 以下に取り込む。
 *
 * shogi-player は自身の Shadow DOM 内のスタイルシートから
 *   @import url(https://cdn.jsdelivr.net/npm/@mdi/font/...)
 * で CDN のアイコンフォントを読み込む。この URL はビルド済みバンドルに
 * 直書きされている。
 *
 * そのままだと
 *   - オフラインで盤面の操作 UI のアイコンが出ない（要件 NF-6）
 *   - 利用者の環境から外部 CDN へ通信が飛ぶ（要件 NF-8）
 * の 2 点に反するため、CSS とフォントを自前で配信する。
 * URL の差し替えは vite.config.ts のプラグインで行う。
 *
 * Shadow DOM の中からは通常の import 経由のスタイルが届かないので、
 * バンドラに任せず public/ に実ファイルとして置く必要がある。
 *
 * woff2 だけを置き、@font-face の src も woff2 のみに書き換える。
 * eot/ttf/woff まで含めると 3MB 以上になるが、対応ブラウザ（NF-1）は
 * すべて woff2 を読めるため不要。
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/@mdi/font");
const dest = resolve(root, "public/vendor/mdi");

mkdirSync(resolve(dest, "css"), { recursive: true });
mkdirSync(resolve(dest, "fonts"), { recursive: true });

const css = readFileSync(resolve(src, "css/materialdesignicons.min.css"), "utf8");

// @font-face の src を woff2 だけにする。元は eot/woff2/woff/ttf が並んでいる。
const trimmed = css.replace(/src:url\([^)]*\)[^;}]*/g, () =>
  'src:url(../fonts/materialdesignicons-webfont.woff2) format("woff2")',
);

if (trimmed === css) {
  throw new Error("@font-face の src を書き換えられませんでした。@mdi/font の形式を確認してください。");
}

writeFileSync(resolve(dest, "css/materialdesignicons.min.css"), trimmed);
copyFileSync(
  resolve(src, "fonts/materialdesignicons-webfont.woff2"),
  resolve(dest, "fonts/materialdesignicons-webfont.woff2"),
);

console.log("public/vendor/mdi へ Material Design Icons を配置しました。");
