// 型定義を持たない外部バンドルの宣言。
// shogi-player は Vue 2 製で型定義を同梱しておらず、Web Components 版は
// 副作用としてカスタム要素を登録するだけなので、中身の型は不要。
declare module "vue/dist/vue.esm.js";
declare module "shogi-player/dist/wc/production/shogi-player-wc.min.js";
