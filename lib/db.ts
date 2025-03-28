import { createClient } from '@supabase/supabase-js';
import { KnowledgeChunk, SearchResult } from '@/types/knowledge';

// Define the Reddit post type with JSONB
export type RedditPost = {
  id?: number;
  post_id: string;
  created_at: string;
  author: string;
  data: any;
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log("🚀 ~ supabase:", supabase)

// Function to insert a reddit post
export async function insertRedditPost(post: RedditPost) {
  const { data, error } = await supabase
    .from('reddit_posts')
    .insert(post)
    .select();
  console.log("🚀 ~ insertRedditPost ~ error:", error)

  if (error) throw error;
  return data;
}

// Function to get a reddit post by post_id
export async function getRedditPostByPostId(postId: string) {
  const { data, error } = await supabase
    .from('reddit_posts')
    .select('*')
    .eq('post_id', postId)
    .single();

  if (error) throw error;
  error;
  return data;
}

// Function to get all reddit posts
export async function getAllRedditPosts() {
  const
    { data, error } = await supabase
      .from('reddit_posts')
      .select('*')
      .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Function to get specific fields from a post
export async function getRedditPostFields(postId: string, fields: string[]) {
  const selectFields = fields.map(field => `data->'post'->>'${field}'`).join(', ');

  const { data, error } = await supabase
    .from('reddit_posts')
    .select(`id, post_id, ${selectFields}`)
    .eq('post_id', postId)
    .single();

  if (error) throw error;
  return data;
}

// Function to get only comment bodies from a post
export async function getRedditPostComments(postId: string) {
  const { data, error } = await supabase
    .from('reddit_posts')
    .select('data->>\'comments\' as comments')
    .eq('post_id', postId)
    .single();

  if (error) throw error;
  return data;
}

// SQL schema for reference:
/*
CREATE TABLE reddit_posts (
    id SERIAL PRIMARY KEY,              -- Unique internal ID for the row
    post_id TEXT UNIQUE NOT NULL,       -- Reddit's post ID (e.g., "1jgsxur")
    created_at TIMESTAMPTZ,             -- Extracted for easy sorting/filtering
    author TEXT,                         -- Extracted for quick access
    data JSONB NOT NULL                 -- Full JSON blob including post and comments
);

-- Create indexes for performance
CREATE INDEX idx_reddit_posts_post_id ON reddit_posts(post_id);
CREATE INDEX idx_reddit_posts_created_at ON reddit_posts(created_at);
CREATE INDEX idx_reddit_posts_author ON reddit_posts(author);
CREATE INDEX idx_reddit_posts_data_gin ON reddit_posts USING GIN(data);
*/

export async function insertKnowledgeChunk(chunkData: KnowledgeChunk): Promise<KnowledgeChunk | null> {
  try {
    const { data, error } = await supabase
      .from('knowledge_chunks')
      .insert([chunkData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting knowledge chunk:', error);
    return null;
  }
}

export async function searchKnowledgeChunks(
  embedding: number[],
  threshold = 0.7,
  count = 5
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .rpc('match_chunks', {
        query_embedding: embedding,
        similarity_threshold: threshold,
        match_count: count
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching knowledge chunks:', error);
    return [];
  }
} 