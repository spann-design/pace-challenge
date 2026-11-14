-- Minimal stand-in for the parts of Supabase the migration relies on (roles, auth.users, auth.uid()).
-- Only used by the local database tests, never run against Supabase.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
grant usage on schema public, auth to anon, authenticated;
create table auth.users (
  instance_id uuid, id uuid primary key default gen_random_uuid(), aud text, role text, email text,
  encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text,
  email_change_token_new text, email_change text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
