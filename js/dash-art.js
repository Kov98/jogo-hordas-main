// Pixel glyphs and wisps; SPR.make skips textures already registered.
function drawDashAssets(scene) {
  SPR.make(scene, 'i_dash', 16, 16, 1, 3, P => {
    P.r(1, 1, 14, 14, '#171323'); P.r(2, 2, 12, 1, '#4b3f61');
    P.line(6, 4, 10, 8, '#fff4d2', 2); P.line(10, 8, 6, 12, '#fff4d2', 2);
    P.line(3, 5, 6, 8, '#e7ae59'); P.line(6, 8, 3, 11, '#e7ae59');
    P.r(2, 7, 3, 2, '#8d88bc'); P.p(12, 8, '#ffffff');
  });
  SPR.make(scene, 'fx_dash_trail', 16, 8, 1, 2, P => {
    P.r(2, 3, 12, 2, '#ffffff'); P.r(5, 2, 8, 1, '#e9e8ff');
    P.r(7, 5, 6, 1, '#b5b6dd'); P.r(0, 3, 1, 1, '#a4a2cc');
  });
  SPR.make(scene, 'fx_dash_smoke', 16, 16, 1, 2, P => {
    P.disc(6, 9, 4, '#b1b3c7'); P.disc(10, 7, 4, '#d0d1e1');
    P.disc(10, 11, 3, '#8b8ba5'); P.disc(5, 7, 2, '#ece9f4');
    P.r(8, 4, 3, 1, '#ffffff'); P.p(2, 5, '#d6cce9');
  });
}
