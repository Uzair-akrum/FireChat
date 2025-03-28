import { NextResponse } from 'next/server';
import { getRedditPostFields, getRedditPostComments } from '@/lib/db';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const type = searchParams.get('type') || 'fields'; // Default to 'fields'
    const fieldsParam = searchParams.get('fields');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Handling different query types
    if (type === 'comments') {
      // Get only comments
      const data = await getRedditPostComments(postId);
      return NextResponse.json({ data });
    } else if (type === 'fields' && fieldsParam) {
      // Get specific fields from the post
      const fields = fieldsParam.split(',');
      const data = await getRedditPostFields(postId, fields);
      return NextResponse.json({ data });
    } else {
      return NextResponse.json(
        { error: 'Invalid query parameters. For field queries, include "fields" parameter.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error querying Reddit post data:', error);

    return NextResponse.json(
      { error: 'Failed to query Reddit post data', message: error.message },
      { status: 500 }
    );
  }
} 