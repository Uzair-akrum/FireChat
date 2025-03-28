import { NextResponse } from 'next/server';
import { insertRedditPost, RedditPost } from '@/lib/db';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON data
    const json = await request.json();

    // Extract post data
    const postData = json[0]?.data?.children[0]?.data;
    const commentsData = json[1]?.data?.children;

    if (!postData) {
      return NextResponse.json(
        { error: 'Invalid Reddit post data format' },
        { status: 400 }
      );
    }

    // Combine post and comments into a single JSON object
    const combinedData = {
      post: postData,
      comments: commentsData || []
    };

    // Create the record for insertion
    const redditPost: RedditPost = {
      post_id: postData.id,
      created_at: new Date(postData.created_utc * 1000).toISOString(),
      author: postData.author,
      data: combinedData // Will be stored as JSONB
    };

    // Insert the data into Supabase
    const result = await insertRedditPost(redditPost);

    return NextResponse.json(
      { success: true, message: 'Reddit post data stored successfully', data: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error storing Reddit post data:', error);

    return NextResponse.json(
      { error: 'Failed to store Reddit post data', message: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all posts
export async function GET() {
  try {
    const { getAllRedditPosts } = await import('@/lib/db');
    const posts = await getAllRedditPosts();

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Error retrieving Reddit posts:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve Reddit posts', message: error.message },
      { status: 500 }
    );
  }
} 