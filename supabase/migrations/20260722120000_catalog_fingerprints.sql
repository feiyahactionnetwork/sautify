-- Sautify catalogue fingerprint store (audit §8).
--
-- Purpose: hold Sautify's own reference catalogue as FINGERPRINTS, never raw
-- audio. Fingerprints are ingested from consented clean masters (primarily via
-- the artist-onboarding funnel), so the recognition catalogue can grow
-- independently of ACRCloud without reproducing any sound recording.
--
-- Design notes:
--   * catalog_works       = one row per recording in our catalogue (metadata +
--                           the consented-rights provenance chain from §8).
--   * catalog_fingerprints = the landmark hashes for each work. Landmark
--                           fingerprinting (Olaf/Shazam-style) emits MANY hashes
--                           per track, each at a time offset; matching is a
--                           vote over hashes that align at a consistent offset.
--   * NO audio column exists here, by design. This store is fingerprints only.
--
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- This is the first versioned migration; the pre-existing `ledger_entries` table
-- and `append_ledger_entry` RPC were created directly in the project and are not
-- reproduced here.

-- ---------------------------------------------------------------------------
-- Works
-- ---------------------------------------------------------------------------
create table if not exists catalog_works (
  id                  bigint generated always as identity primary key,
  isrc                text,
  title               text not null,
  artist_name         text not null,

  -- Consented-rights provenance (audit §8). The existence of a row asserts that
  -- someone with the right to do so granted Sautify a licence to fingerprint
  -- this recording. We record who, how, and when.
  rights_grant_type   text not null
                        check (rights_grant_type in
                          ('artist_onboarding', 'label_feed', 'licensed_catalogue')),
  rights_granted_by   text not null,          -- name/email/party who granted the licence
  rights_grant_ref    text,                   -- agreement id / artist-waitlist submission id
  rights_granted_at   timestamptz not null default now(),

  -- Fingerprint provenance, so we can re-index or migrate when the fingerprinter
  -- changes (e.g. an Olaf version bump).
  fingerprint_algo    text not null default 'olaf',
  fingerprint_version text,
  fingerprint_count   integer not null default 0,

  status              text not null default 'active'
                        check (status in ('pending', 'active', 'withdrawn')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table catalog_works is
  'Sautify reference catalogue: one row per recording. Fingerprints only, no audio is stored (audit §8).';
comment on column catalog_works.rights_granted_by is
  'Party who granted the fingerprint licence (consented-rights chain, audit §8).';

-- At most one active work per ISRC (ISRC may be null for unregistered tracks).
create unique index if not exists catalog_works_isrc_active_uniq
  on catalog_works (isrc)
  where (status = 'active' and isrc is not null);

-- ---------------------------------------------------------------------------
-- Fingerprints
-- ---------------------------------------------------------------------------
create table if not exists catalog_fingerprints (
  id         bigint generated always as identity primary key,
  work_id    bigint not null references catalog_works (id) on delete cascade,
  hash       bigint  not null,   -- landmark hash (Olaf emits 32-bit; stored as bigint)
  t_offset   integer not null,   -- time offset of the landmark within the work
  created_at timestamptz not null default now()
);

comment on table catalog_fingerprints is
  'Landmark hashes per work. Matching votes over hashes that align at a consistent (t_offset - query_offset) delta.';

-- Hot path: look up query hashes. Secondary index for cascade/withdrawal by work.
create index if not exists catalog_fingerprints_hash_idx on catalog_fingerprints (hash);
create index if not exists catalog_fingerprints_work_idx on catalog_fingerprints (work_id);

-- ---------------------------------------------------------------------------
-- Row-level security: only the service role (used by Netlify functions) may
-- touch these tables. RLS on + no policies => anon/authenticated are denied,
-- service role bypasses RLS. The catalogue is not public.
-- ---------------------------------------------------------------------------
alter table catalog_works        enable row level security;
alter table catalog_fingerprints enable row level security;

-- ---------------------------------------------------------------------------
-- Ingest RPC: insert a work and all its fingerprints atomically, then stamp the
-- fingerprint_count. Mirrors the append_ledger_entry pattern (server-side, one
-- round trip, all-or-nothing).
-- ---------------------------------------------------------------------------
create or replace function ingest_catalog_work(
  p_isrc                text,
  p_title               text,
  p_artist_name         text,
  p_rights_grant_type   text,
  p_rights_granted_by   text,
  p_rights_grant_ref    text,
  p_fingerprint_version text,
  p_fingerprints        jsonb   -- array of { "hash": <int>, "offset": <int> }
) returns catalog_works
language plpgsql
as $$
declare
  v_work  catalog_works;
  v_count integer;
begin
  if p_fingerprints is null or jsonb_typeof(p_fingerprints) <> 'array'
     or jsonb_array_length(p_fingerprints) = 0 then
    raise exception 'p_fingerprints must be a non-empty JSON array';
  end if;

  insert into catalog_works
    (isrc, title, artist_name, rights_grant_type, rights_granted_by,
     rights_grant_ref, fingerprint_version, status)
  values
    (nullif(p_isrc, ''), p_title, p_artist_name, p_rights_grant_type,
     p_rights_granted_by, nullif(p_rights_grant_ref, ''), p_fingerprint_version, 'active')
  returning * into v_work;

  insert into catalog_fingerprints (work_id, hash, t_offset)
  select v_work.id,
         (elem->>'hash')::bigint,
         (elem->>'offset')::integer
  from jsonb_array_elements(p_fingerprints) as elem;

  get diagnostics v_count = row_count;

  update catalog_works
     set fingerprint_count = v_count,
         updated_at = now()
   where id = v_work.id
  returning * into v_work;

  return v_work;
end;
$$;

-- ---------------------------------------------------------------------------
-- Match RPC: given a batch of query fingerprints, return candidate works ranked
-- by the number of hashes that align at a consistent time delta. This is the
-- landmark-vote match at the core of Shazam-style / Olaf recognition, expressed
-- in SQL so the Postgres store is directly queryable (the operational Olaf LMDB
-- index, when built, is populated FROM this same table).
-- ---------------------------------------------------------------------------
create or replace function match_catalog_fingerprints(
  p_query     jsonb,          -- array of { "hash": <int>, "offset": <int> }
  p_min_votes integer default 5
) returns table (work_id bigint, votes bigint, t_delta integer)
language sql
stable
as $$
  with q as (
    select (elem->>'hash')::bigint  as hash,
           (elem->>'offset')::integer as q_offset
    from jsonb_array_elements(p_query) as elem
  )
  select f.work_id,
         count(*)                    as votes,
         (f.t_offset - q.q_offset)   as t_delta
  from q
  join catalog_fingerprints f on f.hash = q.hash
  group by f.work_id, (f.t_offset - q.q_offset)
  having count(*) >= p_min_votes
  order by count(*) desc
  limit 5;
$$;
