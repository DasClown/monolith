-- MONOLITH cloud foundation: profiles, saves, entitlements, purchases.
-- Run with: supabase db push

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'PILOT',
  player_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  version integer not null default 2,
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coin_doubler boolean not null default false,
  ad_free boolean not null default false,
  battle_pass boolean not null default false,
  starter_pack boolean not null default false,
  supporter boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  transaction_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  provider text not null default 'paddle',
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'PILOT')
  on conflict (id) do nothing;
  insert into public.entitlements (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "saves_all_own" on public.saves;
create policy "saves_all_own" on public.saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = user_id);

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = user_id);
