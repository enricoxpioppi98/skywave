// WSPR bands — `band` in wspr.live is the integer-truncated MHz frequency.
// e.g. band=7 means 40m (7.0 MHz), band=14 means 20m (14.0 MHz).

export interface BandMeta {
  band: number;
  name: string;          // "40m", "20m" — by convention wavelength in meters
  freqMHz: number;       // nominal center freq
  color: string;         // arc color on globe (hex)
}

export const BANDS: BandMeta[] = [
  { band: 0,   name: "LF/MF",     freqMHz: 0.5,    color: "#3a2b5e" },
  { band: 1,   name: "160m",      freqMHz: 1.84,   color: "#5a2b7e" },
  { band: 3,   name: "80m",       freqMHz: 3.57,   color: "#7e2b9e" },
  { band: 5,   name: "60m",       freqMHz: 5.36,   color: "#b02e8f" },
  { band: 7,   name: "40m",       freqMHz: 7.04,   color: "#e04e6a" },
  { band: 10,  name: "30m",       freqMHz: 10.14,  color: "#ff7a44" },
  { band: 14,  name: "20m",       freqMHz: 14.097, color: "#ffb63d" },
  { band: 18,  name: "17m",       freqMHz: 18.106, color: "#e4e83d" },
  { band: 21,  name: "15m",       freqMHz: 21.096, color: "#9cd84a" },
  { band: 24,  name: "12m",       freqMHz: 24.926, color: "#4ed898" },
  { band: 28,  name: "10m",       freqMHz: 28.126, color: "#4ec8d8" },
  { band: 50,  name: "6m",        freqMHz: 50.294, color: "#6ea6ff" },
  { band: 144, name: "2m",        freqMHz: 144.49, color: "#a6a6ff" },
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
