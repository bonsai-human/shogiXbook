/**
 * 図面を棋書の紙面に近づけるための見た目の設定。
 *
 * shogi-player の既定は対局用の見た目（木目調の盤、色つきの駒）で、
 * 本の紙面には合わない。棋書の図面は「白地に細い黒罫、線画の駒」である。
 *
 * shogi-player は Shadow DOM 内に描画するので、外側の CSS は届かない。
 * ただし `sp_pass_css` に渡した文字列は Shadow DOM 内へ <style> として
 * 差し込まれるため、そこから CSS カスタムプロパティを上書きする。
 *
 * 色は直値ではなく shogiXbook 側の変数を参照している。カスタムプロパティは
 * Shadow DOM の境界を越えて継承されるので、これで明暗テーマに追従できる。
 */

/** 紙面風の駒（線画）。shogi-player が持つ駒デザインのひとつ。 */
export const KISHO_PIECE_VARIANT = "paper";

/** 盤の地模様なし。木目などが入ると紙面から浮く。 */
export const KISHO_BOARD_VARIANT = "none";

export const KISHO_BOARD_CSS = `
.ShogiPlayer {
  --sp_board_color: var(--diagram-board-bg);
  --sp_board_even_cell_color: transparent;
  --sp_board_odd_cell_color: transparent;
  --sp_grid_inner_color: var(--diagram-grid);
  --sp_grid_outer_color: var(--diagram-grid-outer);
  --sp_grid_inner_stroke: 1;
  --sp_grid_outer_stroke: 2;
  --sp_board_edge_stroke: 0;
  --sp_board_radius: 0;
  --sp_stand_bg_color: transparent;
  --sp_star_size: 0.05;
  --sp_board_piece_size: 0.92;

  /*
   * 座標（筋・段）。既定はセル高の 0.128 倍で、図が小さいと 4px 程度になり読めない。
   * 棋書の図では筋・段が読めることが前提なので大きくする。
   */
  --sp_coordinate_x_size: 0.30;
  --sp_coordinate_y_size: 0.30;
  --sp_coordinate_x_push: 0.16;
  --sp_coordinate_y_push: 0.16;
  --sp_coordinate_color: var(--diagram-coordinate);
}
`;
