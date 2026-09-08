-- Listening Party profiles (applied remotely as migration party_profiles)
create schema if not exists party;

create table if not exists party.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint party_profiles_username_format check (
    username is null
    or username ~ '^[a-z0-9_]{3,24}$'
  )
);

create index if not exists party_profiles_username_idx on party.profiles (username);

alter table party.profiles enable row level security;

drop policy if exists party_profiles_select_public on party.profiles;
create policy party_profiles_select_public
  on party.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists party_profiles_insert_own on party.profiles;
create policy party_profiles_insert_own
  on party.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists party_profiles_update_own on party.profiles;
create policy party_profiles_update_own
  on party.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant usage on schema party to anon, authenticated, service_role;
grant select on table party.profiles to anon, authenticated, service_role;
grant insert, update on table party.profiles to authenticated, service_role;
grant all on table party.profiles to service_role;

create or replace function party.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists party_profiles_set_updated_at on party.profiles;
create trigger party_profiles_set_updated_at
  before update on party.profiles
  for each row execute function party.set_updated_at();

create or replace function party.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = party, public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  suggested text;
begin
  suggested := lower(regexp_replace(
    coalesce(
      nullif(meta->>'preferred_username', ''),
      nullif(meta->>'user_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    '[^a-z0-9_]',
    '',
    'g'
  ));
  if suggested is null or length(suggested) < 3 then
    suggested := null;
  elsif length(suggested) > 24 then
    suggested := left(suggested, 24);
  end if;

  insert into party.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    suggested,
    coalesce(
      nullif(meta->>'full_name', ''),
      nullif(meta->>'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    nullif(meta->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_party on auth.users;
create trigger on_auth_user_created_party
  after insert on auth.users
  for each row execute function party.handle_new_user();

-- Append party to authenticator schemas (keep the live list in sync when re-running).
alter role authenticator set pgrst.db_schemas = 'public,acey,cs,fortytwo,great,metrics,oa,sf,six,u,jukebox,dz_app,dataday,spot,studio69,unwavering,ltf,je,turtlecove,reelkeep,sign,accountynt,lifestory,party';
notify pgrst, 'reload config';
