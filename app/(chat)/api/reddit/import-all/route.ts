import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { insertRedditPost, RedditPost } from '@/lib/db';

export const maxDuration = 300; // Increase timeout for large file processing

export async function POST() {
  try {
    // Define the path to the JSON file
    const filePath = path.join(process.cwd(), 'reddit.json');

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Check if the data has the expected structure (array with 2+ elements)
    if (!Array.isArray(jsonData) || jsonData.length < 2) {
      return NextResponse.json(
        { error: 'Invalid Reddit data format in the file' },
        { status: 400 }
      );
    }

    // Process all Reddit posts found in the file
    // In Reddit JSON format, each post is typically followed by its comments
    // So we process them in pairs: [post, comments, post, comments, ...]
    const results = [];
    for (let i = 0; i < jsonData.length; i += 2) {
      // Get post data from the current item
      const postListing = jsonData[i];
      const postData = postListing?.data?.children?.[0]?.data;

      // Get comment data from the next item (if available)
      const commentsListing = i + 1 < jsonData.length ? jsonData[i + 1] : null;
      const commentsData = commentsListing?.data?.children || [];

      if (!postData) {
        console.warn(`Skipping invalid post at index ${i}`);
        continue;
      }

      // Combine post and comments into a single JSON object
      const combinedData = {
        post: postData,
        comments: commentsData
      };

      // Create the record for insertion
      const redditPost: RedditPost = {
        post_id: postData.id,
        created_at: new Date(postData.created_utc * 1000).toISOString(),
        author: postData.author,
        data: combinedData // Will be stored as JSONB
      };

      try {
        // Insert the data into Supabase
        const result = await insertRedditPost(redditPost);

        // Add to results
        results.push({
          id: result[0]?.id,
          post_id: postData.id,
          title: postData.title,
          author: postData.author,
          num_comments: commentsData.length
        });
      } catch (innerError: any) {
        // Log error but continue processing other posts
        console.error(`Error importing post ${postData.id}:`, innerError.message);
        results.push({
          post_id: postData.id,
          error: innerError.message
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${results.length} Reddit posts from file`,
        data: results
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error importing Reddit posts:', error);

    return NextResponse.json(
      { error: 'Failed to import Reddit posts', message: error.message },
      { status: 500 }
    );
  }
} 