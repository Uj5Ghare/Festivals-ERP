-- =====================================================================
-- Mandal App — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → Run.
-- It is safe to re-run: every object is created "if not exists" or replaced.
--
-- Roles: the PRESIDENT adds and changes everything. VOLUNTEERS are read-only:
-- they can see the mandal's records, receipts and report, but cannot add,
-- collect, delete, restore or upload anything. This is enforced below.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.mandals (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(trim(name)) between 1 and 120),
  festival     text not null default '',
  year         int  not null default extract(year from now())::int,
  logo_url     text,
  join_code    text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  receipt_seq  int  not null default 0,          -- last receipt number handed out
  created_by   uuid not null references auth.users (id) on delete restrict,
  created_at   timestamptz not null default now()
);

create table if not exists public.members (
  mandal_id  uuid not null references public.mandals (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  phone      text not null,
  role       text not null default 'volunteer' check (role in ('president', 'volunteer')),
  ward       text,
  joined_at  timestamptz not null default now(),
  primary key (mandal_id, user_id)
);
create index if not exists members_user_idx on public.members (user_id);

-- Older installs had a festival name as the default; the app no longer uses it.
alter table public.mandals alter column festival set default '';

create table if not exists public.donations (
  id                   uuid primary key default gen_random_uuid(),
  mandal_id            uuid not null references public.mandals (id) on delete cascade,
  receipt_no           int  not null,
  name                 text not null check (char_length(trim(name)) between 1 and 120),
  house                text,
  phone                text,
  total                int  not null check (total > 0),
  paid                 int  not null check (paid >= 0),
  created_by           uuid not null references auth.users (id),
  created_at           timestamptz not null default now(),
  paid_updated_at      timestamptz,
  delete_requested_by  uuid references auth.users (id),
  delete_requested_at  timestamptz,
  deleted_by           uuid references auth.users (id),
  deleted_at           timestamptz,
  check (paid <= total),
  unique (mandal_id, receipt_no)                  -- a receipt number is never reused
);
create index if not exists donations_mandal_idx on public.donations (mandal_id, receipt_no desc);

create table if not exists public.expenses (
  id                   uuid primary key default gen_random_uuid(),
  mandal_id            uuid not null references public.mandals (id) on delete cascade,
  amount               int  not null check (amount > 0),
  category             text not null check (category in ('decoration', 'prasad', 'pandal', 'light', 'puja', 'other')),
  label                text,                       -- custom name when category = 'other'
  paid_to              text,
  bill_url             text,
  created_by           uuid not null references auth.users (id),
  created_at           timestamptz not null default now(),
  delete_requested_by  uuid references auth.users (id),
  delete_requested_at  timestamptz,
  deleted_by           uuid references auth.users (id),
  deleted_at           timestamptz
);
create index if not exists expenses_mandal_idx on public.expenses (mandal_id, created_at desc);

-- Custom "Other" expense names a mandal chose to keep as tiles.
create table if not exists public.expense_labels (
  mandal_id  uuid not null references public.mandals (id) on delete cascade,
  label      text not null check (char_length(trim(label)) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (mandal_id, label)
);

-- ---------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can call them
-- without recursing into the members table's own policies)
-- ---------------------------------------------------------------------

create or replace function public.is_member(p_mandal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where mandal_id = p_mandal and user_id = auth.uid());
$$;

create or replace function public.is_president(p_mandal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where mandal_id = p_mandal and user_id = auth.uid() and role = 'president');
$$;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------

alter table public.mandals        enable row level security;
alter table public.members        enable row level security;
alter table public.donations      enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_labels enable row level security;

drop policy if exists mandals_select on public.mandals;
create policy mandals_select on public.mandals for select using (public.is_member(id));
drop policy if exists mandals_update on public.mandals;
create policy mandals_update on public.mandals for update
  using (public.is_president(id)) with check (public.is_president(id));

drop policy if exists members_select on public.members;
create policy members_select on public.members for select using (public.is_member(mandal_id));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
  using (public.is_president(mandal_id) and user_id <> auth.uid());

-- Donations: read by members. All writes go through the functions below.
drop policy if exists donations_select on public.donations;
create policy donations_select on public.donations for select using (public.is_member(mandal_id));

-- Expenses: read by members, added by the president only. Deletion goes through the functions below.
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select using (public.is_member(mandal_id));
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert
  with check (public.is_president(mandal_id) and created_by = auth.uid() and deleted_at is null
              and delete_requested_by is null and deleted_by is null);

drop policy if exists labels_select on public.expense_labels;
create policy labels_select on public.expense_labels for select using (public.is_member(mandal_id));
drop policy if exists labels_insert on public.expense_labels;
create policy labels_insert on public.expense_labels for insert with check (public.is_president(mandal_id));

-- Members cannot edit member rows at all (volunteers are read-only).
revoke update on public.members from authenticated;
drop policy if exists members_update_self on public.members;

-- The president may rename the mandal and change its logo, nothing else.
revoke update on public.mandals from authenticated;
grant update (name, logo_url, festival, year) on public.mandals to authenticated;

-- ---------------------------------------------------------------------
-- Functions the app calls (RPC)
-- ---------------------------------------------------------------------

-- Create a new mandal; the caller becomes its president.
create or replace function public.create_mandal(p_name text, p_member_name text, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into mandals (name, created_by) values (trim(p_name), auth.uid()) returning id into v_id;
  insert into members (mandal_id, user_id, name, phone, role)
    values (v_id, auth.uid(), trim(p_member_name), p_phone, 'president');
  return v_id;
end $$;

-- Join an existing mandal with its 6-character code; the caller becomes a volunteer.
create or replace function public.join_mandal(p_code text, p_member_name text, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into v_id from mandals where join_code = upper(trim(p_code));
  if v_id is null then raise exception 'invalid code' using errcode = 'P0002'; end if;
  insert into members (mandal_id, user_id, name, phone, role)
    values (v_id, auth.uid(), trim(p_member_name), p_phone, 'volunteer')
    on conflict (mandal_id, user_id) do nothing;
  return v_id;
end $$;

-- Record a vargani (president only). The receipt number comes from an atomic
-- counter, so two saves at the same moment can never get the same number.
create or replace function public.create_donation(
  p_mandal uuid, p_name text, p_house text, p_phone text, p_total int, p_paid int)
returns public.donations language plpgsql security definer set search_path = public as $$
declare v_no int; v_row donations;
begin
  if not is_president(p_mandal) then raise exception 'only the president can add entries'; end if;
  if p_total is null or p_total <= 0 then raise exception 'amount must be more than 0'; end if;
  if p_paid is null or p_paid < 0 or p_paid > p_total then raise exception 'paid must be between 0 and total'; end if;
  update mandals set receipt_seq = receipt_seq + 1 where id = p_mandal returning receipt_seq into v_no;
  insert into donations (mandal_id, receipt_no, name, house, phone, total, paid, created_by)
    values (p_mandal, v_no, trim(p_name), nullif(trim(coalesce(p_house, '')), ''),
            nullif(trim(coalesce(p_phone, '')), ''), p_total, p_paid, auth.uid())
    returning * into v_row;
  return v_row;
end $$;

-- Collect the rest of a pending / part-paid vargani (president only).
create or replace function public.mark_donation_paid(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_mandal uuid;
begin
  select mandal_id into v_mandal from donations where id = p_id and deleted_at is null;
  if v_mandal is null or not is_president(v_mandal) then raise exception 'only the president can change entries'; end if;
  update donations set paid = total, paid_updated_at = now() where id = p_id;
end $$;

-- Deletion workflow shared by donations and expenses.
-- p_kind is 'donation' or 'expense'.

create or replace function public.request_delete(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_mandal uuid;
begin
  if p_kind = 'donation' then
    select mandal_id into v_mandal from donations where id = p_id and deleted_at is null;
  elsif p_kind = 'expense' then
    select mandal_id into v_mandal from expenses where id = p_id and deleted_at is null;
  else raise exception 'bad kind'; end if;
  if v_mandal is null or not is_president(v_mandal) then raise exception 'volunteers are read-only'; end if;
  if p_kind = 'donation' then
    update donations set delete_requested_by = auth.uid(), delete_requested_at = now()
      where id = p_id and delete_requested_by is null;
  else
    update expenses set delete_requested_by = auth.uid(), delete_requested_at = now()
      where id = p_id and delete_requested_by is null;
  end if;
end $$;

-- Withdraw a request (the person who asked) or reject it (the president).
create or replace function public.clear_delete_request(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_mandal uuid; v_by uuid;
begin
  if p_kind = 'donation' then
    select mandal_id, delete_requested_by into v_mandal, v_by from donations where id = p_id;
  elsif p_kind = 'expense' then
    select mandal_id, delete_requested_by into v_mandal, v_by from expenses where id = p_id;
  else raise exception 'bad kind'; end if;
  if v_mandal is null or not (v_by = auth.uid() or is_president(v_mandal)) then raise exception 'not allowed'; end if;
  if p_kind = 'donation' then
    update donations set delete_requested_by = null, delete_requested_at = null where id = p_id;
  else
    update expenses set delete_requested_by = null, delete_requested_at = null where id = p_id;
  end if;
end $$;

-- President only: move an entry to "recently deleted".
create or replace function public.soft_delete(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_mandal uuid;
begin
  if p_kind = 'donation' then
    select mandal_id into v_mandal from donations where id = p_id and deleted_at is null;
  elsif p_kind = 'expense' then
    select mandal_id into v_mandal from expenses where id = p_id and deleted_at is null;
  else raise exception 'bad kind'; end if;
  if v_mandal is null or not is_president(v_mandal) then raise exception 'only the president can delete'; end if;
  if p_kind = 'donation' then
    update donations set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  else
    update expenses set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  end if;
end $$;

-- President only: bring an entry back from "recently deleted".
create or replace function public.restore_entry(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_mandal uuid;
begin
  if p_kind = 'donation' then
    select mandal_id into v_mandal from donations where id = p_id and deleted_at is not null;
  elsif p_kind = 'expense' then
    select mandal_id into v_mandal from expenses where id = p_id and deleted_at is not null;
  else raise exception 'bad kind'; end if;
  if v_mandal is null or not is_president(v_mandal) then raise exception 'only the president can restore'; end if;
  if p_kind = 'donation' then
    update donations set deleted_at = null, deleted_by = null,
                         delete_requested_by = null, delete_requested_at = null where id = p_id;
  else
    update expenses set deleted_at = null, deleted_by = null,
                        delete_requested_by = null, delete_requested_at = null where id = p_id;
  end if;
end $$;

-- Only signed-in users may call these.
revoke execute on all functions in schema public from anon, public;
grant execute on function
  public.is_member(uuid), public.is_president(uuid),
  public.create_mandal(text, text, text), public.join_mandal(text, text, text),
  public.create_donation(uuid, text, text, text, int, int), public.mark_donation_paid(uuid),
  public.request_delete(text, uuid), public.clear_delete_request(text, uuid),
  public.soft_delete(text, uuid), public.restore_entry(text, uuid)
to authenticated;

-- ---------------------------------------------------------------------
-- Forgotten PIN
--  * A volunteer who forgets the PIN: the president sets a new one (Profile).
--  * The president who forgets the PIN: uses the RECOVERY KEY created in
--    Profile ("Forgot PIN?" on the login screen). The key is stored only as a
--    hash, in a table no app user can read, and 5 wrong tries lock it for 15 min.
-- ---------------------------------------------------------------------
alter table public.mandals add column if not exists has_recovery_key boolean not null default false;

create table if not exists public.mandal_secrets (
  mandal_id     uuid primary key references public.mandals (id) on delete cascade,
  recovery_hash text not null,
  fails         int  not null default 0,
  locked_until  timestamptz
);
alter table public.mandal_secrets enable row level security;
revoke all on public.mandal_secrets from anon, authenticated;

-- President: make a new recovery key (the old one stops working). Shown once.
create or replace function public.create_recovery_key(p_mandal uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I/L
  v_bytes bytea := gen_random_bytes(10);
  v_key   text := '';
  i       int;
begin
  if not is_president(p_mandal) then raise exception 'only the president can do this'; end if;
  for i in 0..9 loop
    v_key := v_key || substr(v_alpha, (get_byte(v_bytes, i) % 31) + 1, 1);
  end loop;
  insert into mandal_secrets (mandal_id, recovery_hash) values (p_mandal, crypt(v_key, gen_salt('bf')))
    on conflict (mandal_id) do update set recovery_hash = excluded.recovery_hash, fails = 0, locked_until = null;
  update mandals set has_recovery_key = true where id = p_mandal;
  return substr(v_key, 1, 5) || '-' || substr(v_key, 6, 5);
end $$;

-- President: set a new PIN for one of the mandal's volunteers.
create or replace function public.reset_member_pin(p_mandal uuid, p_user uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_president(p_mandal) then raise exception 'only the president can do this'; end if;
  if p_pin is null or p_pin !~ '^\d{6}$' then raise exception 'PIN must be 6 digits'; end if;
  if not exists (select 1 from members where mandal_id = p_mandal and user_id = p_user and role = 'volunteer') then
    raise exception 'not a volunteer of this mandal';
  end if;
  update auth.users set encrypted_password = crypt(p_pin, gen_salt('bf')), updated_at = now() where id = p_user;
end $$;

-- Signed-out president: phone + recovery key + new PIN. Returns 'ok', 'wrong' or 'locked'.
create or replace function public.reset_pin_with_key(p_phone text, p_key text, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_phone  text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_key    text := upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g'));
  v_status text := 'wrong';
  r        record;
begin
  if p_pin is null or p_pin !~ '^\d{6}$' then raise exception 'PIN must be 6 digits'; end if;
  for r in
    select m.mandal_id, m.user_id, s.recovery_hash, s.fails, s.locked_until
    from members m join mandal_secrets s on s.mandal_id = m.mandal_id
    where m.role = 'president' and m.phone = v_phone
  loop
    if r.locked_until is not null and r.locked_until > now() then
      v_status := 'locked';
    elsif crypt(v_key, r.recovery_hash) = r.recovery_hash then
      update auth.users set encrypted_password = crypt(p_pin, gen_salt('bf')), updated_at = now() where id = r.user_id;
      update mandal_secrets set fails = 0, locked_until = null where mandal_id = r.mandal_id;
      return 'ok';
    else
      update mandal_secrets
        set fails = case when r.fails + 1 >= 5 then 0 else r.fails + 1 end,
            locked_until = case when r.fails + 1 >= 5 then now() + interval '15 minutes' else r.locked_until end
        where mandal_id = r.mandal_id;
      v_status := 'wrong';
    end if;
  end loop;
  return v_status;
end $$;

revoke execute on function public.create_recovery_key(uuid), public.reset_member_pin(uuid, uuid, text),
  public.reset_pin_with_key(text, text, text) from public;
grant execute on function public.create_recovery_key(uuid), public.reset_member_pin(uuid, uuid, text) to authenticated;
grant execute on function public.reset_pin_with_key(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Live updates (other volunteers' entries appear without refreshing)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['donations', 'expenses', 'members', 'mandals'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Photo storage: mandal logos and expense bills.
-- Files are stored under "<mandal_id>/<file name>".
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
      values ('mandal-files', 'mandal-files', true)
      on conflict (id) do nothing;

    -- Uploads need SELECT as well as INSERT: without it Storage refuses the file.
    drop policy if exists mandal_files_select on storage.objects;
    create policy mandal_files_select on storage.objects for select to authenticated
      using (bucket_id = 'mandal-files');

    drop policy if exists mandal_files_insert on storage.objects;
    create policy mandal_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'mandal-files'
                  and public.is_president(((storage.foldername(name))[1])::uuid));

    drop policy if exists mandal_files_update on storage.objects;
    create policy mandal_files_update on storage.objects for update to authenticated
      using (bucket_id = 'mandal-files'
             and public.is_president(((storage.foldername(name))[1])::uuid));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Optional: permanently remove entries deleted more than 30 days ago.
-- Enable the pg_cron extension (Dashboard → Database → Extensions), then run:
--
-- select cron.schedule('purge-deleted', '0 3 * * *', $$
--   delete from public.donations where deleted_at < now() - interval '30 days';
--   delete from public.expenses  where deleted_at < now() - interval '30 days';
-- $$);
-- (Receipt numbers still never repeat: they come from mandals.receipt_seq.)
-- ---------------------------------------------------------------------
