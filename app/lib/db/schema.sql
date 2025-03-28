-- Enable required extensions
create extension if not exists vector with schema extensions;

-- Create table for storing embeddings of reddit posts
alter table reddit_posts 
add column if not exists embedding vector(1536);

-- Create index for vector similarity search
create index if not exists reddit_posts_embedding_idx 
on reddit_posts using hnsw (embedding vector_cosine_ops);

-- Function to match similar posts based on query embedding
create or replace function match_reddit_posts(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  data jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    data,
    1 - (embedding <=> query_embedding) as similarity
  from reddit_posts
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding asc
  limit match_count;
$$;

-- Function to get context from similar posts
create or replace function get_chat_context(
  query_text text,
  match_threshold float default 0.5,
  match_count int default 5
)
returns text
language plpgsql
as $$
declare
  context text;
begin
  -- Get similar posts and combine their content
  with matches as (
    select data->>'content' as content
    from match_reddit_posts(
      (select embedding from generate_embeddings(query_text)),
      match_threshold,
      match_count
    )
  )
  select string_agg(content, E'\n\n')
  into context
  from matches;
  
  return context;
end;
$$; 