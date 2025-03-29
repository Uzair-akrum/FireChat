import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { insertRedditPost, RedditPost } from '@/lib/db';
import { unknown } from 'zod';

export const maxDuration = 60; // Maximum allowed duration for Vercel hobby plan

export async function POST() {
  try {
    // Define the path to the JSON file
    const filePath = path.join(process.cwd(), 'reddit.json');

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf8');

    // Try to clean the JSON before parsing
    let jsonData;
    try {
      // First attempt direct parsing
      jsonData = JSON.parse(fileContent);
      console.log("🚀 ~ POST ~ jsonData:", jsonData)
    } catch (parseError: any) {
      console.error('If:', parseError.message);

      // Log information about the error location
      const errorPos = parseError.message.match(/position (\d+)/);
      if (errorPos && errorPos[1]) {
        const pos = parseInt(errorPos[1]);
        const errorContext = fileContent.substring(
          Math.max(0, pos - 50),
          Math.min(fileContent.length, pos + 50)
        );
        console.error(`Context around error (position ${pos}):`);
        console.error(errorContext);
      }

      // Return more descriptive error
      return NextResponse.json(
        {
          error: 'Invalid JSON format in reddit.json file',
          details: parseError.message,
          suggestion: 'Check for invalid characters, missing commas, or unescaped quotes in the file.'
        },
        { status: 400 }
      );
    }

    // Extract post data (from the first item in the array)
    const postData = jsonData[6][0]?.data?.children[0]?.data;

    // Extract comments data (from the second item in the array)
    const commentsData = jsonData[6][1]?.data?.children;

    if (!postData) {
      return NextResponse.json(
        { error: 'Invalid Reddit post data format in the file' },
        { status: 400 }
      );
    }

    // Function to recursively extract comment details, including nested replies
    function extractComments(comments: any[]): any[] {
      return comments.map(comment => {
        const commentData = comment.data;
        return {
          commentText: commentData.body,
          commentAuthor: commentData.author,
          commentCreatedAt: commentData.created_utc,
          commentLikes: commentData.score,
          // Recursively extract replies if they exist
          replies: commentData.replies && commentData.replies.data
            ? extractComments(commentData.replies.data.children)
            : []
        };
      });
    }

    // Combine post and comments into a single JSON object with specific fields
    const combinedData = {

      postTitle: postData.title,
      postUrl: postData.url,
      postDescription: postData.selftext,
      postAuthor: postData.author,
      postCreatedAt: postData.created_utc,
      postLikes: postData.score,
      postCommentCount: postData.num_comments,
      comments: commentsData ? extractComments(commentsData) : []
    };

    // Create the record for insertion
    const redditPost: RedditPost = {
      post_id: postData.id,
      created_at: new Date(postData.created_utc * 1000).toISOString(),
      author: postData.author,
      data: combinedData // Will be stored as JSONB
    };
    console.log("🚀 ~ POST ~ redditPost:", redditPost)

    // Insert the data into Supabase
    const result = await insertRedditPost(redditPost);
    console.log("🚀 ~ POST ~ result:", result)

    return NextResponse.json(
      {
        success: true,
        message: 'Reddit post data imported successfully from file',
        data: {
          id: result[0]?.id,
          post_id: postData.id,
          title: postData.title,
          author: postData.author,
          num_comments: commentsData?.length || 0
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error importing Reddit post data:', error);

    return NextResponse.json(
      { error: 'Failed to import Reddit post data', message: error.message },
      { status: 500 }
    );
  }
} 