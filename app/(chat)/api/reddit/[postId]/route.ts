import { NextResponse } from 'next/server';
import { getRedditPostByPostId } from '@/lib/db';

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const postId = params.postId;

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const post = await getRedditPostByPostId(postId);

    if (!post) {
      return NextResponse.json(
        { error: 'Reddit post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error(`Error retrieving Reddit post ${params.postId}:`, error);

    return NextResponse.json(
      { error: 'Failed to retrieve Reddit post', message: error.message },
      { status: 500 }
    );
  }
} 