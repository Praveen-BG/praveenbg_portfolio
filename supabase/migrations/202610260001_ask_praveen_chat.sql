create extension if not exists pgcrypto;

create table if not exists public.chat_sessions (
  session_id uuid primary key,
  access_token_hash text not null check (char_length(access_token_hash) = 64),
  consent_at timestamptz not null,
  notice_version text not null check (char_length(notice_version) between 1 and 20),
  visitor_name text check (visitor_name is null or char_length(visitor_name) <= 80),
  visitor_company text check (visitor_company is null or char_length(visitor_company) <= 120),
  details_self_reported boolean not null default true,
  started_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  message_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(session_id) on delete cascade,
  role text not null check (role in ('visitor', 'assistant')),
  message_text text not null check (char_length(message_text) between 1 and 2000),
  faq_id text check (faq_id is null or char_length(faq_id) <= 80),
  typed_question text check (typed_question is null or char_length(typed_question) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_events (
  event_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(session_id) on delete cascade,
  event_type text not null check (event_type in ('faq_answered', 'fallback_or_ambiguity', 'category_selected', 'link_click', 'resume_click', 'project_click', 'contact_click')),
  category text check (category is null or char_length(category) <= 80),
  faq_id text check (faq_id is null or char_length(faq_id) <= 80),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists chat_sessions_started_at_idx on public.chat_sessions(started_at);
create index if not exists chat_messages_session_created_idx on public.chat_messages(session_id, created_at);
create index if not exists chat_messages_faq_idx on public.chat_messages(faq_id) where faq_id is not null;
create index if not exists chat_events_session_created_idx on public.chat_events(session_id, created_at);
create index if not exists chat_events_type_idx on public.chat_events(event_type);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_events enable row level security;

revoke all on public.chat_sessions from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
revoke all on public.chat_events from anon, authenticated;

comment on table public.chat_sessions is 'Private Ask Praveen consented sessions. Accessed only by the server service role.';
comment on table public.chat_messages is 'Private consented chat messages. Never exposed through a public read endpoint.';
comment on table public.chat_events is 'Private consented FAQ and link events. Never exposed through a public read endpoint.';

create or replace function public.delete_expired_chat_records(retention_days integer default 90)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if retention_days < 1 or retention_days > 3650 then
    raise exception 'retention_days must be between 1 and 3650';
  end if;
  delete from public.chat_sessions where started_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_chat_records(integer) from public, anon, authenticated;
grant execute on function public.delete_expired_chat_records(integer) to service_role;
