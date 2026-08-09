-- Evidence ledger: the append-only chain behind /api/ledger and the
-- Transparency Ledger UI.
--
-- ⚠️ RECONSTRUCTED, NOT AUTHORITATIVE.
--
-- The original `ledger_entries` table and `append_ledger_entry` RPC were
-- created directly in the Supabase project and were never version controlled —
-- 20260722120000_catalog_fingerprints.sql says so in its own header. That meant
-- the repo could not rebuild its own database from scratch, so a fresh
-- environment (a test project, a new staging project, a disaster-recovery
-- restore) had no way to come up.
--
-- This file closes that gap. It was derived by reading the callers rather than
-- by dumping production:
--   * column names + types   -> _shared/formatEntry.js
--   * RPC signature          -> submit-evidence.js
--   * settlement columns     -> simulate-settlement.js
--   * chain-hash formula     -> src/components/TransparencyLedger.jsx (verifier)
--
-- The chain-hash formula is verified: this function and the JS in
-- _shared/hash.js produce identical digests for the same inputs.
--
-- BEFORE TRUSTING THIS AGAINST PRODUCTION, diff it against the live schema.
-- Nullability, defaults, numeric precision and any indexes added by hand are
-- the likely points of drift. `create table if not exists` means applying it to
-- a database that already has the table is a no-op, but the RPC below IS a
-- `create or replace` and will overwrite an existing definition.
--
-- Dated 20260101 so it sorts ahead of the two migrations that assume this table
-- already exists.

create table if not exists ledger_entries (
  id                      bigint generated always as identity primary key,
  created_at              timestamptz not null default now(),

  venue_name              text not null,
  venue_sbp_reference     text not null,
  reporting_period_start  date not null,
  reporting_period_end    date not null,

  total_plays             integer not null,
  unique_tracks           integer not null,
  nrr_matched             integer not null,
  nrr_unmatched           integer not null,

  -- payload_hash is the SHA-256 of the canonically stringified evidence blob;
  -- blob_key is where that blob lives in Netlify Blobs. They are equal today.
  payload_hash            text not null,
  blob_key                text,

  -- The tamper-evident chain. prev_hash is null for the genesis entry, and the
  -- verifier substitutes GENESIS_HASH (64 zeroes) when recomputing.
  prev_hash               text,
  chain_hash              text not null,

  settlement_status       text not null default 'pending'
                            check (settlement_status in ('pending', 'settled')),
  invoice_amount_kes      numeric,
  artist_amount_kes       numeric,
  admin_amount_kes        numeric,
  cmo_disbursement_ref    text,
  settled_at              timestamptz
);

comment on table ledger_entries is
  'Append-only evidence ledger. chain_hash = sha256(coalesce(prev_hash, 64 zeroes) || payload_hash).';

-- RLS on + no policies => only the service role (used by the Netlify functions)
-- may touch this table, matching the convention used for catalog_works etc.
alter table ledger_entries enable row level security;

-- ---------------------------------------------------------------------------
-- Atomic append.
--
-- The advisory lock is the whole point: without it two concurrent submissions
-- can both read the same chain tip and produce two entries claiming the same
-- prev_hash, which silently forks the chain. The lock is transaction-scoped and
-- releases when this function's implicit transaction ends.
--
-- Uses the builtin sha256(bytea) rather than pgcrypto's digest(): on Supabase
-- pgcrypto is installed into the `extensions` schema, which the pinned empty
-- search_path below cannot see.
-- ---------------------------------------------------------------------------
create or replace function append_ledger_entry(
  p_venue_name             text,
  p_venue_sbp_reference    text,
  p_reporting_period_start date,
  p_reporting_period_end   date,
  p_total_plays            integer,
  p_unique_tracks          integer,
  p_nrr_matched            integer,
  p_nrr_unmatched          integer,
  p_payload_hash           text,
  p_blob_key               text
) returns ledger_entries
language plpgsql
set search_path = ''   -- pin schema resolution (Supabase linter 0011); refs are schema-qualified below
as $$
declare
  v_prev  text;
  v_chain text;
  v_row   public.ledger_entries;
  c_genesis constant text := repeat('0', 64);
begin
  perform pg_advisory_xact_lock(hashtext('ledger_entries:append'));

  select chain_hash into v_prev
    from public.ledger_entries
   order by id desc
   limit 1;

  v_chain := encode(
    sha256(convert_to(coalesce(v_prev, c_genesis) || p_payload_hash, 'UTF8')),
    'hex'
  );

  insert into public.ledger_entries
    (venue_name, venue_sbp_reference, reporting_period_start, reporting_period_end,
     total_plays, unique_tracks, nrr_matched, nrr_unmatched,
     payload_hash, blob_key, prev_hash, chain_hash)
  values
    (p_venue_name, p_venue_sbp_reference, p_reporting_period_start, p_reporting_period_end,
     p_total_plays, p_unique_tracks, p_nrr_matched, p_nrr_unmatched,
     p_payload_hash, p_blob_key, v_prev, v_chain)
  returning * into v_row;

  return v_row;
end;
$$;
