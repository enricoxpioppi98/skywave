// Maidenhead grid locator utilities.
// https://en.wikipedia.org/wiki/Maidenhead_Locator_System
//
// Accepts 2, 4, or 6 character grids: AA, AA00, AA00aa.
// 2 chars → 10° × 20° field
// 4 chars → 1° × 2° square
// 6 chars → 2.5' × 5' subsquare

const FIELD = 18;   // A-R
const SQUARE = 10;  // 0-9
const SUBSQ = 24;   // a-x

export function isValidGrid(grid: string): boolean {
  const g = grid.trim().toUpperCase();
  if (g.length < 2 || g.length > 6 || g.length % 2 !== 0) return false;
  if (!/^[A-R]{2}/.test(g)) return false;
  if (g.length >= 4 && !/^[A-R]{2}[0-9]{2}/.test(g)) return false;
  if (g.length === 6 && !/^[A-R]{2}[0-9]{2}[A-X]{2}$/.test(g)) return false;
  return true;
}

/**
 * Convert Maidenhead grid to the lat/lon of its center.
 * Returns null if invalid.
 */
export function gridToLatLon(grid: string): { lat: number; lon: number } | null {
  const g = grid.trim().toUpperCase();
  if (!isValidGrid(g)) return null;

  let lon = (g.charCodeAt(0) - "A".charCodeAt(0)) * 20 - 180;
  let lat = (g.charCodeAt(1) - "A".charCodeAt(0)) * 10 - 90;

  if (g.length >= 4) {
    lon += parseInt(g[2], 10) * 2;
    lat += parseInt(g[3], 10);
  }
  if (g.length === 6) {
    lon += (g.charCodeAt(4) - "A".charCodeAt(0)) * (2 / SUBSQ);
    lat += (g.charCodeAt(5) - "A".charCodeAt(0)) * (1 / SUBSQ);
  }

  // Center of the cell
  const lonStep = g.length >= 6 ? 2 / SUBSQ : g.length >= 4 ? 2 : 20;
  const latStep = g.length >= 6 ? 1 / SUBSQ : g.length >= 4 ? 1 : 10;
  return { lat: lat + latStep / 2, lon: lon + lonStep / 2 };
}
