import { kv } from "@vercel/kv";
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Set maximum execution time to 60 seconds

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''!
);

export async function GET() {
  try {
    // Fetch all Reddit posts from Supabase
    const { data, error } = await supabase
      .from('reddit_posts')
      .select('*');

    if (error) {
      console.error('Error fetching Reddit posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch Reddit posts from Supabase' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: 'No Reddit posts found in Supabase' },
        { status: 404 }
      );
    }

    console.log(`Found ${data.length} Reddit posts to sync to KV`);

    // Prepare a pipeline for bulk insert
    const pipeline = kv.pipeline();

    // Set TTL for cache expiration (7 days in seconds)
    const ttlInSeconds = 7 * 24 * 60 * 60;

    // Add each post to the pipeline
    for (const post of data) {
      console.log("🚀 ~ GET ~ post:", post)
      // Generate a unique key for each post
      const postId = post.id || `reddit-post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const key = `reddit-post:${postId}`;

      // Add to pipeline with TTL
      pipeline.set(key, post, { ex: ttlInSeconds });
    }

    // Also store the full collection with a different key for bulk access
    pipeline.set('all-reddit-posts', data, { ex: ttlInSeconds });

    // Execute all commands in the pipeline as a single operation
    await pipeline.exec();

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${data.length} Reddit posts to Vercel KV`,
      postCount: data.length
    });
  } catch (error) {
    console.error('Error syncing Reddit posts to KV:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync Reddit posts to Vercel KV',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 