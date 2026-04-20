-- skywave: spots + user_preferences + RLS

create table public.spots (
  id              bigint primary key,
  observed_at     timestamptz not null,
  band            smallint not null,
  frequency_mhz   double precision not null,
  tx_sign         text not null,
  tx_lat          double precision not null,
  tx_lon          double precision not null,
  tx_grid         text not null,
  rx_sign         text not null,
  rx_lat          double precision not null,
  rx_lon          double precision not null,
  rx_grid         text not null,
  distance_km     integer not null,
  azimuth         smallint,
  snr             smallint,
  power_dbm       smallint,
  drift           smallint,
  ingested_at     timestamptz not null default now()
);

create index spots_observed_at_desc on public.spots (observed_at desc);
create index spots_band_observed_at on public.spots (band, observed_at desc);
create index spots_rx_grid_prefix on public.spots (substring(rx_grid, 1, 4));

create table public.user_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  listening_post_grid  text not null default 'FN31',
  favorite_bands       smallint[] not null default '{20,40}',
  callsign             text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.tg_set_updated_at();

alter table public.spots enable row level security;
alter table public.user_preferences enable row level security;

create policy spots_read_authenticated on public.spots
  for select to authenticated using (true);

create policy prefs_self_select on public.user_preferences
  for select to authenticated using (auth.uid() = user_id);

create policy prefs_self_insert on public.user_preferences
  for insert to authenticated with check (auth.uid() = user_id);

create policy prefs_self_update on public.user_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy prefs_self_delete on public.user_preferences
  for delete to authenticated using (auth.uid() = user_id);
