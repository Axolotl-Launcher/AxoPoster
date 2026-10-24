// The source uses a staggered grid with diagonal bands of changing dot radii.
// A whole number of rows per cycle keeps the top/bottom tile seam continuous.
export function createHalftoneTile() {
  const width = 568;
  const pitch = 19.2;
  const rowHeight = pitch / 2;
  const rows = 120;
  const height = rowHeight * rows;
  const bandHeight = height / 2;
  const maxRadius = 6.6;
  const circles = [];
  const round = (value) => Number(value.toFixed(3));

  for (let row = -1; row <= rows; row++) {
    const cy = 5 + row * rowHeight;
    for (let column = -1; column <= Math.ceil(width / pitch); column++) {
      const cx = 5 + column * pitch + (row & 1) * rowHeight;
      const phase = (cy + cx / Math.sqrt(3) - 200) / bandHeight;
      const density = Math.max(0, (1 + Math.cos(phase * Math.PI * 2)) / 2);
      const radius = density < 0.01 ? 0 : maxRadius * Math.sqrt(density);
      circles.push(`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="#fff">${circles.join("")}</g></svg>`;
}
