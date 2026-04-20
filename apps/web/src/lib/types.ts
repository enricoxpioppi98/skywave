export interface Spot {
  id: number;
  observed_at: string;
  band: number;
  frequency_mhz: number;
  tx_sign: string;
  tx_lat: number;
  tx_lon: number;
  tx_grid: string;
  rx_sign: string;
  rx_lat: number;
  rx_lon: number;
  rx_grid: string;
  distance_km: number;
  azimuth: number | null;
  snr: number | null;
  power_dbm: number | null;
  drift: number | null;
}

export interface UserPreferences {
  user_id: string;
  listening_post_grid: string;
  favorite_bands: number[];
  callsign: string | null;
  created_at: string;
  updated_at: string;
}
