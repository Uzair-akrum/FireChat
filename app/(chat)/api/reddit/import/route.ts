import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { insertRedditPost } from '@/lib/db';

// --- Interfaces (Keep these as they define the structure) ---

interface RedditPost {
  post_id: string;
  created_at: string; // ISO string format
  author: string;
  data: { // This will be stored as JSONB
    postTitle: string;
    postUrl: string;
    postDescription: string | null;
    postAuthor: string;
    postCreatedAt: number; // Keep as epoch timestamp
    postLikes: number;
    postCommentCount: number;
    comments: ProcessedComment[]; // Use the new ProcessedComment interface
  };
}

interface RawCommentData {
  id?: string; // Add ID for comments
  body?: string;
  author?: string;
  created_utc?: number;
  score?: number;
  replies?: {
    kind: string;
    data: {
      after: string | null;
      dist: number | null;
      modhash: string;
      geo_filter: string;
      children: RawComment[];
      before: string | null;
    };
  } | "" | null; // Can be object, empty string, or null/undefined
  // ... other comment fields
}

interface RawComment {
  kind: string;
  data: RawCommentData;
}

interface ProcessedComment {
  commentId: string;
  commentText: string;
  commentAuthor: string;
  commentCreatedAt: number; // Store original epoch time
  commentLikes: number;
  replies: ProcessedComment[]; // Recursive structure
}


function extractComments(comments: RawComment[] | undefined | null): ProcessedComment[] {
  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return [];
  }

  return comments
    .filter(comment => comment && comment.kind === 't1' && comment.data) // Process only 't1' (comment) kinds
    .map(comment => {
      const commentData = comment.data;
      let nestedRepliesRaw: RawComment[] = [];

      // Robust check for replies structure
      if (commentData.replies && typeof commentData.replies === 'object' && commentData.replies.data?.children) {
        nestedRepliesRaw = commentData.replies.data.children;
      }

      // Provide defaults for potentially missing fields
      const processedComment: ProcessedComment = {
        commentId: commentData.id ?? `unknown_${Date.now()}_${Math.random()}`, // Generate fallback ID if missing
        commentText: commentData.body ?? '',
        commentAuthor: commentData.author ?? 'N/A',
        commentCreatedAt: commentData.created_utc ?? 0,
        commentLikes: commentData.score ?? 0,
        replies: extractComments(nestedRepliesRaw) // Recursive call
      };
      return processedComment;
    })
    // Filter out any comments that couldn't be processed (e.g., missing essential data like ID if needed downstream)
    .filter(Boolean) as ProcessedComment[];
}

``
// --- Helper Function to Process a Single Post Object ---

function processSinglePost(rawPostData: any): RedditPost | null {
  // Basic validation of the raw post data structure
  if (!rawPostData || typeof rawPostData !== 'object' || !rawPostData.id || typeof rawPostData.id !== 'string') {
    console.warn("Skipping invalid post data:", rawPostData);
    return null; // Skip this post if essential data like ID is missing or invalid
  }

  const postData = rawPostData; // Use the validated raw data

  // Extract raw comments array for this post
  const rawCommentsData: RawComment[] = postData?.comments;

  try {
    // Combine post and comments into the structured data format
    const combinedData = {
      postTitle: postData.title ?? 'N/A',
      postUrl: postData.url ?? '',
      postDescription: postData.selftext ?? null,
      postAuthor: postData.author ?? 'N/A',
      postCreatedAt: postData.created_utc ?? 0,
      postLikes: postData.score ?? 0,
      postCommentCount: postData.num_comments ?? 0,
      comments: extractComments(rawCommentsData) // Process comments
    };

    // Create the final record structure for this post
    const redditPost: RedditPost = {
      post_id: postData.id,
      created_at: postData.created_utc ? new Date(postData.created_utc * 1000).toISOString() : new Date().toISOString(),
      author: postData.author ?? 'N/A',
      data: combinedData
    };

    return redditPost;

  } catch (error: any) {
    console.error(`Error processing post ID ${postData.id}:`, error.message);
    return null; // Skip this post if an error occurs during processing
  }
}


// --- API Route Handler (POST) ---

export async function POST(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'reddit.json');
    const fileContent = await fs.readFile(filePath, 'utf8');

    // Parse the JSON file content
    let jsonData: any[]; // Expecting an array now
    try {
      jsonData = JSON.parse(fileContent);
    } catch (parseError: any) {
      console.error('Error parsing JSON:', parseError.message);
      // Log context for debugging
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
      return NextResponse.json(
        { error: 'Invalid JSON format in reddit.json file', details: parseError.message },
        { status: 400 }
      );
    }

    // **Crucially, check if the parsed data is an array**
    if (!Array.isArray(jsonData)) {
      return NextResponse.json(
        { error: 'Invalid format: reddit.json should contain an array of post objects.' },
        { status: 400 }
      );
    }

    // **Loop through the array and process each post**
    const postsToInsert: RedditPost[] = jsonData
      .map(rawPost => processSinglePost(rawPost)) // Process each post using the helper
      .filter((post): post is RedditPost => post !== null); // Filter out any null results (invalid/skipped posts)
    console.log("🚀 ~ POST ~ postsToInsert:", postsToInsert)

    console.log(`Successfully processed ${postsToInsert.length} out of ${jsonData.length} posts.`);

    // --- Placeholder for Bulk Database Insert ---
    if (postsToInsert.length > 0) {
      try {
        console.log(`Attempting to bulk insert ${postsToInsert.length} posts into Supabase...`);
        console.log(`Placeholder: Would now bulk insert ${postsToInsert.length} posts into the database.`);
        const insertedData = await insertRedditPost(postsToInsert);
        console.log(`Successfully inserted ${insertedData?.length || 0} posts.`); // Log count from returned data if available

        return NextResponse.json({
          success: true,
          insertedCount: insertedData?.length || postsToInsert.length, // Use returned count or assume all were inserted if no error
          processedCount: postsToInsert.length,
          totalInFile: jsonData.length,
          message: `Successfully processed and inserted posts.`
        }, { status: 200 });

      } catch (dbError: any) {
        console.error("Database bulk insert error:", dbError);
        return NextResponse.json(
          { error: 'Database insert failed', details: dbError.message },
          { status: 500 }
        );
      }
    } else {
      console.log("No valid posts found to insert.");
      // return NextResponse.json({ success: true, insertedCount: 0, message: "No valid posts to insert." }, { status: 200 });
    }
    // --- End Placeholder ---


    // Return success response (maybe limit the data returned)
    return NextResponse.json({
      success: true,
      processedCount: postsToInsert.length,
      totalInFile: jsonData.length,
      // Optionally return the processed data (be careful with large amounts)
      // data: postsToInsert
      message: `Processed ${postsToInsert.length} posts. Check server logs for bulk insert status.`
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error processing Reddit data:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}