-- Disposable PostgreSQL rehearsal baseline only. Never run against production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','member','guest_author','author','editor');
CREATE TABLE auth.users (id UUID PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role public.app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role) RETURNS SMALLINT
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE _role
  WHEN 'member' THEN 0 WHEN 'guest_author' THEN 1 WHEN 'author' THEN 2
  WHEN 'moderator' THEN 3 WHEN 'editor' THEN 4 WHEN 'admin' THEN 5 END; $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min_role public.app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND public.role_rank(role) >= public.role_rank(_min_role));
$$;
CREATE TABLE public.news (id UUID PRIMARY KEY, author_id UUID, status TEXT, deleted_at TIMESTAMPTZ);
CREATE TABLE public.accident_reports (id UUID PRIMARY KEY, user_id UUID, status TEXT, deleted_at TIMESTAMPTZ);
CREATE TABLE public.alerts (id UUID PRIMARY KEY, user_id UUID, status TEXT, deleted_at TIMESTAMPTZ);
CREATE TABLE public.campaigns (id UUID PRIMARY KEY, end_date DATE, report_published BOOLEAN, deleted_at TIMESTAMPTZ);
CREATE TABLE public.infrastructure_issues (id UUID PRIMARY KEY, user_id UUID, status TEXT, deleted_at TIMESTAMPTZ);
CREATE TABLE public.feed_posts (id UUID PRIMARY KEY, author_id UUID, status TEXT, moderation_status TEXT, deleted_at TIMESTAMPTZ);
CREATE TABLE public.incident_content_links (id UUID PRIMARY KEY);
INSERT INTO auth.users VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');
INSERT INTO public.user_roles VALUES
  ('00000000-0000-0000-0000-000000000001','admin'),
  ('00000000-0000-0000-0000-000000000002','editor'),
  ('00000000-0000-0000-0000-000000000003','member');
INSERT INTO public.news VALUES
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','published',NULL),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','draft',NULL);
INSERT INTO public.accident_reports VALUES
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','approved',NULL),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','pending',NULL);
INSERT INTO public.alerts VALUES
  ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','active',NULL);
INSERT INTO public.campaigns VALUES
  ('40000000-0000-0000-0000-000000000001','2099-01-01',false,NULL),
  ('40000000-0000-0000-0000-000000000002','2099-01-01',false,NULL);
INSERT INTO public.infrastructure_issues VALUES
  ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','approved',NULL);
INSERT INTO public.feed_posts VALUES
  ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','published','approved',NULL);
