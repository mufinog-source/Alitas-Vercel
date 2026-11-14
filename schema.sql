-- Executa este ficheiro no SQL Editor do teu projecto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_token text not null,
  customer_name text not null,
  phone text not null,
  fulfillment text not null check (fulfillment in ('Delivery', 'Levantamento na loja')),
  zone text,
  address text,
  coordinates text,
  store_id text not null,
  store_name text not null,
  items jsonb not null,
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2),
  total numeric(12,2) not null,
  notes text,
  status text not null default 'Recebido',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_tracking_idx on public.orders (id, tracking_token);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- As tabelas não ficam abertas ao público. Só as funções serverless com service role acedem.
alter table public.orders enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.orders from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;
grant usage on schema public to service_role;
grant all on table public.orders to service_role;
grant all on table public.admin_users to service_role;


-- Protecção contra spam: contador por hash de IP, sem guardar o IP original.
create table if not exists public.api_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (ip_hash, window_start)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant all on public.api_rate_limits to service_role;

create or replace function public.check_order_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('minute', now()) - make_interval(mins => (extract(minute from now())::integer % 10));
  v_hits integer;
begin
  insert into public.api_rate_limits(ip_hash, window_start, hits)
  values (p_ip_hash, v_window, 1)
  on conflict (ip_hash, window_start)
  do update set hits = public.api_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= 5;
end;
$$;
revoke all on function public.check_order_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_order_rate_limit(text) to service_role;
