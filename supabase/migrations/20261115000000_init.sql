-- MDPostComposer initial schema: the `posts` table, its updated_at trigger and
-- the default Storage buckets used by the Edge Functions.
-- Only the service role (used by the Edge Functions) touches these objects:
-- RLS is enabled with no policies, and no anon/authenticated storage policies exist.

create table public.posts (
  id uuid not null default gen_random_uuid(),
  title text not null,
  slug text not null,
  preview text not null,
  banner_path text not null,
  content_markdown text not null,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  -- validated against MDPC_POST_CATEGORIES by the functions
  post_type text not null,
  active boolean not null default true,
  constraint posts_pkey primary key (id),
  constraint posts_slug_key unique (slug),
  constraint posts_title_key unique (title)
);

create index posts_created_at_idx on public.posts (created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

alter table public.posts enable row level security;

revoke all on table public.posts from anon, authenticated;

-- Default buckets (see MDPC_POSTS_BUCKET / MDPC_TEMP_BUCKET): public read,
-- 10 MB limit, image types from shared/constants/images.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images', 'post-images', true, 10485760, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('temp', 'temp', true, 10485760, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
on conflict (id) do nothing;
