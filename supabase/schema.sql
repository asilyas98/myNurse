-- MyNurse — Supabase schema
-- Safe to run on a fresh project OR on top of the earlier Rounds schema.
-- Re-running it is harmless. NOTE: it removes the old "requests" board (replaced by bookings).

create extension if not exists pgcrypto;

-- =========================================================
-- profiles
-- =========================================================
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists target_exam text not null default 'NCLEX-RN';
do $$ begin
  alter table public.profiles add constraint profiles_role_chk check (role in ('student','tutor'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_exam_chk check (target_exam in ('NCLEX-RN','NCLEX-PN','TEAS 7','HESI A2'));
exception when duplicate_object then null; end $$;

alter table public.profiles enable row level security;
drop policy if exists "profiles readable by signed-in users" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role', 'student');
  e text := coalesce(new.raw_user_meta_data->>'target_exam', 'NCLEX-RN');
begin
  if r not in ('student','tutor') then r := 'student'; end if;
  if e not in ('NCLEX-RN','NCLEX-PN','TEAS 7','HESI A2') then e := 'NCLEX-RN'; end if;
  insert into public.profiles (user_id, display_name, role, target_exam)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
          r, e)
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- tutors (public listing) + tutor_contacts (revealed after booking accepted)
-- =========================================================
create table if not exists public.tutors (
  user_id      uuid primary key references public.profiles(user_id) on delete cascade,
  credentials  text not null default '',
  subjects     text[] not null default '{}',
  availability text not null default '',
  updated_at   timestamptz not null default now()
);
-- loosen the earlier Rounds column limits (replaced by tutors_fields_chk below)
alter table public.tutors drop constraint if exists tutors_credentials_check;
alter table public.tutors drop constraint if exists tutors_subjects_check;
alter table public.tutors drop constraint if exists tutors_availability_check;
alter table public.tutors add column if not exists headline text not null default '';
alter table public.tutors add column if not exists bio text not null default '';
alter table public.tutors add column if not exists exams text[] not null default '{}';
alter table public.tutors add column if not exists hourly_rate integer not null default 25;
alter table public.tutors add column if not exists years_experience integer not null default 0;
alter table public.tutors add column if not exists languages text not null default 'English';
alter table public.tutors add column if not exists is_active boolean not null default true;
do $$ begin
  alter table public.tutors add constraint tutors_fields_chk check (
    char_length(headline) <= 90 and char_length(bio) <= 1500 and char_length(credentials) <= 80
    and char_length(availability) <= 160 and char_length(languages) <= 80
    and hourly_rate between 0 and 500 and years_experience between 0 and 60
    and cardinality(subjects) <= 12 and cardinality(exams) <= 4);
exception when duplicate_object then null; end $$;

create table if not exists public.tutor_contacts (
  user_id uuid primary key references public.tutors(user_id) on delete cascade,
  contact text not null default '' check (char_length(contact) <= 160)
);

-- carry over contact info from the earlier schema, then drop that public column
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='tutors' and column_name='contact') then
    insert into public.tutor_contacts (user_id, contact)
      select user_id, contact from public.tutors where contact <> ''
      on conflict (user_id) do nothing;
    alter table public.tutors drop column contact;
  end if;
end $$;

alter table public.tutors enable row level security;
drop policy if exists "tutors readable by signed-in users" on public.tutors;
drop policy if exists "users insert own tutor listing" on public.tutors;
drop policy if exists "users update own tutor listing" on public.tutors;
drop policy if exists "users delete own tutor listing" on public.tutors;
create policy "tutors readable by signed-in users" on public.tutors for select to authenticated using (true);
create policy "users insert own tutor listing" on public.tutors for insert to authenticated with check (user_id = auth.uid());
create policy "users update own tutor listing" on public.tutors for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own tutor listing" on public.tutors for delete to authenticated using (user_id = auth.uid());

alter table public.tutor_contacts enable row level security;
drop policy if exists "owner manages contact" on public.tutor_contacts;
create policy "owner manages contact" on public.tutor_contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- bookings (Preply-style lesson requests)
-- =========================================================
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(user_id) on delete cascade,
  tutor_id        uuid not null references public.tutors(user_id) on delete cascade,
  start_at        timestamptz not null,
  duration_min    integer not null check (duration_min in (30, 60, 90)),
  topic           text not null check (char_length(topic) between 1 and 120),
  message         text not null default '' check (char_length(message) <= 800),
  student_contact text not null default '' check (char_length(student_contact) <= 160),
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','cancelled','completed')),
  created_at      timestamptz not null default now(),
  check (student_id <> tutor_id)
);
create index if not exists bookings_tutor_idx on public.bookings (tutor_id, start_at);
create index if not exists bookings_student_idx on public.bookings (student_id, start_at);

alter table public.bookings enable row level security;
drop policy if exists "parties read bookings" on public.bookings;
drop policy if exists "students request bookings" on public.bookings;
create policy "parties read bookings" on public.bookings for select to authenticated
  using (auth.uid() in (student_id, tutor_id));
create policy "students request bookings" on public.bookings for insert to authenticated
  with check (student_id = auth.uid() and status = 'pending' and start_at > now());
-- status changes go through set_booking_status() only

create or replace function public.set_booking_status(booking uuid, new_status text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = booking for update;
  if not found then raise exception 'Booking not found'; end if;

  if auth.uid() = b.tutor_id and (
       (b.status = 'pending'  and new_status in ('accepted','declined')) or
       (b.status = 'accepted' and new_status in ('completed','cancelled'))) then
    update public.bookings set status = new_status where id = booking;
  elsif auth.uid() = b.student_id and b.status in ('pending','accepted') and new_status = 'cancelled' then
    update public.bookings set status = new_status where id = booking;
  else
    raise exception 'That change is not allowed';
  end if;
end; $$;
revoke all on function public.set_booking_status(uuid, text) from public, anon;
grant execute on function public.set_booking_status(uuid, text) to authenticated;

create or replace function public.get_tutor_contact(tutor uuid)
returns text language sql stable security definer set search_path = public as $$
  select c.contact from public.tutor_contacts c
   where c.user_id = tutor
     and (tutor = auth.uid() or exists (
           select 1 from public.bookings b
            where b.tutor_id = tutor and b.student_id = auth.uid()
              and b.status in ('accepted','completed')));
$$;
revoke all on function public.get_tutor_contact(uuid) from public, anon;
grant execute on function public.get_tutor_contact(uuid) to authenticated;

-- =========================================================
-- reviews (one per completed lesson)
-- =========================================================
create table if not exists public.reviews (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  tutor_id   uuid not null references public.tutors(user_id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  comment    text not null default '' check (char_length(comment) <= 800),
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "reviews readable" on public.reviews;
drop policy if exists "students review completed lessons" on public.reviews;
create policy "reviews readable" on public.reviews for select to authenticated using (true);
create policy "students review completed lessons" on public.reviews for insert to authenticated
  with check (student_id = auth.uid() and exists (
    select 1 from public.bookings b
     where b.id = booking_id and b.student_id = auth.uid()
       and b.tutor_id = reviews.tutor_id and b.status = 'completed'));

create or replace view public.tutor_stats as
  select t.user_id,
         coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
         count(r.booking_id)::int as review_count,
         (select count(*) from public.bookings b
           where b.tutor_id = t.user_id and b.status = 'completed')::int as lessons
    from public.tutors t
    left join public.reviews r on r.tutor_id = t.user_id
   group by t.user_id;
grant select on public.tutor_stats to authenticated;

-- =========================================================
-- custom quizzes + attempts
-- =========================================================
create table if not exists public.quizzes (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  title      text not null check (char_length(title) between 1 and 100),
  exam       text not null,
  subjects   text[] not null default '{}',
  difficulty text not null default 'mixed',
  timed      boolean not null default false,
  questions  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  quiz_id    uuid references public.quizzes(id) on delete set null,
  title      text not null default '',
  exam       text not null default '',
  subject    text not null default '',
  score      integer not null,
  total      integer not null,
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts add column if not exists breakdown jsonb not null default '{}'::jsonb;
alter table public.quiz_attempts add column if not exists seconds integer not null default 0;
create index if not exists quiz_attempts_owner_idx on public.quiz_attempts (owner, created_at desc);

alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
drop policy if exists "own quizzes" on public.quizzes;
drop policy if exists "own attempts" on public.quiz_attempts;
create policy "own quizzes" on public.quizzes for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own attempts" on public.quiz_attempts for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- =========================================================
-- flashcards
-- =========================================================
create table if not exists public.decks (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  title      text not null check (char_length(title) between 1 and 100),
  subject    text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  deck_id    uuid not null references public.decks(id) on delete cascade,
  owner      uuid not null references public.profiles(user_id) on delete cascade default auth.uid(),
  front      text not null check (char_length(front) between 1 and 500),
  back       text not null check (char_length(back) between 1 and 1500),
  known      boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cards_deck_idx on public.cards (deck_id, position);
alter table public.decks enable row level security;
alter table public.cards enable row level security;
drop policy if exists "own decks" on public.decks;
drop policy if exists "own cards" on public.cards;
create policy "own decks" on public.decks for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own cards" on public.cards for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid()
    and exists (select 1 from public.decks d where d.id = deck_id and d.owner = auth.uid()));

-- =========================================================
-- retire the old Rounds request board
-- =========================================================
drop function if exists public.claim_request(uuid);
drop function if exists public.release_request(uuid);
drop table if exists public.requests cascade;

-- =========================================================
-- realtime (tutor dashboard updates live)
-- =========================================================
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;

-- =========================================================
-- in-app account deletion (required by the App Store, guideline 5.1.1(v))
-- Deleting the auth user cascades to profiles and every table that belongs to the user.
-- =========================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
