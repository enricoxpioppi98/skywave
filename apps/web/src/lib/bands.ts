// WSPR bands — `band` in wspr.live is the integer-truncated MHz frequency.
// e.g. band=7 means 40m (7.0 MHz), band=14 means 20m (14.0 MHz).

export interface BandMeta {
  band: number;
  name: string;          // "40m", "20m" — by convention wavelength in meters
  freqMHz: number;       // nominal center freq
  color: string;         // arc color on globe (hex)
}

// Harmonised palette: all swatches tuned to similar lightness + chroma on a
// dark background so the 13 bands read as a coordinated spectrum rather than
// 13 arbitrary accents. Hue progresses low-freq → high-freq around the wheel:
// violet → rose → peach → butter → lime → mint → aqua → sky → periwinkle.
export const BANDS: BandMeta[] = [
  { band: 0,   name: "LF/MF",     freqMHz: 0.5,    color: "#6b5ca5" },
  { band: 1,   name: "160m",      freqMHz: 1.84,   color: "#7e6bc2" },
  { band: 3,   name: "80m",       freqMHz: 3.57,   color: "#9572d4" },
  { band: 5,   name: "60m",       freqMHz: 5.36,   color: "#b673cf" },
  { band: 7,   name: "40m",       freqMHz: 7.04,   color: "#d97aa3" },
  { band: 10,  name: "30m",       freqMHz: 10.14,  color: "#ef8f6e" },
  { band: 14,  name: "20m",       freqMHz: 14.097, color: "#f5b870" },
  { band: 18,  name: "17m",       freqMHz: 18.106, color: "#e8d270" },
  { band: 21,  name: "15m",       freqMHz: 21.096, color: "#b5d683" },
  { band: 24,  name: "12m",       freqMHz: 24.926, color: "#7cd4a0" },
  { band: 28,  name: "10m",       freqMHz: 28.126, color: "#5fc9c4" },
  { band: 50,  name: "6m",        freqMHz: 50.294, color: "#6fb0e6" },
  { band: 144, name: "2m",        freqMHz: 144.49, color: "#a8a7e6" },
];

export const BAND_BY_INT = new Map(BANDS.map((b) => [b.band, b]));

export function bandLabel(band: number): string {
  return BAND_BY_INT.get(band)?.name ?? `${band} MHz`;
}

export function bandColor(band: number): string {
  return BAND_BY_INT.get(band)?.color ?? "#888";
}

// Default favorites for new users: workhorses of HF propagation.
export const DEFAULT_FAVORITE_BANDS = [7, 10, 14];
